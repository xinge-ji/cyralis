import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, relative, resolve, sep } from "node:path";

export type MemoryProjectionKind = "architecture" | "compound";

export interface SyncMemoryProjectionsOptions {
  cwd: string;
  cyralisRoot?: string;
  memoryRoot?: string;
  kinds?: MemoryProjectionKind[];
  sourcePaths?: string[];
  prune?: boolean;
}

export interface MemoryProjectionSkip {
  path: string;
  reason: string;
}

export interface MemoryProjectionSyncResult {
  created: number;
  updated: number;
  unchanged: number;
  pruned: number;
  skipped: MemoryProjectionSkip[];
}

interface SourceDocument {
  kind: MemoryProjectionKind;
  sourcePath: string;
  sourceRelPath: string;
  outputPath: string;
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  body: string;
}

interface ProjectionDocument {
  sourcePath: string;
  sourceRelPath: string;
  outputPath: string;
  id: string;
  content: string;
}

const COMPOUND_TYPES = new Set(["learning", "trick", "decision", "explore"]);
const STALE_STATUSES = new Set(["outdated", "superseded", "deprecated"]);

export async function syncMemoryProjections(options: SyncMemoryProjectionsOptions): Promise<MemoryProjectionSyncResult> {
  const cwd = resolve(options.cwd);
  const cyralisRoot = resolve(cwd, options.cyralisRoot ?? ".cyralis");
  const memoryRoot = resolve(cwd, options.memoryRoot ?? join(cyralisRoot, "memory"));
  const projectionRoot = join(memoryRoot, "projections");
  const kinds = normalizeKinds(options.kinds);
  const sourceFilter = normalizeSourceFilter(cwd, options.sourcePaths);
  const prune = options.prune ?? true;
  const result: MemoryProjectionSyncResult = {
    created: 0,
    updated: 0,
    unchanged: 0,
    pruned: 0,
    skipped: [],
  };
  const generatedOutputs = new Set<string>();
  const generatedSources = new Set<string>();

  await mkdir(projectionRoot, { recursive: true });

  for (const kind of kinds) {
    const sources = await collectSources({ cwd, cyralisRoot, projectionRoot, kind, sourceFilter, skipped: result.skipped });
    for (const source of sources) {
      const projection = buildProjection(source);
      generatedOutputs.add(projection.outputPath);
      generatedSources.add(projection.sourceRelPath);
      const writeStatus = await writeProjection(projection);
      result[writeStatus] += 1;
    }
  }

  if (prune) {
    const pruned = await pruneManagedProjections({
      projectionRoot,
      kinds,
      generatedOutputs,
      sourceFilter,
      generatedSources,
    });
    result.pruned += pruned;
  }

  return result;
}

async function collectSources(options: {
  cwd: string;
  cyralisRoot: string;
  projectionRoot: string;
  kind: MemoryProjectionKind;
  sourceFilter: Set<string>;
  skipped: MemoryProjectionSkip[];
}): Promise<SourceDocument[]> {
  const root = join(options.cyralisRoot, options.kind);
  const files = await markdownFiles(root);
  const sources: SourceDocument[] = [];
  for (const sourcePath of files) {
    const sourceRelPath = toPosix(relative(options.cwd, sourcePath));
    if (options.sourceFilter.size > 0 && !options.sourceFilter.has(sourceRelPath)) continue;
    const text = await readFile(sourcePath, "utf8");
    const parsed = parseMarkdownDocument(text);
    const status = stringField(parsed.metadata, "status");
    if (status && STALE_STATUSES.has(status.toLowerCase())) {
      options.skipped.push({ path: sourceRelPath, reason: `status=${status}` });
      continue;
    }
    if (options.kind === "compound") {
      const docType = stringField(parsed.metadata, "doc_type");
      if (!docType || !COMPOUND_TYPES.has(docType)) {
        options.skipped.push({ path: sourceRelPath, reason: "compound doc_type is missing or unsupported" });
        continue;
      }
    }
    if (options.kind === "architecture") {
      const docType = stringField(parsed.metadata, "doc_type");
      if (docType && docType !== "architecture") {
        options.skipped.push({ path: sourceRelPath, reason: `unexpected architecture doc_type=${docType}` });
        continue;
      }
    }
    const id = projectionId(options.kind, parsed.metadata, sourceRelPath);
    const outputPath = join(outputDirectory(options.projectionRoot, options.kind, parsed.metadata), `${id}.md`);
    sources.push({
      kind: options.kind,
      sourcePath,
      sourceRelPath,
      outputPath,
      id,
      content: text,
      metadata: parsed.metadata,
      body: parsed.body,
    });
  }
  return sources;
}

function buildProjection(source: SourceDocument): ProjectionDocument {
  const sourceHash = createHash("sha256").update(source.content).digest("hex").slice(0, 12);
  const sourceTitle = markdownTitle(source.body) || slugFromPath(source.sourceRelPath);
  const slug = stringField(source.metadata, "slug") || slugFromPath(source.sourceRelPath);
  const docType = source.kind === "compound"
    ? stringField(source.metadata, "doc_type") ?? "compound"
    : "architecture";
  const name = projectionName(source.kind, docType, sourceTitle, slug, source.metadata);
  const description = projectionDescription(source.kind, source.metadata, source.body, slug);
  const tags = projectionTags(source.kind, docType, source.metadata, slug);

  const content = [
    "---",
    `id: ${source.id}`,
    `name: ${name}`,
    `description: ${description}`,
    `tags: [${tags.join(", ")}]`,
    `source: ${source.sourceRelPath}`,
    "projection: true",
    `source_sha: ${sourceHash}`,
    "---",
    "",
    `source: ${source.sourceRelPath}`,
    `kind: ${source.kind}`,
    source.kind === "compound" ? `doc_type: ${docType}` : "",
    "",
  ].filter((line) => line !== "").join("\n");

  return {
    sourcePath: source.sourcePath,
    sourceRelPath: source.sourceRelPath,
    outputPath: source.outputPath,
    id: source.id,
    content,
  };
}

async function writeProjection(projection: ProjectionDocument): Promise<"created" | "updated" | "unchanged"> {
  await mkdir(dirname(projection.outputPath), { recursive: true });
  try {
    const current = await readFile(projection.outputPath, "utf8");
    if (current === projection.content) return "unchanged";
    await writeFile(projection.outputPath, projection.content, "utf8");
    return "updated";
  } catch (err) {
    if (!isNotFound(err)) throw err;
    await writeFile(projection.outputPath, projection.content, "utf8");
    return "created";
  }
}

async function pruneManagedProjections(options: {
  projectionRoot: string;
  kinds: MemoryProjectionKind[];
  generatedOutputs: Set<string>;
  sourceFilter: Set<string>;
  generatedSources: Set<string>;
}): Promise<number> {
  let count = 0;
  for (const kind of options.kinds) {
    const files = await markdownFiles(join(options.projectionRoot, kind));
    for (const file of files) {
      if (options.generatedOutputs.has(file)) continue;
      const text = await readFile(file, "utf8");
      const parsed = parseMarkdownDocument(text);
      if (parsed.metadata.projection !== true && String(parsed.metadata.projection) !== "true") continue;
      const source = stringField(parsed.metadata, "source");
      const sourceWasTargeted = options.sourceFilter.size === 0
        || (source !== undefined && options.sourceFilter.has(source));
      const sourceWasRegenerated = source !== undefined && options.generatedSources.has(source);
      if (!sourceWasTargeted || sourceWasRegenerated) continue;
      await rm(file);
      count += 1;
    }
  }
  return count;
}

async function markdownFiles(root: string): Promise<string[]> {
  try {
    const entries = await readdir(root, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const path = join(root, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await markdownFiles(path)));
        continue;
      }
      if (entry.isFile() && entry.name.endsWith(".md")) files.push(path);
    }
    return files.sort();
  } catch (err) {
    if (isNotFound(err)) return [];
    throw err;
  }
}

function parseMarkdownDocument(content: string): { metadata: Record<string, unknown>; body: string } {
  if (!content.startsWith("---")) return { metadata: {}, body: content };
  const end = content.indexOf("\n---", 3);
  if (end === -1) return { metadata: {}, body: content };
  const frontmatter = content.slice(3, end).trim();
  const body = content.slice(end + 4).trim();
  return { metadata: parseFrontmatter(frontmatter), body };
}

function parseFrontmatter(frontmatter: string): Record<string, unknown> {
  const metadata: Record<string, unknown> = {};
  let activeListKey: string | null = null;
  for (const rawLine of frontmatter.split("\n")) {
    const line = rawLine.trimEnd();
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const listMatch = line.match(/^\s*-\s+(.+)$/);
    if (activeListKey && listMatch) {
      const list = metadata[activeListKey];
      if (Array.isArray(list)) list.push(cleanScalar(listMatch[1] ?? ""));
      continue;
    }
    activeListKey = null;
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const rawValue = line.slice(separator + 1).trim();
    if (!rawValue) {
      metadata[key] = [];
      activeListKey = key;
      continue;
    }
    metadata[key] = parseScalar(rawValue);
  }
  return metadata;
}

function parseScalar(raw: string): unknown {
  const value = raw.trim();
  if (value.startsWith("[") && value.endsWith("]")) {
    return value.slice(1, -1).split(",").map((item) => cleanScalar(item)).filter(Boolean);
  }
  if (value === "true") return true;
  if (value === "false") return false;
  return cleanScalar(value);
}

function cleanScalar(raw: string): string {
  return raw.trim().replace(/^['"]/, "").replace(/['"]$/, "");
}

function stringField(metadata: Record<string, unknown>, key: string): string | undefined {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function listField(metadata: Record<string, unknown>, key: string): string[] {
  const value = metadata[key];
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function projectionId(kind: MemoryProjectionKind, metadata: Record<string, unknown>, sourceRelPath: string): string {
  const docType = kind === "compound" ? stringField(metadata, "doc_type") : "architecture";
  const slug = slugify(stringField(metadata, "slug") || slugFromPath(sourceRelPath));
  const hash = createHash("sha256").update(sourceRelPath).digest("hex").slice(0, 8);
  const parts = kind === "compound" ? ["mem", "compound", docType, slug, hash] : ["mem", "arch", slug, hash];
  return parts.filter(Boolean).join("_");
}

function outputDirectory(root: string, kind: MemoryProjectionKind, metadata: Record<string, unknown>): string {
  if (kind === "architecture") return join(root, "architecture");
  return join(root, "compound", stringField(metadata, "doc_type") ?? "unknown");
}

function projectionName(
  kind: MemoryProjectionKind,
  docType: string,
  title: string,
  slug: string,
  metadata: Record<string, unknown>,
): string {
  if (kind === "architecture") {
    if (basenameFromSlug(slug).toLowerCase() === "architecture") return "Architecture: project index";
    return `Architecture: ${stringField(metadata, "scope") || title || slug}`;
  }
  const label = docType.slice(0, 1).toUpperCase() + docType.slice(1);
  return `${label}: ${title || slug}`;
}

function projectionDescription(kind: MemoryProjectionKind, metadata: Record<string, unknown>, body: string, slug: string): string {
  const summary = stringField(metadata, "summary");
  const scope = stringField(metadata, "scope");
  const first = firstParagraph(body);
  const typeDetail = detailFields(metadata).join(", ");
  const raw = summary || scope || first || slug;
  const prefix = kind === "compound" && typeDetail ? `${typeDetail}: ` : "";
  return sanitizeScalar(truncate(`${prefix}${raw}`, 220));
}

function projectionTags(kind: MemoryProjectionKind, docType: string, metadata: Record<string, unknown>, slug: string): string[] {
  const tags = new Set<string>([kind, docType, slugify(slug)]);
  for (const key of ["tags", "depends_on", "implements"]) {
    for (const value of listField(metadata, key)) tags.add(slugify(value));
  }
  for (const key of ["track", "type", "category", "component", "area", "status"]) {
    const value = stringField(metadata, key);
    if (value) tags.add(slugify(value));
  }
  return [...tags].filter(Boolean).slice(0, 24);
}

function detailFields(metadata: Record<string, unknown>): string[] {
  const fields = [];
  for (const key of ["track", "type", "category", "component", "area"]) {
    const value = stringField(metadata, key);
    if (value) fields.push(`${key}=${value}`);
  }
  return fields;
}

function markdownTitle(body: string): string | undefined {
  const match = body.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim();
}

function firstParagraph(body: string): string {
  const lines = body
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("```") && !line.startsWith("---"));
  return lines[0] ?? "";
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 15)).trimEnd()} [truncated]`;
}

function slugFromPath(path: string): string {
  const name = basename(path, extname(path));
  return slugify(name.replace(/^\d{4}-\d{2}-\d{2}-/, ""));
}

function basenameFromSlug(slug: string): string {
  return basename(slug, extname(slug));
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "document";
}

function sanitizeScalar(value: string): string {
  return value.replace(/\s+/g, " ").replace(/,/g, ";").trim();
}

function normalizeKinds(kinds: MemoryProjectionKind[] | undefined): MemoryProjectionKind[] {
  if (!kinds || kinds.length === 0) return ["architecture", "compound"];
  return [...new Set(kinds)];
}

function normalizeSourceFilter(cwd: string, sourcePaths: string[] | undefined): Set<string> {
  const paths = new Set<string>();
  for (const sourcePath of sourcePaths ?? []) {
    const absolute = resolve(cwd, sourcePath);
    paths.add(toPosix(relative(cwd, absolute)));
  }
  return paths;
}

function toPosix(path: string): string {
  return path.split(sep).join("/");
}

function isNotFound(err: unknown): boolean {
  return Boolean(err && typeof err === "object" && "code" in err && err.code === "ENOENT");
}
