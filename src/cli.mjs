import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { collectInventory } from "./inventory.mjs";
import { analyzeSessions, summarize } from "./cluster.mjs";
import { renderReport } from "./render.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_PATH = path.resolve(HERE, "..", "package.json");

const HELP = `ContributionLedger — turn compressed session summaries into an evidence ledger.

Usage:
  contributionledger --input <sessions.jsonl> [options]

Options:
  -i, --input <file>       JSONL inventory to read (required)
  -o, --out <dir>          output directory (default: ./contributionledger-out)
      --min-sessions <n>   only keep cases seen in at least n sessions (default: 1)
  -h, --help               show this help
  -v, --version            show the version

The input is read-only. The output contains an evidence report and cases.json;
raw summary text is never copied into either file.
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
    out: "contributionledger-out",
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
  if (options.input === null) {
    stderr.write(`contributionledger: --input is required\n\n${HELP}`);
    return 1;
  }

  const input = path.resolve(options.input);
  if (!fs.existsSync(input) || !fs.statSync(input).isFile()) {
    stderr.write(`contributionledger: input is not a file: ${input}\n`);
    return 1;
  }

  const outDir = path.resolve(options.out);
  if (outDir === input) {
    stderr.write("contributionledger: output directory cannot be the input file\n");
    return 1;
  }

  try {
    const inputSha256 = await hashFile(input);
    const sessions = await collectInventory(input);
    const cases = analyzeSessions(sessions, { minSessions: options.minSessions });
    const summary = summarize(sessions, cases);

    fs.mkdirSync(outDir, { recursive: true });

    const meta = {
      toolVersion: readVersion(),
      generatedAt: now.toISOString(),
      inputName: path.basename(input),
      inputSha256,
      summary,
    };

    const report = renderReport(cases, meta);
    const payload = {
      ...meta,
      privacy: {
        rawSummaryTextIncluded: false,
        note: "Evidence contains session/block references and redacted topics only.",
      },
      cases,
    };

    writeFileAtomic(path.join(outDir, "report.md"), report);
    writeFileAtomic(path.join(outDir, "cases.json"), `${JSON.stringify(payload, null, 2)}\n`);

    stdout.write(
      `contributionledger: ${summary.cases} case(s) from ${summary.sessions} session(s)\n` +
        `  report: ${path.join(outDir, "report.md")}\n` +
        `  cases:  ${path.join(outDir, "cases.json")}\n`,
    );
    return 0;
  } catch (error) {
    stderr.write(`contributionledger: ${error.message}\n`);
    return 1;
  }
}