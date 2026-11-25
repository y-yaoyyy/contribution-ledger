function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function refs(item) {
  if (item.upstreamRefs.length === 0) return '<span class="muted">none recorded</span>';
  return item.upstreamRefs
    .map(
      (ref) =>
        `<a href="${escapeHtml(ref.url)}" rel="noreferrer">${escapeHtml(ref.repo)}#${escapeHtml(ref.number)}</a>`,
    )
    .join(" ");
}

function caseSection(item, index) {
  const evidence = item.evidence
    .slice(0, 12)
    .map(
      (entry) => `<tr>
        <td><code>${escapeHtml(entry.sessionId)}</code></td>
        <td>${escapeHtml(entry.blockIndex)}</td>
        <td>${escapeHtml(entry.topic)}</td>
        <td>${escapeHtml(entry.reportedStage)}</td>
      </tr>`,
    )
    .join("");

  const excerpts = item.evidence
    .filter((entry) => entry.excerpt)
    .slice(0, 5)
    .map(
      (entry) =>
        `<li><code>${escapeHtml(entry.sessionId)}</code> block ${escapeHtml(entry.blockIndex)}: ${escapeHtml(entry.excerpt)}</li>`,
    )
    .join("");

  return `<details class="case" ${index === 0 ? "open" : ""}>
    <summary>
      <span class="case-index">${String(index + 1).padStart(2, "0")}</span>
      <span class="case-title">${escapeHtml(item.title)}</span>
      <span class="case-meta">${escapeHtml(item.component)} · ${item.sessions.length} session${item.sessions.length === 1 ? "" : "s"}</span>
    </summary>
    <div class="case-body">
      <dl class="facts">
        <div><dt>Case id</dt><dd><code>${escapeHtml(item.id)}</code></dd></div>
        <div><dt>Stage</dt><dd>${escapeHtml(item.reportedStage)}</dd></div>
        <div><dt>Occurrences</dt><dd>${escapeHtml(item.occurrences)}</dd></div>
        <div><dt>Upstream</dt><dd>${refs(item)}</dd></div>
      </dl>
      <p class="action">${escapeHtml(item.nextManualAction)}</p>
      ${
        item.contradictions.length > 0
          ? `<p class="flags"><strong>Contradictions:</strong> ${item.contradictions.map(escapeHtml).join(", ")}</p>`
          : ""
      }
      <table class="evidence">
        <thead><tr><th>Session</th><th>Block</th><th>Topic</th><th>Stage</th></tr></thead>
        <tbody>${evidence}</tbody>
      </table>
      ${excerpts ? `<div class="excerpts"><strong>Optional excerpts</strong><ul>${excerpts}</ul></div>` : ""}
      <p><a class="brief-link" href="briefs/${escapeHtml(item.id)}.md">Open case brief →</a></p>
    </div>
  </details>`;
}

export function renderHtml(cases, meta) {
  const queue = cases
    .map(
      (item, index) => `<tr>
        <td>${String(index + 1).padStart(2, "0")}</td>
        <td><a href="#${escapeHtml(item.id)}">${escapeHtml(item.title)}</a></td>
        <td>${escapeHtml(item.component)}</td>
        <td>${item.sessions.length}</td>
        <td>${escapeHtml(item.reportedStage)}</td>
        <td>${refs(item)}</td>
      </tr>`,
    )
    .join("");

  const sections = cases
    .map((item, index) => `<section id="${escapeHtml(item.id)}">${caseSection(item, index)}</section>`)
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ContributionLedger evidence report</title>
<style>
  :root {
    --paper: #f1eee6;
    --paper-2: #e7e2d6;
    --ink: #191714;
    --muted: #6d665c;
    --red: #c93624;
    --line: rgba(25, 23, 20, .16);
    --green: #21473b;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    color: var(--ink);
    background: #d8d2c5;
    font: 15px/1.55 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  .page {
    max-width: 1120px;
    margin: 32px auto 64px;
    padding: 48px 56px 64px;
    background:
      linear-gradient(var(--line) 1px, transparent 1px),
      linear-gradient(90deg, var(--line) 1px, transparent 1px),
      var(--paper);
    background-size: 28px 28px;
    box-shadow: 0 24px 70px rgba(0,0,0,.22);
  }
  .eyebrow {
    display: flex;
    justify-content: space-between;
    color: var(--muted);
    font: 600 11px/1.4 ui-monospace, SFMono-Regular, Consolas, monospace;
    letter-spacing: .14em;
    text-transform: uppercase;
  }
  h1 {
    margin: 38px 0 8px;
    max-width: 760px;
    font: 700 clamp(42px, 6vw, 76px)/.95 Georgia, "Times New Roman", serif;
    letter-spacing: -.035em;
  }
  .lede { max-width: 680px; margin: 0 0 32px; color: var(--muted); font-size: 17px; }
  .red { color: var(--red); }
  .summary {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 1px;
    margin: 28px 0 40px;
    background: var(--line);
    border: 1px solid var(--line);
  }
  .summary div { padding: 16px 18px; background: var(--paper); }
  .summary strong { display: block; font: 700 30px/1 Georgia, serif; }
  .summary span { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
  h2 { margin: 40px 0 14px; font: 700 25px/1.1 Georgia, serif; }
  table { width: 100%; border-collapse: collapse; }
  th {
    padding: 8px 10px;
    border-bottom: 2px solid var(--ink);
    text-align: left;
    font: 600 10px/1.3 ui-monospace, monospace;
    letter-spacing: .1em;
    text-transform: uppercase;
  }
  td { padding: 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
  tr:last-child td { border-bottom: 0; }
  a { color: var(--green); text-decoration-thickness: 1px; text-underline-offset: 2px; }
  code { font: 12px ui-monospace, SFMono-Regular, Consolas, monospace; }
  .muted { color: var(--muted); }
  .case { margin: 18px 0; border-top: 2px solid var(--ink); }
  .case summary {
    display: grid;
    grid-template-columns: 50px 1fr auto;
    gap: 16px;
    align-items: baseline;
    padding: 16px 0;
    cursor: pointer;
    list-style: none;
  }
  .case summary::-webkit-details-marker { display: none; }
  .case-index { color: var(--red); font: 700 13px ui-monospace, monospace; }
  .case-title { font: 700 22px/1.15 Georgia, serif; }
  .case-meta { color: var(--muted); font: 12px ui-monospace, monospace; }
  .case-body { padding: 2px 0 28px 66px; }
  .facts { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 12px; margin: 0 0 14px; }
  .facts dt { color: var(--muted); font: 600 10px ui-monospace, monospace; text-transform: uppercase; }
  .facts dd { margin: 2px 0 0; }
  .action { padding: 12px 14px; background: var(--paper-2); border-left: 3px solid var(--red); }
  .evidence { margin-top: 14px; background: rgba(255,255,255,.25); }
  .evidence td { font-size: 13px; }
  .excerpts { margin-top: 14px; padding: 12px 16px; background: rgba(201,54,36,.06); border: 1px solid rgba(201,54,36,.2); }
  .excerpts ul { margin: 6px 0 0; padding-left: 20px; }
  .brief-link { font: 600 12px ui-monospace, monospace; text-transform: uppercase; letter-spacing: .08em; }
  .privacy { margin-top: 44px; padding-top: 18px; border-top: 1px solid var(--line); color: var(--muted); font-size: 12px; }
  @media (max-width: 760px) {
    .page { margin: 0; padding: 28px 20px 44px; }
    .summary { grid-template-columns: repeat(2, 1fr); }
    .case summary { grid-template-columns: 34px 1fr; }
    .case-meta { grid-column: 2; }
    .case-body { padding-left: 0; }
    .facts { grid-template-columns: repeat(2, 1fr); }
    .evidence { font-size: 12px; }
  }
</style>
</head>
<body>
<main class="page">
  <div class="eyebrow"><span>ContributionLedger / evidence file</span><span>Historical snapshot</span></div>
  <h1>Your experience,<br><span class="red">with receipts.</span></h1>
  <p class="lede">A deterministic ledger of possible upstream contributions extracted from compressed engineering-session summaries. Every lead points back to a session and block; every stage is a historical claim.</p>
  <div class="summary">
    <div><strong>${meta.summary.sessions}</strong><span>sessions</span></div>
    <div><strong>${meta.summary.blocks}</strong><span>blocks</span></div>
    <div><strong>${meta.summary.cases}</strong><span>cases</span></div>
    <div><strong>${meta.summary.withUpstreamRefs}</strong><span>upstream refs</span></div>
    <div><strong>${meta.summary.withLocalFix}</strong><span>local fixes</span></div>
  </div>
  <p class="muted">Generated ${escapeHtml(meta.generatedAt)} · input <code>${escapeHtml(meta.inputName)}</code> · SHA-256 <code>${escapeHtml(meta.inputSha256)}</code></p>
  <h2>Queue</h2>
  ${
    cases.length === 0
      ? "<p>No matching cases. Try a broader rule set or a larger input file.</p>"
      : `<table><thead><tr><th>#</th><th>Case</th><th>Component</th><th>Sessions</th><th>Stage</th><th>Upstream</th></tr></thead><tbody>${queue}</tbody></table>`
  }
  <h2>Cases</h2>
  ${sections || "<p>No cases.</p>"}
  <p class="privacy">Privacy: raw summary text is not included by default. Evidence contains session/block references and redacted topics only. A reported stage is not a live upstream status. Reproduce before posting.</p>
</main>
</body>
</html>
`;
}