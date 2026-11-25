function escapeMd(value) {
  return String(value ?? "").replace(/\r?\n/g, " ").replace(/\|/g, "\\|");
}

function refs(item) {
  if (item.upstreamRefs.length === 0) return "- none recorded";
  return item.upstreamRefs
    .map((ref) => `- [${ref.repo}#${ref.number}](${ref.url})`)
    .join("\n");
}

export function briefFileName(caseId) {
  return `${String(caseId).replace(/[^a-zA-Z0-9._-]+/g, "-")}.md`;
}

export function renderBrief(item, meta) {
  const lines = [];
  lines.push(`# ${item.title}`);
  lines.push("");
  lines.push(
    "> This is a historical lead, not a live upstream report. Reproduce it on the current version before posting.",
  );
  lines.push("");
  lines.push(`- Case id: \`${item.id}\``);
  lines.push(`- Component: ${item.component}`);
  lines.push(`- Symptom: ${item.symptom}`);
  lines.push(`- Sessions with this symptom: ${item.sessions.length}`);
  lines.push(`- Highest reported stage: ${item.reportedStage}`);
  lines.push(`- Generated from: \`${meta.inputName}\``);
  lines.push(`- Input SHA-256: \`${meta.inputSha256}\``);
  lines.push("");
  lines.push("## Evidence");
  lines.push("");
  lines.push("| Session | Block | Topic | Reported stage |");
  lines.push("|---|---:|---|---|");
  for (const evidence of item.evidence.slice(0, 20)) {
    lines.push(
      `| \`${escapeMd(evidence.sessionId)}\` | ${evidence.blockIndex} | ${escapeMd(evidence.topic)} | ${escapeMd(evidence.reportedStage)} |`,
    );
  }
  if (item.evidence.length > 20) {
    lines.push("");
    lines.push(`_${item.evidence.length - 20} more evidence rows are in \`cases.json\`._`);
  }
  lines.push("");
  if (item.evidence.some((evidence) => evidence.excerpt)) {
    lines.push("### Optional excerpts");
    lines.push("");
    lines.push("These excerpts were included explicitly with `--excerpts`.");
    lines.push("");
    for (const evidence of item.evidence.slice(0, 8)) {
      if (!evidence.excerpt) continue;
      lines.push(
        `- \`${escapeMd(evidence.sessionId)}\` block ${evidence.blockIndex}: ${escapeMd(evidence.excerpt)}`,
      );
    }
    lines.push("");
  }
  lines.push("## Upstream references");
  lines.push("");
  lines.push(refs(item));
  lines.push("");
  lines.push("## What to verify");
  lines.push("");
  lines.push(`- ${item.nextManualAction}`);
  lines.push("- Reproduce on the latest release or commit.");
  lines.push("- Search the upstream issue tracker for a duplicate before posting.");
  lines.push("- Replace the placeholders below with your actual environment.");
  lines.push("");
  if (item.contradictions.length > 0) {
    lines.push("## Contradictions to resolve");
    lines.push("");
    for (const contradiction of item.contradictions) lines.push(`- ${contradiction}`);
    lines.push("");
  }
  lines.push("## Issue draft");
  lines.push("");
  lines.push("```markdown");
  lines.push(`### ${item.title}`);
  lines.push("");
  lines.push("**What I expected**");
  lines.push("");
  lines.push("<!-- one or two sentences -->");
  lines.push("");
  lines.push("**What happened**");
  lines.push("");
  lines.push("<!-- one or two sentences, include the error text if any -->");
  lines.push("");
  lines.push("**Evidence**");
  lines.push("");
  lines.push("<!-- attach only redacted logs or screenshots -->");
  lines.push("");
  lines.push("**Environment**");
  lines.push("");
  lines.push("- Version:");
  lines.push("- OS:");
  lines.push("- Runtime:");
  lines.push("");
  lines.push("**Checks**");
  lines.push("");
  lines.push("- [ ] Reproduced on the latest version");
  lines.push("- [ ] Searched for duplicates");
  lines.push("- [ ] Removed secrets and private paths");
  lines.push("```");
  lines.push("");
  lines.push("## Before posting");
  lines.push("");
  lines.push("- [ ] I opened the referenced sessions or logs and verified the claim.");
  lines.push("- [ ] The upstream reference is still open and is not a duplicate.");
  lines.push("- [ ] The excerpt, if any, is safe to publish.");
  lines.push("");
  return lines.join("\n");
}