import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectInventory } from "../src/inventory.mjs";
import { analyzeSessions, summarize } from "../src/cluster.mjs";
import { extractGithubRefs, extractReportedStage } from "../src/extract.mjs";
import { redactSensitive, scanSensitive } from "../src/privacy.mjs";
import { run } from "../src/cli.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(HERE, "fixtures", "synthetic.jsonl");

function silent() {
  return { write() {} };
}

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "session2oss-"));
}

test("inventory reads blockDetails and blocks, and rejects malformed lines", async () => {
  const sessions = await collectInventory(FIXTURE);
  assert.equal(sessions.length, 2);
  assert.equal(sessions[0].blocks.length, 2);
  assert.equal(sessions[1].blocks.length, 2);
  assert.equal(sessions[0].blocks[0].topic, "CodeArts image support");

  const dir = tempDir();
  try {
    const bad = path.join(dir, "bad.jsonl");
    fs.writeFileSync(bad, '{"id":"broken"}\n');
    await assert.rejects(() => collectInventory(bad), /missing blockDetails/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("clusters cases, stages, contradictions and upstream references", async () => {
  const sessions = await collectInventory(FIXTURE);
  const cases = analyzeSessions(sessions);
  const summary = summarize(sessions, cases);

  assert.equal(summary.sessions, 2);
  assert.equal(summary.blocks, 4);

  const codearts = cases.find((item) => item.id === "codearts--image-capability-mismatch");
  assert.ok(codearts);
  assert.deepEqual(codearts.sessions.sort(), ["s1", "s2"]);
  assert.equal(codearts.reportedStage, "upstream-submitted");
  assert.ok(codearts.contradictions.includes("text-only-vs-multimodal"));
  assert.ok(codearts.upstreamRefs.some((ref) => ref.url.endsWith("/issues/7")));

  const opencode = cases.find((item) => item.id === "opencode--plugin-setup-duplication");
  assert.ok(opencode);
  assert.deepEqual(opencode.sessions, ["s1"]);
  assert.ok(opencode.contradictions.includes("single-vs-repeated-setup"));

  const mcp = cases.find((item) => item.id === "mcp--orphan-process-lifecycle");
  assert.ok(mcp);
  assert.equal(mcp.upstreamRefs[0].number, 3);
});

test("privacy flags and redacts common secrets", () => {
  const text = "authorization: Bearer sk-abcdefghijklmnopqrstuvwx123456";
  const flags = scanSensitive(text);
  assert.ok(flags.includes("api-key"));
  assert.ok(flags.includes("auth-header"));
  const redacted = redactSensitive(text);
  assert.equal(redacted.includes("sk-abcdefghijklmnopqrstuvwx123456"), false);
  assert.equal(redacted.toLowerCase().includes("bearer"), false);
  assert.match(redacted, /\[redacted:/);
});

test("extractors keep issue and PR references apart", () => {
  const refs = extractGithubRefs(
    "See https://github.com/acme/repo/issues/4 and https://github.com/acme/repo/pull/9.",
  );
  assert.deepEqual(refs.map((ref) => ref.kind), ["issue", "pull"]);
  assert.equal(extractReportedStage("merged in https://github.com/acme/repo/pull/9"), "merged-reported");
  assert.equal(extractReportedStage("duplicate subscription setup"), "mentioned");
  assert.equal(
    extractReportedStage("closed as duplicate of https://github.com/acme/repo/issues/2"),
    "duplicate-reported",
  );
});

test("CLI writes report and cases without leaking raw summaries or secrets", async () => {
  const out = tempDir();
  const stdout = silent();
  const stderr = silent();
  try {
    const code = await run(["--input", FIXTURE, "--out", out], {
      stdout,
      stderr,
      now: new Date("2026-01-02T03:04:05.000Z"),
    });
    assert.equal(code, 0);

    const report = fs.readFileSync(path.join(out, "report.md"), "utf8");
    const cases = fs.readFileSync(path.join(out, "cases.json"), "utf8");
    assert.match(report, /Session2OSS evidence report/);
    assert.match(report, /CodeArts image capability mismatch/);
    assert.equal(report.includes("sk-abcdefghijklmnopqrstuvwx123456"), false);
    assert.equal(cases.includes("sk-abcdefghijklmnopqrstuvwx123456"), false);
    assert.equal(cases.includes("Local fix verified"), false);
    assert.match(cases, /"rawSummaryTextIncluded": false/);

    const payload = JSON.parse(cases);
    assert.equal(payload.summary.cases, 3);
    assert.ok(payload.cases.some((item) => item.sensitivityFlags.includes("api-key")));
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test("CLI filters by min-sessions and reports usage errors", async () => {
  const out = tempDir();
  try {
    const code = await run(["--input", FIXTURE, "--out", out, "--min-sessions", "2"], {
      stdout: silent(),
      stderr: silent(),
    });
    assert.equal(code, 0);
    const payload = JSON.parse(fs.readFileSync(path.join(out, "cases.json"), "utf8"));
    assert.deepEqual(payload.cases.map((item) => item.id), ["codearts--image-capability-mismatch"]);
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }

  assert.equal(await run([], { stdout: silent(), stderr: silent() }), 1);
  assert.equal(await run(["--help"], { stdout: silent(), stderr: silent() }), 0);
  assert.equal(await run(["--version"], { stdout: silent(), stderr: silent() }), 0);
});