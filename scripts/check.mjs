#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_DIRS = ["bin", "src", "scripts"];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && entry.name.endsWith(".mjs")) out.push(full);
  }
  return out;
}

let checked = 0;
for (const dir of SOURCE_DIRS) {
  for (const file of walk(path.join(ROOT, dir))) {
    execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
    checked += 1;
  }
}

for (const file of ["demo/sessions.jsonl"]) {
  const full = path.join(ROOT, file);
  const lines = fs.readFileSync(full, "utf8").split(/\r?\n/).filter(Boolean);
  for (const line of lines) JSON.parse(line);
}

for (const file of fs.readdirSync(path.join(ROOT, "schema"))) {
  if (file.endsWith(".json")) JSON.parse(fs.readFileSync(path.join(ROOT, "schema", file), "utf8"));
}

process.stdout.write(`checked ${checked} module(s), demo JSONL, and JSON schemas\n`);