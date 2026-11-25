# From a case to an issue or PR

A ContributionLedger case is a **lead**, not a published claim. The brief in
`briefs/<case>.md` is designed to make the verification step explicit.

## 1. Read the case, not just the title

Open `report.html` or `cases.json` and check:

- how many distinct sessions reported the symptom
- the highest `reportedStage`
- whether a contradiction is recorded
- which upstream references were found

`merged-reported` means “a session said it was merged”. It does not mean the
upstream repository is currently merged.

## 2. Open the original evidence

Use the session id and block index in the evidence table. If you exported from
billion-context, the session detail endpoint or local store is the source of
truth. A brief can only point; it cannot re-read the original for you.

## 3. Reproduce

Reproduce on the current version, not on the version remembered by the session.
Record:

- exact version or commit
- OS and runtime
- the smallest input that triggers the symptom
- expected vs actual behavior

If the issue no longer reproduces, stop. A historical bug can still be a useful
note, but it is not a fresh upstream report.

## 4. Search for duplicates

Search the upstream issue tracker before writing. Check both the project name
and the exact error text. If a duplicate exists, add a reproduction comment only
if it contributes new information.

## 5. Use the brief

The generated brief contains an issue draft with placeholders:

```markdown
### <case title>

**What I expected**
**What happened**
**Evidence**
**Environment**
**Checks**
```

Replace every placeholder. Do not paste a raw summary. Attach only redacted logs
or screenshots. If you used `--excerpts`, inspect each excerpt before publishing.

## 6. Decide the contribution form

- **Bug with a minimal fix and tests** → PR, after the reproduction is clear.
- **Behavior question or design disagreement** → issue or discussion first.
- **Docs mismatch** → docs PR with the exact command and error.
- **Environment-specific failure** → issue with diagnostics, not a code PR.

The repository's contribution rules win over this checklist.

## 7. Keep the ledger honest

If you open an issue or PR, update your own notes with the URL and date. A later
run can then see the historical stage without pretending it is the current
status. ContributionLedger deliberately does not update upstream state for you.

## What not to do

- Do not file every case. Pick the ones with reproducible evidence.
- Do not publish session text, local paths, tokens, or customer data.
- Do not describe a local patch as an upstream fix.
- Do not treat a stale `OPEN` summary as proof that an issue is still open.
- Do not open a PR before checking whether the project accepts external PRs.