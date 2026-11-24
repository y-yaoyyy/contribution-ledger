# Input format

Session2OSS reads **JSON Lines** (`.jsonl`): one JSON object per line, no trailing comma, UTF-8.

## Session object

```json
{
  "id": "ses_123",
  "title": "Short session title",
  "requests": 42,
  "lastSeen": "2026-11-24T10:00:00.000Z",
  "blockDetails": [
    {
      "topic": "What this block was about",
      "summary": "What happened, in enough detail to identify a symptom."
    }
  ]
}
```

Required:

- `id` — non-empty string, unique within the file.
- one of `blockDetails` or `blocks` — array.
- each block needs `topic` and `summary`.

Optional:

- `title` / `label` / `firstBlockHint`
- `requests`
- `parentSessionId`
- `lastSeen`
- `createdAt`

Unknown fields are ignored.

## Block object

```json
{
  "topic": "MCP process cleanup",
  "summary": "The npx wrapper left an orphan process. taskkill /T cleaned the tree. PR https://github.com/acme/repo/pull/3 is open."
}
```

Keep summaries factual. The rules look for concrete terms such as `text-only`, `multimodal`, `setup()`, `orphan`, `npx`, `reasoning`, `compress`, `虚箭线`, and GitHub links.

## What not to put in the file

- Full prompts or responses
- API keys or tokens
- Personal file paths, unless the path is itself the evidence
- Base64 images

The privacy scanner is a last line of defence, not permission to include secrets.

## Minimal generator

If you already have a session API, write one JSON object per session:

```js
import fs from "node:fs";

const sessions = await fetch("http://127.0.0.1:18788/__bili/sessions").then((r) => r.json());
const out = fs.createWriteStream("sessions.jsonl");

for (const item of sessions.sessions) {
  const detail = await fetch(`http://127.0.0.1:18788/__bili/sessions/${item.id}/detail`).then((r) => r.json());
  const blocks = (detail.blockDetails ?? []).map((block) => ({
    topic: block.topic,
    summary: block.summary,
  }));

  out.write(`${JSON.stringify({ id: item.id, title: item.title, blockDetails: blocks })}\n`);
}

out.end();
```

This example is illustrative. Session2OSS itself makes no network calls.