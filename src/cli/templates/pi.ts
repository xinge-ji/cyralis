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

const piExtension = `import { existsSync, readdirSync, readFileSync } from "node:fs";
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
      "root: " + root,
      "config: " + join(root, ".cyralis", "config.yaml"),
      "workflow: " + join(root, ".cyralis", "workflow.md"),
      "host_skill_root: " + join(root, ".pi", "skills"),
      "reference_root: " + join(root, ".cyralis", "reference"),
      "template_root: " + join(root, ".cyralis", "templates"),
      "roadmap_root: " + join(root, ".cyralis", "roadmap"),
      "feature_root: " + join(root, ".cyralis", "features"),
      "issue_root: " + join(root, ".cyralis", "issues"),
      "refactor_root: " + join(root, ".cyralis", "refactors"),
      "memory_root: " + join(root, ".cyralis", "memory"),
      "Use Cyralis recall hints when available. Workflow skills are projected into the active host skill directory; .cyralis stores state, references, templates, and memory. Workflow status is stored in each active work item's work.json.",
      buildWorkflowState(root, event),
      "</cyralis-context>",
    ].join("\\n");

    return {
      systemPrompt: event?.systemPrompt ? event?.systemPrompt + "\\n\\n" + context : context,
    };
  };

  pi.on?.("before_agent_start", inject);
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

function workflowBody(root: string, status: string): string {
  try {
    const text = readFileSync(join(root, ".cyralis", "workflow.md"), "utf8");
    const pattern = /\\[workflow-state:([A-Za-z0-9_-]+)\\]\\s*\\n([\\s\\S]*?)\\n\\s*\\[\\/workflow-state:\\1\\]/g;
    for (const match of text.matchAll(pattern)) {
      if (match[1] === status) return match[2].trim();
    }
  } catch {
    // Fall through to visible degraded breadcrumb.
  }
  return "Refer to .cyralis/workflow.md for current step.";
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
      workflowBody(root, "no_task"),
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
    workflowBody(root, status),
    "</workflow-state>",
  ].join("\\n");
}
`;

const piSkill = `# Cyralis Memory

Use this skill when working with Cyralis project memory.

- .cyralis is the host-neutral state layer.
- .pi is the Pi projection.
- .codex is the Codex projection.
- Memory bodies should stay in Markdown under .cyralis/memory.
- Workflow rules live in .cyralis/workflow.md.
- Workflow skills are full host projections under .pi/skills and .codex/skills.
- .cyralis does not store skill prompt copies.
- Reference docs live in .cyralis/reference.
- Artifact templates live in .cyralis/templates.
- Active workflow status lives in the current work item's work.json.
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
  [".pi/skills/cyralis-memory/SKILL.md", piSkill],
  [".pi/prompts/cyralis-context.md", piPrompt],
  ...hostSkillTemplates(".pi/skills"),
];
