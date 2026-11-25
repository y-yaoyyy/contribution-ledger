# Dogfood log

This is a summary of the first real inventory run. The inventory itself is not
committed: it contains private session titles and summaries.

## Run

- Input: 120 local sessions, 1,190 compressed blocks
- Command shape:

```bash
node bin/contributionledger.mjs \
  --input /path/to/sessions.jsonl \
  --out /path/to/contributionledger-out
```

- Result: **10 cases**, **4 with upstream references**, **8 with a reported
  local fix**, **3 with contradictions**.
- The run was deterministic: the same input produced the same case order and
  evidence rows.

## What the cases looked like

| Case | Why it surfaced |
|---|---|
| CodeArts image capability mismatch | Documentation said text-only; the kernel sent a real multimodal image |
| OpenCode plugin setup duplication | `setup()` ran repeatedly and duplicated `session.idle` handlers |
| MCP orphan process lifecycle | An `npx` wrapper left processes after the session ended |
| Reasoning levels/variants | The router exposed variants the provider metadata did not |
| Context compression/cache failure | A long session hit the proxy/compression boundary |
| DSH low-integrity startup | Electron could not create its userData lock file |
| GridDraft AOA topology | The generated AOA had more junction events than the textbook |
| Word report structure | `Range.Text` edits damaged paragraph marks |
| Subtitle coverage | The SRT mapping skipped parts |
| Magpie provider metadata | A provider/model capability row was incomplete |

## What worked

- Grouping the same symptom across sessions turned isolated notes into a queue.
- Keeping `reportedStage` separate from the case title prevented “opened a PR”
  from being displayed as “merged”.
- The contradiction field preserved a wrong early hypothesis next to the later
  evidence. That was more useful than silently choosing the latest summary.
- Writing one brief per case made the next action concrete.

## What did not work

- Some sessions used the same words for different problems. Conservative rules
  correctly skipped them, but a human still had to decide.
- A few summaries were stale. A case existing in the ledger does not mean the
  upstream issue is still open.
- The first versions tried to infer too much from component names. The current
  rules require a symptom phrase as well.
- A real inventory must never be used as a public test fixture. The synthetic
  fixture exists for that reason.

## Follow-up rule of thumb

A case is ready to become an upstream report only after:

1. the original session or log is opened,
2. the current version is tested,
3. duplicates are searched,
4. the excerpt (if any) is checked for private data.

The dogfood run produced leads, not automatic reports. That is the intended
behavior.