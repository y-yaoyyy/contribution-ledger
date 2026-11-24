# Design

## Goal

Make compressed session summaries useful for open-source work without turning private history into public content.

The output is a **ledger**, not a report card. It records what the sessions claimed, where the claim came from, and what a human should verify next.

## Pipeline

```text
JSONL -> inventory -> rules -> cases -> report.md / cases.json
```

### Inventory

`src/inventory.mjs` streams the input, validates session ids and block arrays, and fails loudly on malformed lines. It accepts `blockDetails` and `blocks`.

### Rules

`src/rules.mjs` contains deterministic rules. A rule is a named `test(text)` plus a component and symptom. Rules should be narrow: a false upstream report is worse than a missed lead.

### Extraction

`src/extract.mjs` finds:

- GitHub issue and pull-request references
- reported stage, but only when the wording is anchored to a reference
- contradictions, such as “text-only” versus “native multimodal”
- a next manual action

`merged` and `duplicate` words alone are not enough. They must appear next to a concrete GitHub link; otherwise they are usually describing local work.

### Clustering

`src/cluster.mjs` groups by `component + symptom`, counts distinct sessions, keeps evidence references, and scopes contradictions to the relevant case. This prevents an unrelated sentence in a long block from polluting every case.

### Rendering

`src/render.mjs` emits a queue and per-case evidence. It does not render the original summary.

## Stage model

```text
mentioned < diagnosed < local-fix-reported < upstream-submitted
          < duplicate-reported < merged-reported
```

The highest reported stage wins for the queue. This is a historical claim, not a live GitHub query. The report says so at the top and in every case action.

## Privacy model

- Raw summaries are processed in memory and discarded.
- Topics and session titles are redacted before they are written to `cases.json`.
- The report shows only privacy flag names.
- Tests use a synthetic fixture. Real inventories should stay outside the repository.

## Deliberate non-goals

- Calling an LLM to “understand” sessions
- Crawling GitHub to refresh status
- Filing issues or opening PRs
- Reading full transcripts or screenshots
- Replacing maintainer judgment

## Adding a rule

1. Add a rule to `DEFAULT_RULES`.
2. Add a synthetic block to `tests/fixtures/synthetic.jsonl`.
3. Assert the case id, component, and expected stage in `tests/session2oss.test.mjs`.
4. Run `npm test` and dogfood on a real inventory.

Keep rule text in English or Chinese; the matcher lowercases ASCII and leaves CJK intact.