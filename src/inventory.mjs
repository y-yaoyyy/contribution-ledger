import fs from "node:fs";
import readline from "node:readline";

function asText(value) {
  return typeof value === "string" ? value : "";
}

function normalizeBlock(raw, index) {
  return {
    index,
    topic: asText(raw?.topic) || asText(raw?.title) || "(untitled block)",
    summary: asText(raw?.summary) || asText(raw?.text) || "",
    createdAt: raw?.createdAt ?? null,
  };
}

function normalizeSession(raw, sourceLine) {
  const id = asText(raw?.id) || asText(raw?.sessionId);
  if (!id) {
    throw new Error(`line ${sourceLine}: missing session id`);
  }

  const details = Array.isArray(raw?.blockDetails)
    ? raw.blockDetails
    : Array.isArray(raw?.blocks)
      ? raw.blocks
      : null;

  if (details === null) {
    throw new Error(`line ${sourceLine}: missing blockDetails array`);
  }

  return {
    id,
    title: asText(raw.title) || asText(raw.label) || asText(raw.firstBlockHint) || "(untitled session)",
    firstBlockHint: asText(raw.firstBlockHint),
    parentSessionId: raw.parentSessionId ?? null,
    model: asText(raw.model),
    requests: Number.isFinite(raw.requests) ? raw.requests : 0,
    lastSeen: raw.lastSeen ?? null,
    createdAt: raw.createdAt ?? null,
    sourceLine,
    blocks: details.map(normalizeBlock),
  };
}

export async function* readInventory(file) {
  const stream = fs.createReadStream(file, { encoding: "utf8" });
  const lines = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let lineNumber = 0;

  try {
    for await (const rawLine of lines) {
      lineNumber += 1;
      const line = rawLine.trim();
      if (line === "") continue;

      let parsed;
      try {
        parsed = JSON.parse(line);
      } catch (error) {
        throw new Error(`line ${lineNumber}: invalid JSON (${error.message})`);
      }

      yield normalizeSession(parsed, lineNumber);
    }
  } finally {
    lines.close();
    stream.destroy();
  }
}

export async function collectInventory(file) {
  const sessions = [];
  for await (const session of readInventory(file)) sessions.push(session);
  return sessions;
}

export function countBlocks(sessions) {
  return sessions.reduce((total, session) => total + session.blocks.length, 0);
}