import { hostSkillTemplates } from "./feature-skills.js";

const piSettings = `{
  "enableSkillCommands": true,
  "extensions": [
    "./extensions/cyralis/index.ts"
  ],
  "skills": [
    "./skills"
  ],
  "prompts": [
    "./prompts"
  ]
}`;

const piExtension = `import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

type PiCommandContext = {
  cwd?: string;
  mode?: string;
  ui?: {
    notify?: (message: string, type?: "info" | "warning" | "error") => void;
    custom?: <T>(
      factory: (tui: unknown, theme: unknown, keybindings: unknown, done: (result: T) => void) => unknown,
      options?: unknown,
    ) => Promise<T>;
  };
  sessionManager?: {
    getCwd?: () => string;
    getSessionId?: () => string;
  };
};

type PiLike = {
  on?: (eventName: string, handler: (...args: unknown[]) => unknown) => void;
  registerCommand?: (name: string, options: { description?: string; handler: (args: string, ctx: PiCommandContext) => Promise<void> }) => void;
};

type PiEvent = {
  systemPrompt?: string;
  cwd?: string;
  sessionId?: string;
  conversationId?: string;
  threadId?: string;
};

type PythonExecutable = "python3" | "python";

export default async function cyralisPiExtension(pi: PiLike) {
  const inject = (...args: unknown[]) => {
    const event = args[0] as PiEvent | undefined;
    const root = findCyralisRoot(event?.cwd || process.cwd());
    if (!root) return undefined;

    const context = [
      "<cyralis-context>",
	      "[session_identity]",
	      "cwd: " + root,
	      "",
	      ...buildProjectContext(root),
	      buildWorkflowState(root, event),
	      "</cyralis-context>",
	    ].join("\\n");

	    return {
	      systemPrompt: event?.systemPrompt ? event?.systemPrompt + "\\n\\n" + context : context,
	    };
	  };

	  pi.registerCommand?.("cyralis:work", {
	    description: "Show unfinished Cyralis work items",
	    handler: async (_args: string, ctx: PiCommandContext) => {
	      const root = findCyralisRoot(ctx?.cwd || ctx?.sessionManager?.getCwd?.() || process.cwd());
	      if (!root) {
	        ctx.ui?.notify?.("Cyralis project root not found", "error");
	        return;
	      }
	      const result = loadWorkSummary(root, ctx);
	      if (result.error || !result.summary) {
	        ctx.ui?.notify?.(result.error || "Unable to load Cyralis work summary", "error");
	        return;
	      }
	      const lines = formatWorkSummaryLines(result.summary);
	      if (ctx.mode !== "tui" || !ctx.ui?.custom) {
	        ctx.ui?.notify?.(lines.join("\\n"), "info");
	        return;
	      }
	      await ctx.ui.custom<void>((_tui, _theme, _keybindings, done) => {
	        return new WorkSummaryComponent(lines, () => done(undefined));
	      }, { overlay: true });
	    },
	  });

	  pi.on?.("before_agent_start", inject);
	  pi.on?.("before_provider_request", handleProviderRequest);
	}

function findCyralisRoot(start: string): string | null {
  let cur = resolve(start);
  while (cur !== dirname(cur)) {
    if (existsSync(join(cur, ".cyralis"))) return cur;
    cur = dirname(cur);
  }
  return null;
}

function sanitizeKey(raw: string): string {
  const value = raw.trim().replace(/[^A-Za-z0-9_.-]+/g, "-").replace(/^[-._]+|[-._]+$/g, "");
  return value || "session";
}

function contextKey(event?: PiEvent): string | null {
  for (const value of [event?.sessionId, event?.conversationId, event?.threadId, process.env.CYRALIS_CONTEXT_ID, process.env.PI_SESSION_ID, process.env.SESSION_ID]) {
    if (value) return sanitizeKey(value);
  }
  return null;
}

function buildProjectContext(root: string): string[] {
  return [
    "[project_context]",
    "config: " + join(root, ".cyralis", "config.yaml"),
  ];
}

function pythonExecutable(): PythonExecutable {
  try {
    const result = spawnSync("python3", ["--version"], { encoding: "utf8" });
    if (!result.error) return "python3";
  } catch {
    // fall through
  }
  return "python";
}

type WorkSummaryResult = {
  summary?: Record<string, unknown>;
  error?: string;
};

class WorkSummaryComponent {
  private lines: string[];
  private onClose: () => void;

  constructor(lines: string[], onClose: () => void) {
    this.lines = lines;
    this.onClose = onClose;
  }

  handleInput(data: string): void {
    const code = data.charCodeAt(0);
    if (code === 27 || code === 3 || data === "q") this.onClose();
  }

  render(width: number): string[] {
    const limit = Math.max(20, width || 80);
    return this.lines.map((line) => truncateLine(line, limit));
  }
}

function loadWorkSummary(root: string, ctx?: PiCommandContext): WorkSummaryResult {
  const helper = join(root, ".cyralis", "tools", "work.py");
  if (!existsSync(helper)) return { error: "Cyralis workflow helper missing: " + helper };
  const args = ["-X", "utf8", helper, "--cwd", root];
  const sessionId = ctx?.sessionManager?.getSessionId?.();
  if (sessionId) args.push("--context-key", sessionId);
  args.push("summary", "--json", "--host", "pi");

  let result = spawnSync(pythonExecutable(), args, { cwd: root, encoding: "utf8" });
  if (result.error) {
    return { error: result.error.message || String(result.error) };
  }
  if (result.status !== 0) {
    const message = String(result.stderr || result.stdout || "work.py summary failed").trim();
    return { error: message || "work.py summary failed" };
  }
  try {
    const value = JSON.parse(String(result.stdout || "{}"));
    return isRecord(value) ? { summary: value } : { error: "work.py summary returned invalid JSON" };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

function formatWorkSummaryLines(summary: Record<string, unknown>): string[] {
  const counts = isRecord(summary["counts"]) ? summary["counts"] : {};
  const current = isRecord(summary["current"]) ? summary["current"] : null;
  const items = Array.isArray(summary["items"]) ? summary["items"].filter(isRecord) : [];
  const roadmapItems = Array.isArray(summary["roadmap_items"]) ? summary["roadmap_items"].filter(isRecord) : [];
  const lines = [
    "Cyralis work summary",
    "Open: " + valueText(counts["open"], "0") + " / Total: " + valueText(counts["total"], "0") + " / Done: " + valueText(counts["done"], "0"),
  ];
  if (counts["roadmap_planned"]) {
    lines.push("Roadmap planned: " + valueText(counts["roadmap_planned"], "0") + " / Ready: " + valueText(counts["roadmap_ready"], "0"));
  }
  if (current) {
    lines.push("Active: " + valueText(current["work_root"], "-") + " (" + valueText(current["mode"], "-") + "/" + valueText(current["status"], "-") + ")");
    if (current["next"]) lines.push("Active next: " + valueText(current["next"], ""));
  } else {
    lines.push("Active: none");
  }
  lines.push("");
  if (items.length === 0 && roadmapItems.length === 0) {
    lines.push("No unfinished work items.");
    lines.push("");
    lines.push("Press Escape or q to close");
    return lines;
  }
  if (items.length > 0) {
    lines.push("Unfinished work:");
    for (const item of items) {
      const prefix = item["active"] ? "*" : "-";
      const title = item["title"] ? " - " + valueText(item["title"], "") : "";
      lines.push(prefix + " " + valueText(item["path"], "-") + " (" + valueText(item["mode"], "-") + "/" + valueText(item["status"], "-") + ")" + title);
      if (item["next"]) lines.push("  next: " + valueText(item["next"], ""));
    }
    if (roadmapItems.length > 0) lines.push("");
  }
  if (roadmapItems.length > 0) {
    lines.push("Planned roadmap items:");
    for (const item of roadmapItems) {
      const marker = item["ready"] ? "*" : "-";
      const minimal = item["minimal_loop"] ? " minimal-loop" : "";
      const blockedBy = Array.isArray(item["blocked_by"]) ? item["blocked_by"].map((value) => String(value)).join(", ") : "";
      const suffix = item["ready"] ? " ready" : " blocked by " + blockedBy;
      lines.push(marker + " " + valueText(item["roadmap"], "-") + "/" + valueText(item["slug"], "-") + " (" + valueText(item["status"], "-") + ";" + minimal + suffix + ")");
      if (item["description"]) lines.push("  " + valueText(item["description"], ""));
    }
  }
  lines.push("");
  lines.push("Press Escape or q to close");
  return lines;
}

function valueText(value: unknown, fallback: string): string {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
}

function truncateLine(line: string, width: number): string {
  if (line.length <= width) return line;
  if (width <= 3) return line.slice(0, width);
  return line.slice(0, width - 3) + "...";
}

function handleProviderRequest(event?: Record<string, unknown>): unknown {
  const payload = event?.payload ?? event ?? {};
  const root = findCyralisRoot(process.cwd());
  const nextPayload = root ? appendRecallToPayload(payload, root) : payload;
  dumpProviderPayload(nextPayload);
  return nextPayload === payload ? undefined : nextPayload;
}

function dumpProviderPayload(payload: unknown): undefined {
  const target = process.env.CYRALIS_PI_DUMP_PROVIDER_REQUEST;
  if (!target) return undefined;
  const text = safeJson(payload);
  if (target === "1" || target === "true" || target === "stderr") {
    console.error(text);
    return undefined;
  }
  if (target === "stdout") {
    console.log(text);
    return undefined;
  }
  const file = resolve(target);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text + "\\n", "utf8");
  return undefined;
}

function appendRecallToPayload(payload: unknown, root: string): unknown {
  if (lastUserMessageIsRecall(payload)) return payload;
  const query = extractLastUserText(payload);
  const recall = buildRecallBlock(root, query);
  if (!recall) return payload;
  return appendUserMessage(payload, recall);
}

function appendUserMessage(payload: unknown, content: string): unknown {
  if (!isRecord(payload)) return payload;
  const body = payload.body;
  if (isRecord(body)) {
    const nextBody = appendUserMessage(body, content);
    return nextBody === body ? payload : { ...payload, body: nextBody };
  }
  if (typeof body === "string") {
    try {
      const parsed = JSON.parse(body);
      const nextBody = appendUserMessage(parsed, content);
      return nextBody === parsed ? payload : { ...payload, body: JSON.stringify(nextBody) };
    } catch {
      return payload;
    }
  }
  if (Array.isArray(payload.messages)) {
    return { ...payload, messages: [...payload.messages, { role: "user", content }] };
  }
  if (Array.isArray(payload.input)) {
    return { ...payload, input: [...payload.input, { role: "user", content: [{ type: "input_text", text: content }] }] };
  }
  if (Array.isArray(payload.contents)) {
    return { ...payload, contents: [...payload.contents, { role: "user", parts: [{ text: content }] }] };
  }
  return payload;
}

function extractLastUserText(payload: unknown): string {
  const unwrapped = unwrapBody(payload);
  if (!isRecord(unwrapped)) return textFromContent(unwrapped).slice(0, 12000);
  if (Array.isArray(unwrapped.messages)) {
    for (let index = unwrapped.messages.length - 1; index >= 0; index--) {
      const message = unwrapped.messages[index];
      if (isRecord(message) && message.role === "user") {
        const text = textFromContent(message.content);
        if (text) return text.slice(0, 12000);
      }
    }
  }
  if (Array.isArray(unwrapped.input)) {
    for (let index = unwrapped.input.length - 1; index >= 0; index--) {
      const item = unwrapped.input[index];
      if (isRecord(item) && item.role === "user") {
        const text = textFromContent(item.content);
        if (text) return text.slice(0, 12000);
      }
    }
  }
  if (Array.isArray(unwrapped.contents)) {
    for (let index = unwrapped.contents.length - 1; index >= 0; index--) {
      const item = unwrapped.contents[index];
      if (isRecord(item) && (item.role === "user" || item.role === "USER")) {
        const text = textFromContent(item.parts ?? item.content);
        if (text) return text.slice(0, 12000);
      }
    }
  }
  return textFromContent(unwrapped).slice(0, 12000);
}

function unwrapBody(payload: unknown): unknown {
  if (!isRecord(payload)) return payload;
  if (isRecord(payload.body)) return unwrapBody(payload.body);
  if (typeof payload.body === "string") {
    try {
      return unwrapBody(JSON.parse(payload.body));
    } catch {
      return payload;
    }
  }
  return payload;
}

function textFromContent(value: unknown, depth = 0): string {
  if (depth > 5 || value == null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map((item) => textFromContent(item, depth + 1)).filter(Boolean).join("\\n");
  if (!isRecord(value)) return "";
  if (typeof value.text === "string") return value.text;
  if (typeof value.input_text === "string") return value.input_text;
  if ("content" in value) {
    const text = textFromContent(value.content, depth + 1);
    if (text) return text;
  }
  if ("parts" in value) {
    const text = textFromContent(value.parts, depth + 1);
    if (text) return text;
  }
  return Object.entries(value)
    .filter(([key]) => !["role", "type", "name", "id"].includes(key))
    .map(([, item]) => textFromContent(item, depth + 1))
    .filter(Boolean)
    .join("\\n");
}

function buildRecallBlock(root: string, query: string): string | null {
  const hints = recallProjectionHints(root, query);
  if (hints.length === 0) return null;
  const lines = ["<cyralis-recall>", "[recall]"];
  for (const hint of hints) {
    const source = hint.source ? " | source=" + hint.source : "";
    lines.push("- " + hint.id + " | score=" + hint.score.toFixed(2) + " | " + hint.name + " | " + hint.description + source);
    if (hint.excerpt) lines.push("  excerpt: " + hint.excerpt);
  }
  lines.push("</cyralis-recall>");
  return lines.join("\\n");
}

type RecallProjectionHint = {
  id: string;
  name: string;
  description: string;
  source: string;
  tags: string[];
  body: string;
  score: number;
  excerpt: string;
};

function recallProjectionHints(root: string, query: string, limit = 3, minScore = 0.2): RecallProjectionHint[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];
  const scored: RecallProjectionHint[] = [];
  for (const file of projectionFiles(join(root, ".cyralis", "memory", "projections"))) {
    const parsed = readProjection(file);
    if (!parsed) continue;
    const haystack = new Set(tokenize([parsed.name, parsed.description, parsed.tags.join(" "), parsed.body].join(" ")));
    if (haystack.size === 0) continue;
    const score = queryTokens.filter((token) => haystack.has(token)).length / queryTokens.length;
    if (score < minScore) continue;
    scored.push({ ...parsed, score, excerpt: compactExcerpt(parsed.body) });
  }
  return scored.sort((left, right) => right.score - left.score).slice(0, limit);
}

function projectionFiles(root: string): string[] {
  try {
    const files: string[] = [];
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      const path = join(root, entry.name);
      if (entry.isDirectory()) files.push(...projectionFiles(path));
      if (entry.isFile() && entry.name.endsWith(".md")) files.push(path);
    }
    return files.sort();
  } catch {
    return [];
  }
}

function readProjection(file: string): Omit<RecallProjectionHint, "score" | "excerpt"> | null {
  try {
    const text = readFileSync(file, "utf8");
    if (!text.startsWith("---\\n")) return null;
    const end = text.indexOf("\\n---", 4);
    if (end === -1) return null;
    const fields: Record<string, string> = {};
    for (const line of text.slice(4, end).split(/\\r?\\n/)) {
      const idx = line.indexOf(":");
      if (idx === -1) continue;
      fields[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
    if (fields.projection !== "true") return null;
    if (!fields.id || !fields.name || !fields.description) return null;
    return {
      id: fields.id,
      name: fields.name,
      description: fields.description,
      source: fields.source ?? "",
      tags: parseTags(fields.tags),
      body: text.slice(end + 4).trim(),
    };
  } catch {
    return null;
  }
}

function parseTags(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw.replace(/^\\[/, "").replace(/\\]$/, "").split(",").map((tag) => tag.trim()).filter(Boolean);
}

function compactExcerpt(body: string, maxChars = 420): string {
  const marker = "Search excerpt:";
  const raw = body.includes(marker) ? body.split(marker, 2)[1] : body;
  const text = raw.split(/\\r?\\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("source:") && !line.startsWith("kind:") && !line.startsWith("doc_type:"))
    .join(" ")
    .replace(/\\s+/g, " ")
    .trim();
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars).trimEnd() + "...";
}

function tokenize(text: string): string[] {
  const tokens = new Set<string>();
  for (const match of String(text ?? "").toLowerCase().matchAll(/[\\p{L}\\p{N}_-]+/gu)) {
    const token = match[0];
    if (!token) continue;
    tokens.add(token);
    const cjk = [...token].filter(isCjk).join("");
    for (const size of [2, 3]) {
      if (cjk.length < size) continue;
      for (let index = 0; index <= cjk.length - size; index++) tokens.add(cjk.slice(index, index + size));
    }
  }
  return [...tokens];
}

function isCjk(ch: string): boolean {
  return /[\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\p{Script=Hangul}]/u.test(ch);
}

function lastUserMessageIsRecall(payload: unknown): boolean {
  const unwrapped = unwrapBody(payload);
  if (!isRecord(unwrapped)) return false;
  if (Array.isArray(unwrapped.messages)) return lastUserEntryIsRecall(unwrapped.messages);
  if (Array.isArray(unwrapped.input)) return lastUserEntryIsRecall(unwrapped.input);
  if (Array.isArray(unwrapped.contents)) return lastUserEntryIsRecall(unwrapped.contents);
  return false;
}

function lastUserEntryIsRecall(items: unknown[]): boolean {
  for (let index = items.length - 1; index >= 0; index--) {
    const item = items[index];
    if (!isRecord(item)) continue;
    if (item.role !== "user" && item.role !== "USER") continue;
    return textFromContent(item.content ?? item.parts).includes("<cyralis-recall>");
  }
  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function safeJson(value: unknown): string {
  const seen = new WeakSet<object>();
  return JSON.stringify(value, (_key, item) => {
    if (!item || typeof item !== "object") return item;
    if (seen.has(item)) return "[Circular]";
    seen.add(item);
    return item;
  }, 2);
}

function buildWorkflowState(root: string, event?: PiEvent): string {
  const helper = join(root, ".cyralis", "tools", "work.py");
  if (!existsSync(helper)) {
    return [
      "<workflow-state>",
      "Status: no_task",
      "Cyralis workflow helper missing: " + helper,
      "</workflow-state>",
    ].join("\\n");
  }
  const args = ["-X", "utf8", helper, "--cwd", root];
  const key = contextKey(event);
  if (key) args.push("--context-key", key);
  args.push("breadcrumb", "--host", "pi");
  let result = spawnSync(pythonExecutable(), args, { cwd: root, encoding: "utf8" });
  if (!result.error && result.status === 0 && String(result.stdout || "").trim()) {
    return String(result.stdout).trim();
  }
  const message = result.error?.message || String(result.stderr || result.stdout || "work.py breadcrumb failed").trim();
  return [
    "<workflow-state>",
    "Status: no_task",
    "Could not resolve Cyralis workflow state: " + message,
    "</workflow-state>",
  ].join("\\n");
}
`;

const piPrompt = `# Cyralis Context

Inspect .cyralis/config.yaml and resolve workflow through
.cyralis/tools/work.py before changing project context, workflow, or memory
behavior. Workflow skills are host projections under .pi/skills or
.codex/skills; shared references and templates are under .cyralis/reference
and .cyralis/templates. Active workflow status lives in the current work item's
work.json.
`;

export const piTemplates: Array<[string, string]> = [
  [".pi/settings.json", piSettings],
  [".pi/extensions/cyralis/index.ts", piExtension],
  [".pi/prompts/cyralis-context.md", piPrompt],
  ...hostSkillTemplates(".pi/skills"),
];
