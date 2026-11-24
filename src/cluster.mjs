import { redactSensitive, scanSensitive } from "./privacy.mjs";
import {
  extractContradictions,
  extractGithubRefs,
  extractReportedStage,
  maxStage,
  nextManualAction,
  normalizeText,
} from "./extract.mjs";
import { DEFAULT_RULES, matchRules } from "./rules.mjs";

const CONTRADICTION_SCOPE = {
  "codearts--image-capability-mismatch": [
    "text-only-vs-multimodal",
    "ocr-vs-native-multimodal",
  ],
  "magpie--provider-model-metadata": ["text-only-vs-multimodal", "ocr-vs-native-multimodal"],
  "opencode--plugin-setup-duplication": ["single-vs-repeated-setup"],
  "deepseek-harness--windows-low-integrity-startup": ["bug-vs-by-design"],
};

function caseId(component, symptom) {
  return `${component}--${symptom}`.replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
}

function scopedContradictions(id, contradictions) {
  const allowed = CONTRADICTION_SCOPE[id];
  if (!allowed) return [];
  return contradictions.filter((value) => allowed.includes(value));
}

function addUnique(list, value) {
  if (!list.includes(value)) list.push(value);
}

function scoreCase(item) {
  const sessionBonus = item.sessions.length * 10;
  const localBonus = item.stages.includes("local-fix-reported") ? 20 : 0;
  const upstreamBonus = item.upstreamRefs.length > 0 ? 15 : 0;
  const contradictionBonus = item.contradictions.length > 0 ? 10 : 0;
  return sessionBonus + localBonus + upstreamBonus + contradictionBonus + item.occurrences;
}

export function analyzeSessions(sessions, { rules = DEFAULT_RULES, minSessions = 1 } = {}) {
  const byId = new Map();

  for (const session of sessions) {
    for (const block of session.blocks) {
      const text = normalizeText(`${block.topic}\n${block.summary}`);
      if (text === "") continue;

      const matched = matchRules(text, rules);
      if (matched.length === 0) continue;

      const refs = extractGithubRefs(text);
      const stage = extractReportedStage(text);
      const rawContradictions = extractContradictions(text);
      const sensitivityFlags = scanSensitive(text);

      for (const rule of matched) {
        const id = caseId(rule.component, rule.symptom);
        const contradictions = scopedContradictions(id, rawContradictions);
        let item = byId.get(id);

        if (!item) {
          item = {
            id,
            component: rule.component,
            symptom: rule.symptom,
            title: rule.title,
            sessions: [],
            occurrences: 0,
            evidence: [],
            stages: [],
            contradictions: [],
            upstreamRefs: [],
            sensitivityFlags: [],
            nextManualAction: "",
          };
          byId.set(id, item);
        }

        item.occurrences += 1;
        addUnique(item.sessions, session.id);
        addUnique(item.stages, stage);

        for (const contradiction of contradictions) addUnique(item.contradictions, contradiction);
        for (const flag of sensitivityFlags) addUnique(item.sensitivityFlags, flag);

        const evidenceKey = `${session.id}:${block.index}`;
        if (!item.evidence.some((entry) => `${entry.sessionId}:${entry.blockIndex}` === evidenceKey)) {
          item.evidence.push({
            sessionId: session.id,
            sessionTitle: redactSensitive(session.title),
            blockIndex: block.index,
            topic: redactSensitive(block.topic),
            reportedStage: stage,
            sourceLine: session.sourceLine,
          });
        }

        for (const ref of refs) {
          if (!item.upstreamRefs.some((entry) => entry.url === ref.url)) item.upstreamRefs.push(ref);
        }
      }
    }
  }

  const cases = [];
  for (const item of byId.values()) {
    if (item.sessions.length < minSessions) continue;

    item.contradictions.sort();
    item.sensitivityFlags.sort();
    item.reportedStage = maxStage(item.stages);
    item.nextManualAction = nextManualAction(item);
    item.score = scoreCase(item);
    cases.push(item);
  }

  return cases.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}

export function summarize(sessions, cases) {
  return {
    sessions: sessions.length,
    blocks: sessions.reduce((total, session) => total + session.blocks.length, 0),
    cases: cases.length,
    withUpstreamRefs: cases.filter((item) => item.upstreamRefs.length > 0).length,
    withLocalFix: cases.filter((item) => item.stages.includes("local-fix-reported")).length,
    withContradictions: cases.filter((item) => item.contradictions.length > 0).length,
  };
}