# Custom rules

ContributionLedger ships with ten conservative rules. A custom rule file extends
or replaces them without running JavaScript from the input file.

## File shape

A rule file is either a JSON array or an object with a `rules` array:

```json
{
  "rules": [
    {
      "id": "my-stack-cache-key",
      "component": "my-stack",
      "symptom": "cache-key-collision",
      "title": "Cache key collision after upgrade",
      "all": ["my-stack", "cache"],
      "any": ["collision", "stale key"],
      "none": ["fixed upstream"]
    }
  ]
}
```

Required fields:

- `id` — unique within the file.
- `component` — the upstream component or project.
- `symptom` — the stable case key. Changing it creates a new case.
- `title` — the human-readable case title.

Matching fields:

- `all` — every string must appear.
- `any` — at least one string must appear.
- `none` — if any string appears, the rule does not match.

At least one entry in `all` or `any` is required, so a typo cannot create a rule
that matches every block. Strings are matched case-insensitively against
`topic + "\n" + summary`.

## Extend vs replace

```bash
# Add your rules. A custom id replaces a built-in rule with the same id.
node bin/contributionledger.mjs --input sessions.jsonl --rules rules.json --out ./ledger

# Use only this file. Useful when auditing a different stack.
node bin/contributionledger.mjs --input sessions.jsonl --rules rules.json --rules-only --out ./ledger
```

Without `--rules`, the built-in rules are used. `--rules-only` without `--rules`
is an error.

## Validation

The loader rejects:

- invalid JSON
- a non-array file without a `rules` array
- a rule without `id`, `component`, `symptom`, or `title`
- empty/non-string match entries
- a rule with neither `all` nor `any`
- duplicate ids in the same file

See [`schema/rules.schema.json`](../schema/rules.schema.json) for the machine-readable
contract.

## Writing useful rules

- Match the **symptom**, not a project name alone. “uses Redis” is not a case;
  “Redis key collision after upgrade” is.
- Prefer two or three specific terms over one generic word.
- Put “not this” exclusions in `none` when a phrase is ambiguous.
- A rule can only surface a lead. It cannot prove the upstream project is broken.
- Keep one rule narrow enough that a reviewer can explain why it matched.

Rules are intentionally conservative. If a rule produces a case, the next step is
still human reproduction, not an automatic issue.