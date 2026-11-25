# Release checklist

Use this when publishing a new ContributionLedger version.

## Product surface

- [ ] `node bin/contributionledger.mjs --demo` produces `report.md`,
  `report.html`, `cases.json`, and `briefs/`.
- [ ] The demo output is readable without a server.
- [ ] `README.md` first screen shows the user benefit and the report screenshot.
- [ ] `docs/assets/report-preview.png` matches the current HTML design.
- [ ] `docs/assets/social-preview.png` is 1280x640 and does not crop the wordmark.
- [ ] The social preview is uploaded in GitHub **Settings → Social preview**;
  the file in the repo is the source, not an automatic setting.

## Correctness

- [ ] `npm test` passes.
- [ ] `npm run check` passes.
- [ ] `npm run demo` passes.
- [ ] A custom rule file with `--rules-only` works.
- [ ] An invalid rule file fails closed.
- [ ] `--excerpts` is opt-in and redacts known secrets.
- [ ] No real session inventory, token, or private path is tracked by git.

## Packaging

- [ ] `npm pack --dry-run` includes `bin`, `src`, `docs`, `demo`, `schema`,
  README translations, and LICENSE.
- [ ] `package.json` version matches the tag.
- [ ] `files` includes the demo and schemas; `--demo` works from an installed
  package.
- [ ] The release tag is `vX.Y.Z`.

## Repository metadata

- [ ] Description starts with the user benefit, not the implementation.
- [ ] Topics include `open-source`, `debugging`, `evidence`, `offline`,
  `session-management`.
- [ ] README link and social preview are updated.
- [ ] Release notes mention the main user-visible change and any rule changes.

## After publishing

- [ ] Run the demo from a clean clone.
- [ ] Open the generated `report.html` on a narrow viewport.
- [ ] Add a short note to `docs/dogfood.md` if a real run changed the counts.
- [ ] Keep historical release notes; do not rewrite old claims as current ones.