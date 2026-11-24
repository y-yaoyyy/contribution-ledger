const GITHUB_REF = /https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/(?:issues|pull)\/\d+/g;

export const STAGE_RANK = {
  mentioned: 0,
  diagnosed: 1,
  "local-fix-reported": 2,
  "upstream-submitted": 3,
  "duplicate-reported": 4,
  "merged-reported": 5,
};

export function normalizeText(text) {
  return String(text ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function extractGithubRefs(text) {
  const source = String(text ?? "");
  const seen = new Set();
  const refs = [];

  for (const match of source.matchAll(GITHUB_REF)) {
    const url = match[0].replace(/[),.;]+$/, "");
    if (seen.has(url)) continue;
    seen.add(url);

    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    refs.push({
      url,
      kind: parts[2] === "pull" ? "pull" : "issue",
      repo: `${parts[0]}/${parts[1]}`,
      number: Number(parts[3]),
    });
  }

  return refs;
}

export function extractReportedStage(text) {
  const value = String(text ?? "").toLowerCase();
  const refs = extractGithubRefs(text);

  // "Merged" and "duplicate" are only meaningful next to a concrete upstream
  // reference. Otherwise the words are usually describing local work.
  if (refs.length > 0 && /\bmerged\b|已合并|merge commit/.test(value)) return "merged-reported";
  if (
    refs.length > 0 &&
    /(?:duplicate of|closed as duplicate|重复的?\s*(?:issue|pr)|重复\s*#)/.test(value)
  ) {
    return "duplicate-reported";
  }
  if (refs.length > 0 && /(?:open|opened|已开|已提交|pull request|\bpr\b)/.test(value)) {
    return "upstream-submitted";
  }
  if (/local[- ]fix|本地修复|本地补丁|patched locally|verified|验证通过|fix works/.test(value)) {
    return "local-fix-reported";
  }
  if (/diagnos|root cause|根因|定位|reproduc/.test(value)) return "diagnosed";

  return "mentioned";
}

export function extractContradictions(text) {
  const value = String(text ?? "").toLowerCase();
  const flags = new Set();

  if (
    (value.includes("text-only") || value.includes("纯文本")) &&
    (value.includes("multimodal") || value.includes("能看图") || value.includes("image:true"))
  ) {
    flags.add("text-only-vs-multimodal");
  }

  if (
    (value.includes("not a bug") ||
      value.includes("不是 bug") ||
      value.includes("设计语义") ||
      value.includes("by design")) &&
    (value.includes("bug") || value.includes("缺陷") || value.includes("broken"))
  ) {
    flags.add("bug-vs-by-design");
  }

  if (value.includes("ocr") && (value.includes("kernel") || value.includes("multimodal"))) {
    flags.add("ocr-vs-native-multimodal");
  }

  if (
    (value.includes("only one setup") || value.includes("setup #1")) &&
    (value.includes("6-15") || value.includes("6–15") || value.includes("multiple setup"))
  ) {
    flags.add("single-vs-repeated-setup");
  }

  return [...flags].sort();
}

export function maxStage(stages) {
  return [...stages].sort((a, b) => (STAGE_RANK[b] ?? 0) - (STAGE_RANK[a] ?? 0))[0] ?? "mentioned";
}

export function nextManualAction({ stages, upstreamRefs, contradictions }) {
  if (contradictions.length > 0) {
    return "Re-read the original evidence and resolve the contradiction before treating either claim as current.";
  }
  if (upstreamRefs.length > 0) {
    return "Open the upstream reference and verify its current state; the recorded stage is historical.";
  }
  if (stages.includes("local-fix-reported")) {
    return "Reproduce the local fix, then search upstream for duplicates before filing an issue or PR.";
  }
  if (stages.includes("diagnosed")) {
    return "Reproduce the diagnosis from source evidence; the summary alone is not enough to report upstream.";
  }
  return "Treat as a lead only; locate the original session or logs before acting.";
}