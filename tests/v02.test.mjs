import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectInventory } from "../src/inventory.mjs";
import { analyzeSessions, summarize } from "../src/cluster.mjs";
import { renderBrief } from "../src/brief.mjs";
import { renderHtml } from "../src/render-html.mjs";
import { run } from "../src/cli.mjs";
import { exportInventory, toInventorySession } from "../scripts/export-billion-context.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(HERE, "fixtures", "synthetic.jsonl");
const ROOT = path.resolve(HERE, "..");

function silent() {
  return { write() {} };
}

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "contributionledger-v02-"));
}

function metaFor(sessions) {
  return {
    schemaVersion: 1,
    toolVersion: "0.2.0",
    generatedAt: "2026-01-02T03:04:05.000Z",
    inputName: "fixture.jsonl",
    inputSha256: "a".repeat(64),
    summary: summarize(sessions, []),
    excerptsIncluded: false,
  };
}

test("custom rules are declarative and replace built-ins by id", async () => {
  const dir = tempDir();
  try {
    const rulesFile = path.join(dir, "rules.json");
    fs.writeFileSync(
      rulesFile,
      JSON.stringify({
        rules: [
          {
            id: "opencode-plugin-lifecycle",
            component: "opencode",
            symptom: "custom-setup",
            title: "Custom OpenCode setup rule",
            all: ["opencode", "setup"],
            none: ["not-this"],
          },
        ],
      }),
    );
    const out = path.join(dir, "out");
    const code = await run(["--input", FIXTURE, "--out", out, "--rules", rulesFile, "--rules-only"], {
      stdout: silent(),
      stderr: silent(),
    });
    assert.equal(code, 0);
    const payload = JSON.parse(fs.readFileSync(path.join(out, "cases.json"), "utf8"));
    assert.equal(payload.cases.length, 1);
    assert.equal(payload.cases[0].id, "opencode--custom-setup");
    assert.equal(payload.cases[0].title, "Custom OpenCode setup rule");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("invalid custom rules fail closed", async () => {
  const dir = tempDir();
  try {
    const rulesFile = path.join(dir, "rules.json");
    fs.writeFileSync(rulesFile, JSON.stringify([{ id: "empty" }]));
    const code = await run(["--input", FIXTURE, "--out", path.join(dir, "out"), "--rules", rulesFile], {
      stdout: silent(),
      stderr: silent(),
    });
    assert.equal(code, 1);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("demo mode writes report.html and one brief per case", async () => {
  const out = tempDir();
  try {
    const code = await run(["--demo", "--out", out], { stdout: silent(), stderr: silent() });
    assert.equal(code, 0);
    assert.ok(fs.existsSync(path.join(out, "report.md")));
    assert.ok(fs.existsSync(path.join(out, "report.html")));
    assert.ok(fs.existsSync(path.join(out, "cases.json")));
    const payload = JSON.parse(fs.readFileSync(path.join(out, "cases.json"), "utf8"));
    assert.ok(payload.cases.length >= 8);
    assert.equal(payload.excerptsIncluded, false);
    const briefs = fs.readdirSync(path.join(out, "briefs"));
    assert.equal(briefs.length, payload.cases.length);
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test("excerpts are opt-in, redacted, and do not leak the fixture secret", async () => {
  const out = tempDir();
  try {
    const code = await run(["--input", FIXTURE, "--out", out, "--excerpts"], {
      stdout: silent(),
      stderr: silent(),
    });
    assert.equal(code, 0);
    const cases = fs.readFileSync(path.join(out, "cases.json"), "utf8");
    assert.equal(cases.includes("sk-abcdefghijklmnopqrstuvwx123456"), false);
    const payload = JSON.parse(cases);
    assert.equal(payload.excerptsIncluded, true);
    assert.ok(
      payload.cases.some((item) => item.evidence.some((evidence) => typeof evidence.excerpt === "string")),
    );
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test("brief and html render the evidence without raw summaries", async () => {
  const sessions = await collectInventory(FIXTURE);
  const cases = analyzeSessions(sessions);
  const meta = { ...metaFor(sessions), summary: summarize(sessions, cases) };
  const brief = renderBrief(cases[0], meta);
  const html = renderHtml(cases, meta);

  assert.match(brief, /## Issue draft/);
  assert.match(brief, /reproduce/i);
  assert.equal(brief.includes("Local fix verified"), false);
  assert.match(html, /<!doctype html>/);
  assert.match(html, /briefs\//);
  assert.match(html, /CodeArts image capability mismatch/);
  assert.equal(html.includes("Local fix verified"), false);
});

test("billion-context adapter uses summaries and ignores direct messages", async () => {
  const responses = new Map([
    [
      "http://example.test/__bili/sessions",
      { sessions: [{ id: "abc", title: "Example", requests: 3, lastSeen: "2026-01-01" }] },
    ],
    [
      "http://example.test/__bili/sessions/abc/detail",
      { blocked: [{ topic: "ignored" }], blockDetails: [{ topic: "T", summary: "S" }] },
    ],
  ]);
  const fetchImpl = async (url) => ({ ok: true, json: async () => responses.get(url) });
  const rows = await exportInventory({ base: "http://example.test", fetchImpl });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, "abc");
  assert.equal(rows[0].blockDetails[0].topic, "T");
  assert.equal(rows[0].blockDetails[0].summary, "S");

  const normalized = toInventorySession({ id: "x" }, { blocks: [{ title: "A", text: "B" }] });
  assert.equal(normalized.blockDetails[0].topic, "A");
  assert.equal(normalized.blockDetails[0].summary, "B");
});

test("all schema files are valid JSON with draft metadata", () => {
  const dir = path.join(ROOT, "schema");
  const files = fs.readdirSync(dir).filter((file) => file.endsWith(".json"));
  assert.equal(files.length, 3);
  for (const file of files) {
    const schema = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
    assert.equal(typeof schema.title, "string");
  }
});