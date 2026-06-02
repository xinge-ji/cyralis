import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { ProjectContextEntry } from "./types.js";

export interface LoadProjectContextOptions {
  cwd: string;
  cyralisRoot?: string;
  maxAttentionBytes?: number;
  maxArchitectureIndexBytes?: number;
}

export async function loadProjectContext(options: LoadProjectContextOptions): Promise<ProjectContextEntry[]> {
  const cwd = resolve(options.cwd);
  const cyralisRoot = resolve(cwd, options.cyralisRoot ?? ".cyralis");
  const entries: ProjectContextEntry[] = [];
  const attention = await readLimited(join(cyralisRoot, "attention.md"), options.maxAttentionBytes ?? 12_000);
  if (attention) {
    entries.push({
      path: ".cyralis/attention.md",
      content: attention,
    });
  }
  const architectureIndex = await readLimited(
    join(cyralisRoot, "architecture", "ARCHITECTURE.md"),
    options.maxArchitectureIndexBytes ?? 10_000,
  );
  if (architectureIndex) {
    entries.push({
      path: ".cyralis/architecture/ARCHITECTURE.md",
      content: architectureIndex,
    });
  }
  entries.push({
    title: "Cyralis source roots",
    content: [
      "architecture_source_root: .cyralis/architecture",
      "compound_source_root: .cyralis/compound",
      "memory_projection_root: .cyralis/memory/projections",
      "Full architecture and compound documents are not default context; use recall hints or explicit search/read when relevant.",
    ].join("\n"),
  });
  return entries;
}

async function readLimited(path: string, maxBytes: number): Promise<string | null> {
  try {
    const text = await readFile(path, "utf8");
    return trimToBytes(text.trim(), maxBytes);
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

function trimToBytes(text: string, maxBytes: number): string {
  if (Buffer.byteLength(text, "utf8") <= maxBytes) return text;
  let output = text;
  while (Buffer.byteLength(output, "utf8") > maxBytes && output.length > 0) {
    output = output.slice(0, Math.floor(output.length * 0.9));
  }
  return `${output.trimEnd()}\n[truncated]`;
}

function isNotFound(err: unknown): boolean {
  return Boolean(err && typeof err === "object" && "code" in err && err.code === "ENOENT");
}
