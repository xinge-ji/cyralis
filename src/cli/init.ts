import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { collectTemplates, type Platform } from "./templates.js";

interface InitOptions {
  cwd: string;
  platforms: Platform[];
  force: boolean;
}

interface WriteResult {
  path: string;
  status: "created" | "updated" | "unchanged" | "conflict" | "removed";
}

const obsoleteManagedFiles = [
  ".codex/agents/cyralis-memory.toml",
];

export async function initCommand(argv: string[]): Promise<void> {
  const options = parseInitArgs(argv);
  const templates = collectTemplates(options.platforms);
  const manifestPath = join(options.cwd, ".cyralis", ".template-hashes.json");
  const previousManifest = readTemplateHashManifest(manifestPath);
  const results: WriteResult[] = [];

  for (const [relativePath, content] of templates) {
    results.push(writeManagedFile(options.cwd, relativePath, content, options.force));
  }

  results.push(...removeObsoleteManagedFiles(options.cwd, options.platforms, previousManifest));

  const managedPaths = results
    .filter((result) => result.status !== "conflict" && result.status !== "removed")
    .map((result) => result.path);
  writeTemplateHashes(options.cwd, managedPaths);

  const summary = summarize(results);
  console.log(`Cyralis initialized in ${options.cwd}`);
  console.log(`created: ${summary.created}, updated: ${summary.updated}, unchanged: ${summary.unchanged}, removed: ${summary.removed}, conflicts: ${summary.conflict}`);
  if (summary.conflict > 0) {
    console.log("Conflicting files were left untouched. Re-run with --force to overwrite managed files.");
  }
}

function parseInitArgs(argv: string[]): InitOptions {
  let cwd = process.cwd();
  let force = false;
  let pi = false;
  let codex = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      console.log("Usage: cyralis init [--cwd <dir>] [--pi] [--codex] [--all] [--force]");
      process.exit(0);
    }
    if (arg === "--cwd") {
      const value = argv[++i];
      if (!value) throw new Error("--cwd requires a directory");
      cwd = isAbsolute(value) ? value : resolve(process.cwd(), value);
      continue;
    }
    if (arg === "--force") {
      force = true;
      continue;
    }
    if (arg === "--pi") {
      pi = true;
      continue;
    }
    if (arg === "--codex") {
      codex = true;
      continue;
    }
    if (arg === "--all") {
      pi = true;
      codex = true;
      continue;
    }
    throw new Error(`Unknown init option: ${arg}`);
  }

  const platforms: Platform[] = [];
  if (!pi && !codex) {
    platforms.push("pi", "codex");
  } else {
    if (pi) platforms.push("pi");
    if (codex) platforms.push("codex");
  }

  return { cwd: resolve(cwd), platforms, force };
}

function writeManagedFile(cwd: string, relativePath: string, content: string, force: boolean): WriteResult {
  const absolutePath = join(cwd, relativePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  const normalized = content.endsWith("\n") ? content : `${content}\n`;
  try {
    const current = readFileSync(absolutePath, "utf8");
    if (current === normalized) return { path: relativePath, status: "unchanged" };
    if (!force) return { path: relativePath, status: "conflict" };
    writeFileSync(absolutePath, normalized, "utf8");
    return { path: relativePath, status: "updated" };
  } catch (err) {
    if (!isNotFound(err)) throw err;
    writeFileSync(absolutePath, normalized, "utf8");
    return { path: relativePath, status: "created" };
  }
}

function writeTemplateHashes(cwd: string, managedPaths: string[]): void {
  const hashes: Record<string, string> = {};
  for (const relativePath of managedPaths) {
    const content = readFileSync(join(cwd, relativePath));
    hashes[relativePath] = createHash("sha256").update(content).digest("hex");
  }
  const manifestPath = join(cwd, ".cyralis", ".template-hashes.json");
  mkdirSync(dirname(manifestPath), { recursive: true });
  writeFileSync(manifestPath, `${JSON.stringify({ version: 1, files: hashes }, null, 2)}\n`, "utf8");
}

function removeObsoleteManagedFiles(
  cwd: string,
  platforms: Platform[],
  manifest: { version: number; files: Record<string, string> } | null,
): WriteResult[] {
  if (!platforms.includes("codex")) return [];
  const files = manifest?.files;
  if (!files) return [];
  const results: WriteResult[] = [];
  for (const relativePath of obsoleteManagedFiles) {
    if (!files[relativePath]) continue;
    const absolutePath = join(cwd, relativePath);
    try {
      const current = readFileSync(absolutePath);
      const currentHash = createHash("sha256").update(current).digest("hex");
      if (currentHash !== files[relativePath]) continue;
      rmSync(absolutePath);
      results.push({ path: relativePath, status: "removed" });
    } catch (err) {
      if (!isNotFound(err)) throw err;
    }
  }
  return results;
}

function readTemplateHashManifest(path: string): { version: number; files: Record<string, string> } | null {
  try {
    const value = JSON.parse(readFileSync(path, "utf8")) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const files = (value as { files?: unknown }).files;
    if (!files || typeof files !== "object" || Array.isArray(files)) return null;
    return {
      version: typeof (value as { version?: unknown }).version === "number" ? (value as { version: number }).version : 1,
      files: files as Record<string, string>,
    };
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

function summarize(results: WriteResult[]): Record<WriteResult["status"], number> {
  return results.reduce<Record<WriteResult["status"], number>>(
    (acc, result) => {
      acc[result.status] += 1;
      return acc;
    },
    { created: 0, updated: 0, unchanged: 0, conflict: 0, removed: 0 },
  );
}

function isNotFound(err: unknown): boolean {
  return Boolean(err && typeof err === "object" && "code" in err && err.code === "ENOENT");
}
