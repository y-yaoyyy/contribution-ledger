#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const HELP = `Export a billion-context session inventory for ContributionLedger.

Usage:
  node scripts/export-billion-context.mjs [options]

Options:
  --base <url>    billion-context HTTP API (default: http://127.0.0.1:18788)
  --out <file>    output JSONL (default: sessions.jsonl)
  --limit <n>     export at most n sessions
  -h, --help      show this help

Only session summaries and block topics are exported. Direct messages, tool
payloads, and compressed originals are not requested.
`;

function value(argv, index, flag) {
  const next = argv[index + 1];
  if (next === undefined || next.startsWith("-")) throw new Error(`${flag} requires a value`);
  return next;
}

export function parseArgs(argv) {
  const options = { base: "http://127.0.0.1:18788", out: "sessions.jsonl", limit: null, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "-h" || arg === "--help") options.help = true;
    else if (arg === "--base") {
      options.base = value(argv, index, arg);
      index += 1;
    } else if (arg === "--out") {
      options.out = value(argv, index, arg);
      index += 1;
    } else if (arg === "--limit") {
      const raw = value(argv, index, arg);
      const limit = Number(raw);
      if (!Number.isInteger(limit) || limit < 1) throw new Error("--limit must be a positive integer");
      options.limit = limit;
      index += 1;
    } else throw new Error(`unknown argument: ${arg}`);
  }
  return options;
}

function endpoint(base, suffix) {
  return `${base.replace(/\/+$/, "")}${suffix}`;
}

async function getJson(fetchImpl, url) {
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.json();
}

export function toInventorySession(summary, detail = {}) {
  const blockDetails = detail.blockDetails ?? detail.blocks ?? summary.blockDetails ?? [];
  return {
    id: summary.id ?? summary.sessionId,
    title: summary.title ?? summary.label ?? summary.firstBlockHint ?? "(untitled session)",
    model: summary.model ?? "",
    requests: Number.isFinite(summary.requests) ? summary.requests : 0,
    lastSeen: summary.lastSeen ?? null,
    blockDetails: blockDetails.map((block, index) => ({
      index,
      topic: block.topic ?? block.title ?? "(untitled block)",
      summary: block.summary ?? block.text ?? "",
      createdAt: block.createdAt ?? null,
    })),
  };
}

export async function exportInventory({
  base = "http://127.0.0.1:18788",
  limit = null,
  fetchImpl = globalThis.fetch,
  onProgress = () => {},
} = {}) {
  if (typeof fetchImpl !== "function") throw new Error("fetch is not available in this Node runtime");
  const list = await getJson(fetchImpl, endpoint(base, "/__bili/sessions"));
  const sessions = Array.isArray(list) ? list : (list.sessions ?? []);
  const selected = limit === null ? sessions : sessions.slice(0, limit);
  const rows = [];

  for (let index = 0; index < selected.length; index += 1) {
    const summary = selected[index];
    const id = summary.id ?? summary.sessionId;
    if (!id) throw new Error(`session ${index} has no id`);
    const detail = await getJson(fetchImpl, endpoint(base, `/__bili/sessions/${encodeURIComponent(id)}/detail`));
    rows.push(toInventorySession(summary, detail));
    onProgress(index + 1, selected.length);
  }

  return rows;
}

export async function writeJsonl(file, rows) {
  const stream = fs.createWriteStream(file, { encoding: "utf8", mode: 0o600 });
  for (const row of rows) {
    if (!stream.write(`${JSON.stringify(row)}\n`)) {
      await new Promise((resolve) => stream.once("drain", resolve));
    }
  }
  await new Promise((resolve, reject) => {
    stream.end(resolve);
    stream.on("error", reject);
  });
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`export-billion-context: ${error.message}\n\n${HELP}`);
    process.exitCode = 1;
    return;
  }
  if (options.help) {
    process.stdout.write(HELP);
    return;
  }

  try {
    const rows = await exportInventory({
      base: options.base,
      limit: options.limit,
      onProgress(done, total) {
        if (done === total || done % 20 === 0) process.stderr.write(`exported ${done}/${total}\n`);
      },
    });
    const out = path.resolve(options.out);
    await writeJsonl(out, rows);
    process.stdout.write(`export-billion-context: ${rows.length} session(s) -> ${out}\n`);
  } catch (error) {
    process.stderr.write(`export-billion-context: ${error.message}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}