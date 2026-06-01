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

const piExtension = `import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

type PiLike = {
  on?: (eventName: string, handler: (...args: unknown[]) => unknown) => void;
};

export default async function cyralisPiExtension(pi: PiLike) {
  const inject = (...args: unknown[]) => {
    const event = args[0] as { systemPrompt?: string } | undefined;
    const root = findCyralisRoot(process.cwd());
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
