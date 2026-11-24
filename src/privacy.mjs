const SECRET_PATTERNS = [
  ["api-key", /\bsk-[A-Za-z0-9_-]{16,}\b/g],
  ["github-token", /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/g],
  ["github-fine-grained-token", /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g],
  ["slack-token", /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g],
  ["auth-header", /\b(?:authorization|x-auth-token)\s*[:=]\s*(?:Bearer\s+)?[^\s,;]+/gi],
  ["base64-image", /data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]{100,}/gi],
  ["private-key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
];

export function scanSensitive(text) {
  const source = String(text ?? "");
  const flags = new Set();

  for (const [name, pattern] of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(source)) flags.add(name);
  }

  if (/\b(?:password|passwd|secret)\s*[:=]\s*["']?[^\s"']{8,}/i.test(source)) {
    flags.add("credential-assignment");
  }

  return [...flags].sort();
}

export function containsSensitive(text) {
  return scanSensitive(text).length > 0;
}

export function redactSensitive(text) {
  let output = String(text ?? "");

  for (const [name, pattern] of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    output = output.replace(pattern, `[redacted:${name}]`);
  }

  return output.replace(
    /\b((?:password|passwd|secret)\s*[:=]\s*["']?)[^\s"']{8,}/gi,
    "$1[redacted:credential-assignment]",
  );
}