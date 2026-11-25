import fs from "node:fs";
import path from "node:path";
import { DEFAULT_RULES } from "./rules.mjs";

function asString(value, field, index) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`rule ${index + 1}: ${field} must be a non-empty string`);
  }
  return value.trim();
}

function stringList(value, field, index) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`rule ${index + 1}: ${field} must be an array of strings`);
  }
  return value.map((item) => item.toLowerCase()).filter((item) => item !== "");
}

/**
 * Compile a small, declarative rule from JSON. Custom rules never execute
 * arbitrary JavaScript; they only describe text that must all/any/none match.
 */
export function compileRule(raw, index = 0) {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`rule ${index + 1}: expected an object`);
  }

  const id = asString(raw.id, "id", index);
  const component = asString(raw.component, "component", index);
  const symptom = asString(raw.symptom, "symptom", index);
  const title = asString(raw.title, "title", index);
  const all = stringList(raw.all, "all", index);
  const any = stringList(raw.any, "any", index);
  const none = stringList(raw.none, "none", index);

  if (all.length === 0 && any.length === 0) {
    throw new Error(`rule ${index + 1}: provide at least one entry in all or any`);
  }

  return {
    id,
    component,
    symptom,
    title,
    source: "custom",
    test(text) {
      const value = String(text ?? "").toLowerCase();
      if (none.some((needle) => value.includes(needle))) return false;
      if (!all.every((needle) => value.includes(needle))) return false;
      return any.length === 0 || any.some((needle) => value.includes(needle));
    },
  };
}

export function parseRuleFile(text, source = "rules") {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`${source}: invalid JSON (${error.message})`);
  }

  const list = Array.isArray(parsed) ? parsed : parsed?.rules;
  if (!Array.isArray(list)) {
    throw new Error(`${source}: expected an array or an object with a rules array`);
  }

  const seen = new Set();
  return list.map((raw, index) => {
    const rule = compileRule(raw, index);
    if (seen.has(rule.id)) {
      throw new Error(`${source}: duplicate rule id "${rule.id}"`);
    }
    seen.add(rule.id);
    return rule;
  });
}

export function loadRuleFile(file) {
  const resolved = path.resolve(file);
  return parseRuleFile(fs.readFileSync(resolved, "utf8"), resolved);
}

/**
 * Custom rules override built-ins with the same id, so a user can replace one
 * narrow rule without copying the other nine.
 */
export function mergeRules(customRules = [], { rulesOnly = false } = {}) {
  const merged = new Map();
  if (!rulesOnly) {
    for (const rule of DEFAULT_RULES) merged.set(rule.id, rule);
  }
  for (const rule of customRules) merged.set(rule.id, rule);
  return [...merged.values()];
}