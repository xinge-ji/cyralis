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

const piExtension = `import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

type PiLike = {
  on?: (eventName: string, handler: (...args: unknown[]) => unknown) => void;
};

type PiEvent = {
  systemPrompt?: string;
  cwd?: string;
  sessionId?: string;
  conversationId?: string;
  threadId?: string;
};

export default async function cyralisPiExtension(pi: PiLike) {
  const inject = (...args: unknown[]) => {
    const event = args[0] as PiEvent | undefined;
    const root = findCyralisRoot(event?.cwd || process.cwd());
    if (!root) return undefined;

    const context = [
      "<cyralis-context>",
	      "[session_identity]",
	      "cwd: " + root,
	      "host_skill_root: " + join(root, ".pi", "skills"),
	      "memory_root: " + join(root, ".cyralis", "memory"),
	      "",
	      ...buildProjectContext(root),
	      buildWorkflowState(root, event),
	      "</cyralis-context>",
	    ].join("\\n");

	    return {
	      systemPrompt: event?.systemPrompt ? event?.systemPrompt + "\\n\\n" + context : context,
	    };
	  };

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

function readLimited(file: string, maxChars: number): string | null {
  try {
    const text = readFileSync(file, "utf8").trim();
    if (text.length <= maxChars) return text;
    return text.slice(0, maxChars).trimEnd() + "\\n[truncated]";
  } catch {
    return null;
  }
}

function buildProjectContext(root: string): string[] {
  const lines = [
    "[project_context]",
    "config: " + join(root, ".cyralis", "config.yaml"),
    "workflow: " + join(root, ".cyralis", "workflow.md"),
    "reference_root: " + join(root, ".cyralis", "reference"),
    "template_root: " + join(root, ".cyralis", "templates"),
    "roadmap_root: " + join(root, ".cyralis", "roadmap"),
    "feature_root: " + join(root, ".cyralis", "features"),
    "issue_root: " + join(root, ".cyralis", "issues"),
    "refactor_root: " + join(root, ".cyralis", "refactors"),
    "memory_projection_root: " + join(root, ".cyralis", "memory", "projections"),
    "Use Cyralis recall hints when available. Workflow skills are projected into the active host skill directory; .cyralis stores state, references, templates, and memory. Workflow status is stored in each active work item's work.json.",
    "Full architecture and compound documents are not default context; use recall hints or explicit search/read when relevant.",
  ];
  for (const [label, file, maxChars] of [
    [".cyralis/attention.md", join(root, ".cyralis", "attention.md"), 12000],
    [".cyralis/architecture/ARCHITECTURE.md", join(root, ".cyralis", "architecture", "ARCHITECTURE.md"), 10000],
  ] as const) {
    const content = readLimited(file, maxChars);
    if (!content) continue;
    lines.push("", "--- " + label + " ---", content);
  }
  return lines;
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
  if (containsRecallMarker(payload)) return payload;
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

function recallProjectionHints(root: string, query: string, limit = 3): RecallProjectionHint[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];
  const scored: RecallProjectionHint[] = [];
  for (const file of projectionFiles(join(root, ".cyralis", "memory", "projections"))) {
    const parsed = readProjection(file);
    if (!parsed) continue;
    const haystack = new Set(tokenize([parsed.name, parsed.description, parsed.tags.join(" "), parsed.body].join(" ")));
    if (haystack.size === 0) continue;
    const score = queryTokens.filter((token) => haystack.has(token)).length / queryTokens.length;
    if (score <= 0) continue;
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

function containsRecallMarker(value: unknown, depth = 0): boolean {
  if (depth > 6 || value == null) return false;
  if (typeof value === "string") return value.includes("<cyralis-recall>");
  if (Array.isArray(value)) return value.some((item) => containsRecallMarker(item, depth + 1));
  if (!isRecord(value)) return false;
  return Object.values(value).some((item) => containsRecallMarker(item, depth + 1));
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

function readJson(file: string): Record<string, unknown> | null {
  try {
    const value = JSON.parse(readFileSync(file, "utf8"));
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function currentWorkRef(root: string, event?: PiEvent): string | null {
  const sessions = join(root, ".cyralis", "runtime", "sessions");
  const key = contextKey(event);
  if (key) {
    const data = readJson(join(sessions, key + ".json"));
    const current = data?.current_work;
    if (typeof current === "string" && current) return current;
  }
  try {
    const files = readdirSync(sessions).filter((name) => name.endsWith(".json"));
    if (files.length === 1) {
      const data = readJson(join(sessions, files[0]));
      const current = data?.current_work;
      if (typeof current === "string" && current) return current;
    }
  } catch {
    return null;
  }
  return null;
}

function resolveWorkDir(root: string, ref: string): string | null {
  const direct = resolve(root, ref);
  if (existsSync(join(direct, "work.json"))) return direct;
  for (const folder of ["features", "issues", "refactors", "roadmap"]) {
    const base = join(root, ".cyralis", folder);
    try {
      for (const name of readdirSync(base)) {
        const candidate = join(base, name);
        if ((name === ref || name.endsWith("-" + ref)) && existsSync(join(candidate, "work.json"))) {
          return candidate;
        }
      }
    } catch {
      // Missing work roots are valid in new projects.
    }
  }
  return null;
}

function workflowNext(status: string, mode: string): string {
  if (status === "design") return "continue " + mode + " design/report planning";
  if (status === "implement") return "continue " + mode + " implementation/apply work";
  if (status === "verify") return "run " + mode + " verification/acceptance";
  if (status === "done") return "summarize and clear active work when appropriate";
  return "classify the request and create or activate a work item";
}

function piSkill(mode: string, status: string): string {
  if (mode === "feature") {
    const name = status === "design" ? "cs-feat-design" : status === "implement" ? "cs-feat-impl" : status === "verify" ? "cs-feat-accept" : "cs-feat";
    return ".pi/skills/" + name + "/SKILL.md";
  }
  if (mode === "issue") {
    const name = status === "design" ? "cs-issue-report" : status === "implement" ? "cs-issue-analyze" : status === "verify" ? "cs-issue-fix" : "cs-issue";
    return ".pi/skills/" + name + "/SKILL.md";
  }
  if (mode === "refactor") return ".pi/skills/cs-refactor/SKILL.md";
  if (mode === "roadmap") return ".pi/skills/cs-roadmap/SKILL.md";
  return "-";
}

function repoRelative(root: string, path: string): string {
  const normalizedRoot = resolve(root);
  const normalizedPath = resolve(path);
  return normalizedPath.startsWith(normalizedRoot) ? normalizedPath.slice(normalizedRoot.length + 1).replace(/\\\\/g, "/") : path;
}

function buildWorkflowState(root: string, event?: PiEvent): string {
  const ref = currentWorkRef(root, event);
  if (!ref) {
    return [
      "<workflow-state>",
      "Status: no_task",
      "next: " + workflowNext("no_task", "-"),
      "workflow: .cyralis/workflow.md",
      "</workflow-state>",
    ].join("\\n");
  }
  const workDir = resolveWorkDir(root, ref);
  const work = workDir ? readJson(join(workDir, "work.json")) : null;
  const status = typeof work?.status === "string" ? work.status : "no_task";
  const mode = typeof work?.mode === "string" ? work.mode : "-";
  return [
    "<workflow-state>",
    workDir ? "Work: " + repoRelative(root, workDir) + " (" + status + ")" : "Status: " + status,
    "mode: " + mode,
    "host_skill: " + piSkill(mode, status),
    "next: " + workflowNext(status, mode),
    "workflow: .cyralis/workflow.md",
    "</workflow-state>",
  ].join("\\n");
}
`;

const piPrompt = `# Cyralis Context

Inspect .cyralis/config.yaml and .cyralis/workflow.md before changing project
context, workflow, or memory behavior. Workflow skills are host projections
under .pi/skills or .codex/skills; shared references and templates are under
.cyralis/reference and .cyralis/templates. Active workflow status lives in the current work item's
work.json.
`;

export const piTemplates: Array<[string, string]> = [
  [".pi/settings.json", piSettings],
  [".pi/extensions/cyralis/index.ts", piExtension],
  [".pi/prompts/cyralis-context.md", piPrompt],
  ...hostSkillTemplates(".pi/skills"),
];
