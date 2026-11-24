# ContributionLedger

Turn compressed engineering-session summaries into a reviewable ledger of possible open-source contributions.

ContributionLedger is deliberately small and deterministic:

- **Offline.** No network calls, no LLM calls, no database.
- **Evidence first.** Every case points back to a session id, block index, and topic.
- **Historical by design.** A recorded stage is what the sessions said at the time, not the current state of an upstream project.
- **Privacy aware.** Raw summary text is not copied into the report. Common secrets are flagged and redacted.

It is not an automatic issue generator. It produces leads for a human to reproduce, verify, and discuss with maintainers.

## Why

Long-running agent sessions contain useful debugging evidence, but the evidence is scattered across compressed blocks. Copying summaries into a public issue is noisy and can leak private data. ContributionLedger extracts only the reproducible shape:

- component and symptom
- distinct sessions where the symptom appeared
- reported stage (mentioned, diagnosed, locally fixed, submitted, merged)
- GitHub issue/PR references found in the text
- contradictions between earlier and later conclusions
- a next manual action

## Requirements

- Node.js 22 or newer
- A JSONL inventory exported from your session store

## Usage

```bash
node bin/contributionledger.mjs --input sessions.jsonl --out ./contributionledger-out
```

Options:

```text
-i, --input <file>       JSONL inventory to read (required)
-o, --out <dir>          output directory (default: ./contributionledger-out)
    --min-sessions <n>   only keep cases seen in at least n sessions (default: 1)
-h, --help               show help
-v, --version            show version
```

Output:

```text
contributionledger-out/
  report.md     human-readable queue and evidence
  cases.json    structured cases for further tooling
```

The input file is opened read-only. The tool does not modify it.

## Input format

One JSON object per line:

```json
{
  "id": "session-123",
  "title": "CodeArts image capability",
  "blockDetails": [
    {
      "topic": "Image support",
      "summary": "The model was documented as text-only, but the kernel sent a real image."
    }
  ]
}
```

`blocks` is accepted as an alias for `blockDetails`. Each block needs a `topic` and `summary`. See [docs/input-format.md](docs/input-format.md) for details.

## How cases are built

1. Read each session and block.
2. Run conservative symptom rules over `topic + summary`.
3. Extract GitHub references, reported stage, contradictions, and privacy flags.
4. Group by component and symptom.
5. Rank by number of distinct sessions, local fixes, upstream references, contradictions, and occurrences.
6. Render a queue plus evidence.

The ten built-in rules cover the areas this project was extracted from: CodeArts image capability, OpenCode plugin lifecycle, MCP process lifecycle, reasoning metadata, context compression, DSH startup, GridDraft AOA topology, Word report structure, subtitle coverage, and Magpie provider metadata.

## Reported stages

| Stage | Meaning |
|---|---|
| `mentioned` | A symptom was mentioned; no diagnosis yet |
| `diagnosed` | A root cause was reported |
| `local-fix-reported` | A local fix was reported |
| `upstream-submitted` | An issue or PR was reported |
| `duplicate-reported` | Closed as a duplicate |
| `merged-reported` | Reported as merged |

`merged-reported` does not mean the upstream project is currently merged. Re-check the link before acting.

## Privacy

- The report does not include raw summary text.
- Common API keys, GitHub tokens, Slack tokens, auth headers, private keys, base64 image payloads, and password assignments are detected.
- Detected values are redacted from topics retained in `cases.json`; the report only shows flag names.
- Real session data should not be committed to a public repository. Use the synthetic fixture for tests and demos.

No scanner is perfect. Review `cases.json` before sharing it.

## Development

```bash
npm test
npm run check
node bin/contributionledger.mjs --input tests/fixtures/synthetic.jsonl --out /tmp/contributionledger-demo
```

The test suite uses only `node:test` and the Node standard library.

## Limitations

- Rules are intentionally narrow. A missed case is preferable to a confident false report.
- The tool does not read full chat transcripts or tool logs. It works from the compressed inventory you provide.
- It cannot decide whether a reported upstream issue is still open.
- It does not file issues or open pull requests.

## License

MIT. See [LICENSE](LICENSE).