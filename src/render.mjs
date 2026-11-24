function escapeCell(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function refsLine(refs) {
  if (refs.length === 0) return "none";
  return refs.map((ref) => `[${ref.repo}#${ref.number}](${ref.url})`).join(", ");
}

function stageLabel(stage) {
  return stage.replaceAll("-", " ");
}

export function renderReport(cases, meta) {
  const lines = [];
  lines.push("# ContributionLedger evidence report");
  lines.push("");
  lines.push("> This is a historical evidence ledger built from compressed session summaries.");
  lines.push("> A reported stage is not a current upstream status. Reproduce before acting.");
  lines.push("");
  lines.push(`- Generated: ${meta.generatedAt}`);
  lines.push(`- Input: \`${meta.inputName}\``);
  lines.push(`- Input SHA-256: \`${meta.inputSha256}\``);
  lines.push(`- Sessions: ${meta.summary.sessions}`);
  lines.push(`- Blocks: ${meta.summary.blocks}`);
  lines.push(`- Cases: ${meta.summary.cases}`);
  lines.push(`- Cases with upstream references: ${meta.summary.withUpstreamRefs}`);
  lines.push(`- Cases with reported local fixes: ${meta.summary.withLocalFix}`);
  lines.push(`- Cases with contradictions: ${meta.summary.withContradictions}`);
  lines.push("");

  if (cases.length === 0) {
    lines.push("No matching cases. Try a broader rule set or a larger input file.");
    lines.push("");
    return lines.join("\n");
  }

  lines.push("## Queue");
  lines.push("");
  lines.push("| Case | Component | Sessions | Highest reported stage | Upstream refs |");
  lines.push("|---|---|---:|---|---|");
  for (const item of cases) {
    lines.push(
      `| ${escapeCell(item.title)} | ${escapeCell(item.component)} | ${item.sessions.length} | ${escapeCell(stageLabel(item.reportedStage))} | ${escapeCell(refsLine(item.upstreamRefs))} |`,
    );
  }
  lines.push("");

  for (const [index, item] of cases.entries()) {
    lines.push(`## ${index + 1}. ${item.title}`);
    lines.push("");
    lines.push(`- Case id: \`${item.id}\``);
    lines.push(`- Component: ${item.component}`);
    lines.push(`- Sessions: ${item.sessions.length}`);
    lines.push(`- Occurrences: ${item.occurrences}`);
    lines.push(`- Highest reported stage: ${stageLabel(item.reportedStage)}`);
    lines.push(`- Upstream references: ${refsLine(item.upstreamRefs)}`);
    lines.push(
      `- Contradictions: ${item.contradictions.length > 0 ? item.contradictions.join(", ") : "none recorded"}`,
    );
    lines.push(
      `- Sensitivity flags: ${item.sensitivityFlags.length > 0 ? item.sensitivityFlags.join(", ") : "none detected"}`,
    );
    lines.push(`- Next manual action: ${item.nextManualAction}`);
    lines.push("");
    lines.push("Evidence:");
    for (const evidence of item.evidence.slice(0, 12)) {
      lines.push(
        `- \`${evidence.sessionId}\` block ${evidence.blockIndex} — ${escapeCell(evidence.topic)} (reported: ${stageLabel(evidence.reportedStage)})`,
      );
    }
    if (item.evidence.length > 12) {
      lines.push(`- ... ${item.evidence.length - 12} more blocks in \`cases.json\``);
    }
    lines.push("");
  }

  lines.push("## Privacy");
  lines.push("");
  lines.push(
    "The report intentionally omits raw summary text. Sensitive values detected in summaries are represented only as flags.",
  );
  lines.push("");

  return lines.join("\n");
}