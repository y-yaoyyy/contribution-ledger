import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { collectInventory } from "./inventory.mjs";
import { analyzeSessions, summarize } from "./cluster.mjs";
import { renderReport } from "./render.mjs";
import { renderHtml } from "./render-html.mjs";
import { briefFileName, renderBrief } from "./brief.mjs";
import { loadRuleFile, mergeRules } from "./rule-file.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_PATH = path.resolve(HERE, "..", "package.json");
const DEMO_INPUT = path.resolve(HERE, "..", "demo", "sessions.jsonl");

const HELP = `ContributionLedger — turn compressed session summaries into an evidence ledger.

Usage:
  contributionledger --input <sessions.jsonl> [options]
  contributionledger --demo [options]

Options:
  -i, --input <file>       JSONL inventory to read
  -o, --out <dir>          output directory (default: ./contributionledger-out,
                           or ./contributionledger-demo with --demo)
      --demo               run against the bundled demo inventory
      --rules <file>       JSON rules that override/add to the built-in rules
      --rules-only         use only --rules, not the built-in rules
      --excerpts           include redacted summary excerpts in evidence and briefs
      --min-sessions <n>   only keep cases seen in at least n sessions (default: 1)
  -h, --help               show this help
  -v, --version            show the version

The input is read-only. Outputs: report.md, report.html, cases.json, and
briefs/<case>.md. Raw summary text is not copied unless --excerpts is used.
`;

export class UsageError extends Error {}

function readVersion() {
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_PATH, "utf8"));
  return String(pkg.version ?? "0.0.0");
}

function takeValue(argv, index, flag) {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith("-")) {
    throw new UsageError(`${flag} requires a value`);
  }
  return value;
}

export function parseArgs(argv) {
  const options = {
    input: null,
    out: null,
    demo: false,
    rules: null,
    rulesOnly: false,
    excerpts: false,
    minSessions: 1,
    help: false,
    version: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "-h" || arg === "--help") {
      options.help = true;
      continue;
    }
    if (arg === "-v" || arg === "--version") {
      options.version = true;
      continue;
    }
    if (arg === "--demo") {
      options.demo = true;
      continue;
    }
    if (arg === "--rules-only") {
      options.rulesOnly = true;
      continue;
    }
    if (arg === "--excerpts") {
      options.excerpts = true;
      continue;
    }
    if (arg === "-i" || arg === "--input") {
      options.input = takeValue(argv, index, arg);
      index += 1;
      continue;
    }
    if (arg === "-o" || arg === "--out") {
      options.out = takeValue(argv, index, arg);
      index += 1;
      continue;
    }
    if (arg === "--rules") {
      options.rules = takeValue(argv, index, arg);
      index += 1;
      continue;
    }
    if (arg === "--min-sessions") {
      const raw = takeValue(argv, index, arg);
      const value = Number(raw);
      if (!Number.isInteger(value) || value < 1) {
        throw new UsageError("--min-sessions must be a positive integer");
      }
      options.minSessions = value;
      index += 1;
      continue;
    }
    if (arg.startsWith("-")) {
      throw new UsageError(`unknown option: ${arg}`);
    }
    if (options.input !== null) {
      throw new UsageError(`unexpected argument: ${arg}`);
    }
    options.input = arg;
  }

  if (options.demo && options.input !== null) {
    throw new UsageError("--demo and --input are mutually exclusive");
  }
  if (options.rulesOnly && options.rules === null) {
    throw new UsageError("--rules-only requires --rules");
  }

  return options;
}

export function hashFile(file) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(file);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

function writeFileAtomic(file, content) {
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, content, { encoding: "utf8", mode: 0o600 });
  fs.renameSync(temporary, file);
}

function rulesFor(options) {
  if (options.rules === null) return undefined;
  const custom = loadRuleFile(path.resolve(options.rules));
  return mergeRules(custom, { rulesOnly: options.rulesOnly });
}

export async function run(argv = process.argv.slice(2), io = {}) {
  const stdout = io.stdout ?? process.stdout;
  const stderr = io.stderr ?? process.stderr;
  const now = io.now ?? new Date();

  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    if (error instanceof UsageError) {
      stderr.write(`contributionledger: ${error.message}\n\n${HELP}`);
      return 1;
    }
    throw error;
  }

  if (options.help) {
    stdout.write(HELP);
    return 0;
  }
  if (options.version) {
    stdout.write(`${readVersion()}\n`);
    return 0;
  }
  if (!options.demo && options.input === null) {
    stderr.write(`contributionledger: --input (or --demo) is required\n\n${HELP}`);
    return 1;
  }

  const input = options.demo ? DEMO_INPUT : path.resolve(options.input);
  if (!fs.existsSync(input) || !fs.statSync(input).isFile()) {
    stderr.write(`contributionledger: input is not a file: ${input}\n`);
    return 1;
  }

  const outDir = path.resolve(
    options.out ?? (options.demo ? "contributionledger-demo" : "contributionledger-out"),
  );
  if (outDir === input) {
    stderr.write("contributionledger: output directory cannot be the input file\n");
    return 1;
  }

  try {
    const inputSha256 = await hashFile(input);
    const sessions = await collectInventory(input);
    const rules = rulesFor(options);
    const cases = analyzeSessions(sessions, {
      minSessions: options.minSessions,
      ...(rules === undefined ? {} : { rules }),
      includeExcerpts: options.excerpts,
    });
    const summary = summarize(sessions, cases);

    fs.mkdirSync(outDir, { recursive: true });

    const meta = {
      schemaVersion: 1,
      toolVersion: readVersion(),
      generatedAt: now.toISOString(),
      inputName: options.demo ? "demo/sessions.jsonl" : path.basename(input),
      inputSha256,
      summary,
      excerptsIncluded: options.excerpts,
      ...(options.rules === null ? {} : { rulesName: path.basename(options.rules) }),
    };

    const report = renderReport(cases, meta);
    const html = renderHtml(cases, meta);
    const payload = {
      ...meta,
      privacy: {
        rawSummaryTextIncluded: false,
        excerptsIncluded: options.excerpts,
        note: options.excerpts
          ? "Excerpts are redacted and truncated; review them before publishing."
          : "Evidence contains session/block references and redacted topics only.",
      },
      cases,
    };

    writeFileAtomic(path.join(outDir, "report.md"), report);
    writeFileAtomic(path.join(outDir, "cases.json"), `${JSON.stringify(payload, null, 2)}\n`);
    writeFileAtomic(path.join(outDir, "report.html"), html);

    const briefsDir = path.join(outDir, "briefs");
    if (cases.length > 0) fs.mkdirSync(briefsDir, { recursive: true });
    for (const item of cases) {
      writeFileAtomic(path.join(briefsDir, briefFileName(item.id)), renderBrief(item, meta));
    }

    stdout.write(
      `contributionledger: ${summary.cases} case(s) from ${summary.sessions} session(s)\n` +
        `  report: ${path.join(outDir, "report.md")}\n` +
        `  html:   ${path.join(outDir, "report.html")}\n` +
        `  cases:  ${path.join(outDir, "cases.json")}\n` +
        `  briefs: ${briefsDir}\n`,
    );
    return 0;
  } catch (error) {
    stderr.write(`contributionledger: ${error.message}\n`);
    return 1;
  }
}