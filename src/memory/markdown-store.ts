import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { RecallHint } from "../core/types.js";
import type { AssistantRecallResult, MemoryEntry, MemoryStore, RecallOptions } from "./types.js";

export interface MarkdownMemoryStoreOptions {
  root: string;
}

export class MarkdownMemoryStore implements MemoryStore {
  readonly root: string;

  constructor(options: MarkdownMemoryStoreOptions) {
    this.root = options.root;
  }

  async recallForUser(text: string, options: RecallOptions = {}): Promise<RecallHint[]> {
    return this.#recall(text, options);
  }

  async recallForAssistant(text: string, options: RecallOptions = {}): Promise<AssistantRecallResult> {
    return { hints: await this.#recall(text, options) };
  }

  async open(id: string): Promise<MemoryEntry | null> {
    const entries = await this.#entries();
    return entries.find((entry) => entry.id === id) ?? null;
  }

  async save(input: Omit<MemoryEntry, "id"> & { id?: string }): Promise<MemoryEntry> {
    await mkdir(this.root, { recursive: true });
    const id = input.id ?? `mem_${Date.now().toString(36)}`;
    const entry: MemoryEntry = { ...input, id };
    const content = [
      "---",
      `id: ${entry.id}`,
      `name: ${entry.name}`,
      `description: ${entry.description}`,
      `tags: [${entry.tags.join(", ")}]`,
      "---",
      "",
      entry.body,
      "",
    ].join("\n");
    const path = join(this.root, `${id}.md`);
    await writeFile(path, content, "utf8");
    return { ...entry, path };
  }

  async #recall(text: string, options: RecallOptions): Promise<RecallHint[]> {
    const limit = options.limit ?? 3;
    const excluded = new Set(options.excludedIds ?? []);
    const tokens = tokenize(text);
    if (tokens.length === 0) return [];
    const scored = [];
    for (const entry of await this.#entries()) {
      if (excluded.has(entry.id)) continue;
      const haystack = tokenize(`${entry.name} ${entry.description} ${entry.tags.join(" ")} ${entry.body}`);
      const score = tokens.filter((token) => haystack.includes(token)).length / tokens.length;
      if (score > 0) scored.push({ entry, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(({ entry, score }) => ({
      id: entry.id,
      name: entry.name,
      description: entry.description,
      score,
    }));
  }

  async #entries(): Promise<MemoryEntry[]> {
    await mkdir(this.root, { recursive: true });
    const names = await readdir(this.root);
    const entries: MemoryEntry[] = [];
    for (const name of names) {
      if (!name.endsWith(".md")) continue;
      const path = join(this.root, name);
      const content = await readFile(path, "utf8");
      const parsed = parseMarkdownMemory(content);
      if (parsed) entries.push({ ...parsed, path });
    }
    return entries;
  }
}

function tokenize(text: string): string[] {
  return [...new Set(text.toLowerCase().split(/[^a-z0-9_-]+/).filter(Boolean))];
}

function parseMarkdownMemory(content: string): MemoryEntry | null {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return null;
  const frontmatter = match[1] ?? "";
  const body = (match[2] ?? "").trim();
  const fields = new Map<string, string>();
  for (const line of frontmatter.split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    fields.set(line.slice(0, idx).trim(), line.slice(idx + 1).trim());
  }
  const id = fields.get("id");
  const name = fields.get("name");
  const description = fields.get("description");
  if (!id || !name || !description) return null;
  return {
    id,
    name,
    description,
    tags: parseTags(fields.get("tags")),
    body,
  };
}

function parseTags(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw.replace(/^\[/, "").replace(/\]$/, "").split(",").map((tag) => tag.trim()).filter(Boolean);
}

