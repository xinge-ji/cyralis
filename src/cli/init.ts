import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { collectTemplates, type Platform } from "./templates.js";

interface InitOptions {
  cwd: string;
  platforms: Platform[];
  force: boolean;
  command: "init" | "update";
}

interface WriteResult {
  path: string;
  status: "created" | "updated" | "unchanged" | "conflict" | "removed";
}

interface MarkdownHeading {
  level: number;
  text: string;
  index: number;
}

const claudeTemplatePath = "CLAUDE.md";
const attentionTemplatePath = ".cyralis/attention.md";
const projectKnowledgeHeading = "项目碎片知识";
const csNoteAnchor = "<!-- cs-note managed: 用 cs-note 维护，新条目按下面分节追加 -->";

export async function initCommand(argv: string[]): Promise<void> {
  const options = parseInstallArgs("init", argv, false);
  installTemplates(options);
}

export async function updateCommand(argv: string[]): Promise<void> {
  const options = parseInstallArgs("update", argv, true);
  installTemplates(options);
}

function installTemplates(options: InitOptions): void {
  const templates = collectTemplates(options.platforms);
  const currentTemplatePaths = new Set(templates.keys());
  const manifestPath = join(options.cwd, ".cyralis", ".template-hashes.json");
  const previousManifest = readTemplateHashManifest(manifestPath);
  const results: WriteResult[] = [];

  for (const [relativePath, content] of templates) {
    results.push(writeTemplateFile(options.cwd, relativePath, content, options.force));
  }

  if (options.force) {
    results.push(...removeObsoleteManagedFiles(
      options.cwd,
      options.platforms,
      currentTemplatePaths,
      previousManifest,
    ));
  }

  const managedPaths = results
    .filter((result) => result.status !== "conflict" && result.status !== "removed")
    .map((result) => result.path);
  writeTemplateHashes(options.cwd, managedPaths);

  const summary = summarize(results);
  console.log(`Cyralis ${options.command === "update" ? "updated" : "initialized"} in ${options.cwd}`);
  console.log(`created: ${summary.created}, updated: ${summary.updated}, unchanged: ${summary.unchanged}, removed: ${summary.removed}, conflicts: ${summary.conflict}`);
  if (summary.conflict > 0) {
    console.log("Conflicting files were left untouched. Re-run with --force to overwrite managed files.");
  }
}

function writeTemplateFile(cwd: string, relativePath: string, content: string, force: boolean): WriteResult {
  if (relativePath === claudeTemplatePath || relativePath === attentionTemplatePath) {
    return writeProjectNoteFile(cwd, relativePath, content);
  }
  return writeManagedFile(cwd, relativePath, content, force);
}

function parseInstallArgs(command: "init" | "update", argv: string[], forceDefault: boolean): InitOptions {
  let cwd = process.cwd();
  let force = forceDefault;
  let pi = false;
  let codex = false;
  let claude = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      console.log(`Usage: cyralis ${command} [--cwd <dir>] [--pi] [--codex] [--claude] [--all] [--force]`);
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
    if (arg === "--claude") {
      claude = true;
      continue;
    }
    if (arg === "--all") {
      pi = true;
      codex = true;
      claude = true;
      continue;
    }
    throw new Error(`Unknown ${command} option: ${arg}`);
  }

  const platforms: Platform[] = [];
  if (!pi && !codex && !claude) {
    platforms.push("claude", "pi", "codex");
  } else {
    if (claude) platforms.push("claude");
    if (pi) platforms.push("pi");
    if (codex) platforms.push("codex");
  }

  return { cwd: resolve(cwd), platforms, force, command };
}

function writeProjectNoteFile(cwd: string, relativePath: string, content: string): WriteResult {
  const absolutePath = join(cwd, relativePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  const normalized = content.endsWith("\n") ? content : `${content}\n`;
  try {
    const current = readFileSync(absolutePath, "utf8");
    const merged = mergeAgentsContent(current, normalized);
    if (current === merged) return { path: relativePath, status: "unchanged" };
    writeFileSync(absolutePath, merged, "utf8");
    return { path: relativePath, status: "updated" };
  } catch (err) {
    if (!isNotFound(err)) throw err;
    writeFileSync(absolutePath, normalized, "utf8");
    return { path: relativePath, status: "created" };
  }
}

function mergeAgentsContent(current: string, template: string): string {
  const projectKnowledgeBlock = buildProjectKnowledgeSkeleton(template);
  const currentHeadings = parseMarkdownHeadings(current);
  const projectKnowledge = currentHeadings.find((heading) => heading.text === projectKnowledgeHeading);

  if (!projectKnowledge) {
    return appendMarkdownBlock(current, projectKnowledgeBlock);
  }

  const requiredHeadings = parseMarkdownHeadings(projectKnowledgeBlock)
    .filter((heading) => heading.text !== projectKnowledgeHeading);
  const sectionHeadings = headingsInSection(currentHeadings, projectKnowledge);
  const missingHeadings = requiredHeadings
    .filter((required) => !sectionHeadings.some((heading) => heading.text === required.text));
  if (missingHeadings.length === 0) return current;

  const missingBlock = [
    sectionContent(current, currentHeadings, projectKnowledge).includes("<!-- cs-note managed") ? null : csNoteAnchor,
    ...missingHeadings.map((heading) => `${"#".repeat(heading.level)} ${heading.text}`),
  ].filter((line): line is string => Boolean(line)).join("\n\n");

  return insertMarkdownBlockInSection(current, projectKnowledge, missingBlock);
}

function buildProjectKnowledgeSkeleton(template: string): string {
  const headings = parseMarkdownHeadings(template);
  const projectKnowledge = headings.find((heading) => heading.text === projectKnowledgeHeading);
  if (!projectKnowledge) {
    throw new Error(`AGENTS template is missing ${projectKnowledgeHeading}`);
  }
  const requiredHeadings = [
    projectKnowledge,
    ...headingsInSection(headings, projectKnowledge),
  ];
  return [
    `${"#".repeat(projectKnowledge.level)} ${projectKnowledge.text}`,
    csNoteAnchor,
    ...requiredHeadings
      .filter((heading) => heading !== projectKnowledge)
      .map((heading) => `${"#".repeat(heading.level)} ${heading.text}`),
  ].join("\n\n");
}

function insertMarkdownBlockInSection(content: string, section: MarkdownHeading, block: string): string {
  const headings = parseMarkdownHeadings(content);
  const sectionEnd = headings.find(
    (heading) => heading.index > section.index && heading.level <= section.level,
  )?.index;
  if (sectionEnd === undefined) return appendMarkdownBlock(content, block);
  return insertMarkdownBlockAt(content, sectionEnd, block);
}

function headingsInSection(headings: MarkdownHeading[], section: MarkdownHeading): MarkdownHeading[] {
  return headings.filter(
    (heading) => heading.index > section.index
      && heading.index < sectionEndIndex(headings, section)
      && heading.level > section.level,
  );
}

function sectionContent(content: string, headings: MarkdownHeading[], section: MarkdownHeading): string {
  return content.slice(section.index, sectionEndIndex(headings, section));
}

function sectionEndIndex(headings: MarkdownHeading[], section: MarkdownHeading): number {
  return headings.find(
    (heading) => heading.index > section.index && heading.level <= section.level,
  )?.index ?? Number.POSITIVE_INFINITY;
}

function appendMarkdownBlock(content: string, block: string): string {
  return insertMarkdownBlockAt(content, content.length, block);
}

function insertMarkdownBlockAt(content: string, index: number, block: string): string {
  const before = content.slice(0, index);
  const after = content.slice(index);
  const normalizedBlock = block.trimEnd();
  const prefix = before.length === 0 || before.endsWith("\n\n")
    ? ""
    : before.endsWith("\n")
      ? "\n"
      : "\n\n";
  const suffix = after.length === 0
    ? "\n"
    : after.startsWith("\n\n")
      ? ""
      : after.startsWith("\n")
        ? "\n"
        : "\n\n";
  return `${before}${prefix}${normalizedBlock}${suffix}${after}`;
}

function parseMarkdownHeadings(content: string): MarkdownHeading[] {
  const headings: MarkdownHeading[] = [];
  let index = 0;
  let inFence = false;
  for (const line of content.split(/(?<=\n)/)) {
    const fence = /^\s{0,3}(```|~~~)/.test(line);
    if (fence) {
      inFence = !inFence;
      index += line.length;
      continue;
    }

    const match = /^( {0,3})(#{1,6})\s+(.+?)\s*$/.exec(line.trimEnd());
    if (!inFence && match) {
      const headingText = match[3].replace(/\s+#+\s*$/, "").trim();
      headings.push({
        level: match[2].length,
        text: headingText,
        index: index + match[1].length,
      });
    }
    index += line.length;
  }
  return headings;
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
  currentTemplatePaths: Set<string>,
  manifest: { version: number; files: Record<string, string> } | null,
): WriteResult[] {
  const files = manifest?.files;
  if (!files) return [];
  const results: WriteResult[] = [];
  for (const relativePath of Object.keys(files)) {
    if (currentTemplatePaths.has(relativePath)) continue;
    if (!isManagedScopeActive(relativePath, platforms)) continue;
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

function isManagedScopeActive(relativePath: string, platforms: Platform[]): boolean {
  if (relativePath.startsWith(".cyralis/")) return true;
  if (relativePath === claudeTemplatePath) return platforms.includes("claude");
  if (relativePath.startsWith(".claude/")) return platforms.includes("claude");
  if (relativePath.startsWith(".codex/")) return platforms.includes("codex");
  if (relativePath.startsWith(".pi/")) return platforms.includes("pi");
  return false;
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
