# Export from billion-context

ContributionLedger needs a JSONL inventory of **summaries**, not full chats.
`scripts/export-billion-context.mjs` reads the local billion-context HTTP API and
writes one line per session.

## Requirements

- billion-context running locally (default `http://127.0.0.1:18788`)
- Node.js 22 or newer

The exporter requests:

- `GET /__bili/sessions`
- `GET /__bili/sessions/<id>/detail`

It uses `blockDetails` (or `blocks`) from each detail response. It does **not**
request direct messages, compressed originals, tool payloads, or authentication
secrets.

## Run it

```bash
node scripts/export-billion-context.mjs --out sessions.jsonl
```

Options:

```text
--base <url>    API base (default: http://127.0.0.1:18788)
--out <file>    output JSONL (default: sessions.jsonl)
--limit <n>     export at most n sessions
-h, --help      show help
```

Then:

```bash
node bin/contributionledger.mjs --input sessions.jsonl --out ./contributionledger-out
```

## Verify the export

```bash
# Count lines without opening the data in a spreadsheet
node -e "const fs=require('fs');const n=fs.readFileSync('sessions.jsonl','utf8').split(/\r?\n/).filter(Boolean).length;console.log(n+' sessions')"
```

The exported file is readable UTF-8 JSONL. Each line should have `id` and
`blockDetails` (or `blocks`). Your real inventory should stay out of git; add it
to `.gitignore`.

## Privacy

The exporter deliberately keeps the shape small:

```json
{
  "id": "ses_...",
  "title": "Short title",
  "model": "...",
  "requests": 12,
  "blockDetails": [
    { "topic": "...", "summary": "..." }
  ]
}
```

Session titles and summaries can still contain private information. Review the
file before sharing it. Use `--excerpts` only when you have checked the redacted
excerpts in the generated cases.

## Troubleshooting

- **Connection refused** — start billion-context, or pass the actual `--base`.
- **404 on a session detail** — the session may have been deleted; the exporter
  fails on the first error instead of silently skipping it.
- **Wrong lane / port** — the API and the proxy lane can use different ports.
  Check the port shown by your local billion-context process.
- **A very large inventory** — export a subset with `--limit` first, then run the
  full export once the pipeline works.

The exporter is a convenience adapter, not a stable public API. If the local API
changes, update the adapter and add a fixture test rather than editing the
ContributionLedger input format.