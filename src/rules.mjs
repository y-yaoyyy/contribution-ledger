/**
 * Deterministic symptom rules. A rule sees the block topic + summary only.
 * Rules should stay conservative: one false upstream report costs more than a
 * missed lead, because every case is meant to be reviewed by a human.
 */
export const DEFAULT_RULES = [
  {
    id: "codearts-image-capability",
    component: "codearts",
    symptom: "image-capability-mismatch",
    title: "CodeArts image capability mismatch",
    test(text) {
      return (
        text.includes("codearts") &&
        (text.includes("multimodal") ||
          text.includes("text-only") ||
          text.includes("406") ||
          text.includes("图片") ||
          text.includes("image")) &&
        (text.includes("纯文本") ||
          text.includes("text-only") ||
          text.includes("multimodal") ||
          text.includes("406"))
      );
    },
  },
  {
    id: "opencode-plugin-lifecycle",
    component: "opencode",
    symptom: "plugin-setup-duplication",
    title: "OpenCode plugin setup/subscription duplication",
    test(text) {
      return (
        text.includes("opencode") &&
        (text.includes("setup()") || text.includes("setup ")) &&
        (text.includes("subscribe") ||
          text.includes("session.idle") ||
          text.includes("重复") ||
          text.includes("6-15") ||
          text.includes("6–15"))
      );
    },
  },
  {
    id: "mcp-orphan-processes",
    component: "mcp",
    symptom: "orphan-process-lifecycle",
    title: "MCP orphan process lifecycle",
    test(text) {
      return (
        text.includes("mcp") &&
        (text.includes("orphan") ||
          text.includes("孤儿") ||
          text.includes("npx")) &&
        (text.includes("taskkill") ||
          text.includes("ppid") ||
          text.includes("进程") ||
          text.includes("process"))
      );
    },
  },
  {
    id: "reasoning-variants",
    component: "model-routing",
    symptom: "reasoning-capability-metadata",
    title: "Reasoning levels and variants mismatch",
    test(text) {
      return (
        (text.includes("reasoning") || text.includes("思考")) &&
        (text.includes("variant") ||
          text.includes("effort") ||
          text.includes("档位") ||
          text.includes("reasoning_effort"))
      );
    },
  },
  {
    id: "context-compression",
    component: "billion-context",
    symptom: "compression-and-cache",
    title: "Context compression or cache failure",
    test(text) {
      return (
        (text.includes("billion-context") || text.includes("bili")) &&
        (text.includes("compress") ||
          text.includes("压缩") ||
          text.includes("413") ||
          text.includes("cache") ||
          text.includes("缓存"))
      );
    },
  },
  {
    id: "dsh-low-integrity",
    component: "deepseek-harness",
    symptom: "windows-low-integrity-startup",
    title: "DSH desktop startup under low integrity",
    test(text) {
      return (
        (text.includes("dsh") ||
          text.includes("deepseek-harness") ||
          text.includes("electron")) &&
        (text.includes("low integrity") ||
          text.includes("s-1-16-4096") ||
          text.includes("status_breakpoint") ||
          text.includes("lock file") ||
          text.includes("userdata"))
      );
    },
  },
  {
    id: "griddraft-aoa-topology",
    component: "griddraft",
    symptom: "aoa-junction-topology",
    title: "GridDraft AOA junction topology differs from textbook",
    test(text) {
      return (
        (text.includes("griddraft") ||
          text.includes("双代号") ||
          text.includes("aoa")) &&
        (text.includes("虚箭线") ||
          text.includes("教材") ||
          text.includes("事件数") ||
          text.includes("dummy") ||
          text.includes("junction"))
      );
    },
  },
  {
    id: "word-report-structure",
    component: "word",
    symptom: "report-structure",
    title: "Word report structure and field damage",
    test(text) {
      return (
        (text.includes("word") ||
          text.includes("docx") ||
          text.includes("python-docx")) &&
        (text.includes("range.text") ||
          text.includes("段落标记") ||
          text.includes("分节") ||
          text.includes("目录"))
      );
    },
  },
  {
    id: "srt-coverage",
    component: "subtitles",
    symptom: "srt-coverage-mapping",
    title: "Subtitle coverage and episode mapping",
    test(text) {
      return (
        (text.includes("srt") || text.includes("字幕")) &&
        (text.includes("覆盖率") ||
          text.includes("时间戳") ||
          text.includes("分p") ||
          text.includes("分 p"))
      );
    },
  },
  {
    id: "magpie-provider",
    component: "magpie",
    symptom: "provider-model-metadata",
    title: "Magpie provider or model metadata issue",
    test(text) {
      return (
        text.includes("magpie") &&
        (text.includes("provider") ||
          text.includes("model") ||
          text.includes("reasoning") ||
          text.includes("multimodal"))
      );
    },
  },
];

export function matchRules(text, rules = DEFAULT_RULES) {
  const normalized = String(text ?? "").toLowerCase();
  return rules.filter((rule) => rule.test(normalized));
}