import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_RULES, matchRules } from "../src/rules.mjs";

const SAMPLES = {
  "codearts-image-capability": "codearts glm-5.3-flash text-only 406 image multimodal",
  "opencode-plugin-lifecycle": "opencode plugin setup() 6-15 session.idle subscribe",
  "mcp-orphan-processes": "MCP npx orphan process taskkill",
  "reasoning-variants": "reasoning variants effort 思考档位",
  "context-compression": "billion-context compress 413 cache",
  "dsh-low-integrity": "DSH electron lock file userData low integrity",
  "griddraft-aoa-topology": "GridDraft AOA 虚箭线 教材",
  "word-report-structure": "Word Range.Text 段落标记 分节",
  "srt-coverage": "SRT 字幕 覆盖率 时间戳",
  "magpie-provider": "magpie provider model multimodal",
};

test("every built-in rule has a matching sample and does not match empty text", () => {
  assert.equal(DEFAULT_RULES.length, 10);

  for (const rule of DEFAULT_RULES) {
    const sample = SAMPLES[rule.id];
    assert.ok(sample, `missing sample for ${rule.id}`);
    const matched = matchRules(sample);
    assert.ok(
      matched.some((item) => item.id === rule.id),
      `${rule.id} did not match its sample: ${sample}`,
    );
    assert.equal(rule.test(""), false, `${rule.id} matched empty text`);
  }
});