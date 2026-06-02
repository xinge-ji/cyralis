import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { collectTemplates } from "../dist/cli/templates.js";

test("pi template injects Cyralis context as a hidden system prompt", () => {
  const template = collectTemplates(["pi"]).get(".pi/extensions/cyralis/index.ts");

  assert.ok(template, "expected the Pi extension template to exist");
  assert.match(template, /before_agent_start/);
  assert.match(template, /systemPrompt:/);
  assert.match(template, /workflow:/);
  assert.match(template, /\[session_identity\]/);
  assert.match(template, /\[project_context\]/);
  assert.match(template, /host_skill_root:/);
  assert.match(template, /reference_root:/);
  assert.match(template, /template_root:/);
  assert.match(template, /memory_root:/);
  assert.match(template, /feature_root:/);
  assert.ok(!template.includes("messages: ["), "template should not use an unsupported messages array");
  assert.ok(!template.includes('pi.on?.("input", inject);'), "template should not hook input for the context injection");
});

test("core templates install host-neutral workflow assets", () => {
  const templates = collectTemplates([]);

  assert.ok(!templates.get(".cyralis/prompts/feature/index.md"), "feature prompt copy should not be installed twice");
  assert.ok(!templates.get(".cyralis/prompts/feature/design.md"), "feature prompt copy should not be installed twice");
  assert.ok(!templates.get(".cyralis/prompts/feature/implement.md"), "feature prompt copy should not be installed twice");
  assert.ok(!templates.get(".cyralis/prompts/feature/accept.md"), "feature prompt copy should not be installed twice");
  assert.ok(![...templates.keys()].some((path) => path.startsWith(".cyralis/skills/")), "core install should not duplicate host skill projections");
  assert.ok(templates.get(".cyralis/attention.md"), "expected attention template");
  assert.ok(templates.get(".cyralis/architecture/ARCHITECTURE.md"), "expected architecture template");
  assert.ok(templates.has(".cyralis/memory/projections/.gitkeep"), "expected memory projection root");
  assert.ok(templates.get(".cyralis/tools/search-yaml.py"), "expected search-yaml tool");
  assert.ok(templates.get(".cyralis/tools/validate-yaml.py"), "expected validate-yaml tool");
  assert.ok(templates.get(".cyralis/tools/work.py"), "expected workflow state helper");
  assert.ok(templates.get(".cyralis/reference/shared-conventions.md"), "expected shared reference");
  assert.ok(templates.get(".cyralis/reference/decision-hygiene.md"), "expected decision hygiene reference");
  assert.ok(templates.get(".cyralis/reference/feature-workflow.md"), "expected feature reference");
  assert.ok(templates.get(".cyralis/reference/work-json.md"), "expected work json reference");
  assert.ok(templates.get(".cyralis/reference/tools.md"), "expected tools reference");
  assert.ok(templates.get(".cyralis/reference/code-dimensions.md"), "expected code dimensions reference");
  assert.ok(templates.get(".cyralis/templates/feature/work.json"), "expected feature work json template");
  assert.ok(templates.get(".cyralis/templates/issue/work.json"), "expected issue work json template");
  assert.ok(templates.get(".cyralis/templates/refactor/work.json"), "expected refactor work json template");
  assert.ok(!templates.get(".cyralis/templates/feature/design.md"), "feature design markdown template should not be installed");
  assert.ok(!templates.get(".cyralis/templates/feature/checklist.yaml"), "feature checklist yaml template should not be installed");
  assert.ok(!templates.get(".cyralis/templates/feature/acceptance.md"), "feature acceptance markdown template should not be installed");

  const workflow = templates.get(".cyralis/workflow.md");
  assert.ok(workflow, "expected workflow template");
  assert.match(workflow, /\[workflow-state:no_task\]/);
  assert.match(workflow, /\[workflow-state:design\]/);
  assert.match(workflow, /\[workflow-state:implement\]/);
  assert.match(workflow, /\[workflow-state:verify\]/);
  assert.match(workflow, /\.codex\/skills\/cs-feat-design\/SKILL\.md/);
  assert.match(workflow, /\.pi\/skills\/cs-feat-design\/SKILL\.md/);
  assert.doesNotMatch(workflow, /\.cyralis\/skills/);
});

test("feature skills preserve CodeStable-style phase boundaries", () => {
  const templates = collectTemplates(["codex"]);
  const index = templates.get(".codex/skills/cs-feat/SKILL.md");
  const design = templates.get(".codex/skills/cs-feat-design/SKILL.md");
  const implement = templates.get(".codex/skills/cs-feat-impl/SKILL.md");
  const accept = templates.get(".codex/skills/cs-feat-accept/SKILL.md");

  assert.ok(index);
  assert.ok(design);
  assert.ok(implement);
  assert.ok(accept);
  assert.match(index, /本技能不写代码不写文档，只做一件事/);
  assert.match(design, /feature 流程阶段 1/);
  assert.match(design, /第 2\.5 节"结构健康度与微重构"是固定步骤/);
  assert.match(implement, /方案文件够不够撑实现/);
  assert.match(implement, /写代码时的三条姿态/);
  assert.match(accept, /验收闭环/);
  assert.match(accept, /跟 design 的章节强依赖/);
  assert.match(design, /work\.json\.artifacts\.design\.approval/);
  assert.doesNotMatch(design, /Cyralis 投影说明/);
  assert.doesNotMatch(design, /Cyralis 状态写入点/);
  assert.doesNotMatch(design, /status=approved/);
});

test("codex hook exposes workflow and skill source paths", () => {
  const hook = collectTemplates(["codex"]).get(".codex/hooks/inject-context-memory.py");

  assert.ok(hook, "expected codex hook template");
  assert.match(hook, /workflow = root \/ "\.cyralis" \/ "workflow\.md"/);
  assert.match(hook, /skills = root \/ "\.codex" \/ "skills"/);
  assert.match(hook, /\[session_identity\]/);
  assert.match(hook, /\[project_context\]/);
  assert.match(hook, /host_skill_root:/);
  assert.match(hook, /reference = root \/ "\.cyralis" \/ "reference"/);
  assert.match(hook, /templates = root \/ "\.cyralis" \/ "templates"/);
  assert.match(hook, /features = root \/ "\.cyralis" \/ "features"/);
  assert.match(hook, /attention = root \/ "\.cyralis" \/ "attention\.md"/);
  assert.match(hook, /architecture_index = root \/ "\.cyralis" \/ "architecture" \/ "ARCHITECTURE\.md"/);
  assert.match(hook, /memory_projection_root:/);
  assert.match(hook, /Workflow status is stored in each active work item's work\.json/);
  assert.match(hook, /work\.py/);
  assert.match(hook, /<workflow-state>/);
  assert.doesNotMatch(hook, /\[system_core\]/);
  assert.doesNotMatch(hook, /\[recent_chat\]/);
  assert.doesNotMatch(hook, /\[current_user\]/);
});

test("pi extension injects dynamic workflow state", () => {
  const template = collectTemplates(["pi"]).get(".pi/extensions/cyralis/index.ts");

  assert.ok(template, "expected pi extension template");
  assert.match(template, /buildWorkflowState/);
  assert.match(template, /buildProjectContext/);
  assert.match(template, /memory_projection_root:/);
  assert.match(template, /\.cyralis\/attention\.md/);
  assert.match(template, /\.cyralis\/architecture\/ARCHITECTURE\.md/);
  assert.match(template, /before_provider_request/);
  assert.match(template, /CYRALIS_PI_DUMP_PROVIDER_REQUEST/);
  assert.match(template, /return undefined/);
  assert.match(template, /currentWorkRef/);
  assert.match(template, /\.pi\/skills/);
  assert.match(template, /<workflow-state>/);
});

test("pi cyralis-memory skill has required frontmatter", () => {
  const skill = collectTemplates(["pi"]).get(".pi/skills/cyralis-memory/SKILL.md");

  assert.ok(skill, "expected cyralis-memory Pi skill");
  assert.match(skill, /^---\nname: cyralis-memory\n/m);
  assert.match(skill, /^description: Use Cyralis context and memory boundaries/m);
});

test("work helper resolves session-scoped active work and gated transitions", () => {
  const templates = collectTemplates([]);
  const dir = mkdtempSync(join(tmpdir(), "cyralis-work-"));
  const helper = join(dir, ".cyralis", "tools", "work.py");
  const workflow = join(dir, ".cyralis", "workflow.md");
  const featureDir = join(dir, ".cyralis", "features", "2026-06-01-demo-feature");
  const issueDir = join(dir, ".cyralis", "issues", "2026-06-01-demo-issue");

  mkdirSync(join(dir, ".cyralis", "tools"), { recursive: true });
  mkdirSync(featureDir, { recursive: true });
  mkdirSync(issueDir, { recursive: true });
  writeFileSync(helper, templates.get(".cyralis/tools/work.py"), "utf8");
  writeFileSync(workflow, templates.get(".cyralis/workflow.md"), "utf8");
  writeFileSync(join(featureDir, "demo-feature-checklist.yaml"), [
    "feature: 2026-06-01-demo-feature",
    "steps:",
    "  - action: \"step one\"",
    "    exit_signal: \"done\"",
    "    status: pending",
    "checks: []",
    "",
  ].join("\n"), "utf8");
  writeFileSync(join(featureDir, "work.json"), JSON.stringify({
    schema: 1,
    id: "demo-feature",
    mode: "feature",
    status: "design",
    title: "Demo feature",
    slug: "demo-feature",
    root: ".cyralis/features/2026-06-01-demo-feature",
    parent: null,
    artifacts: {
      design: { path: "demo-feature-design.md", approval: "approved" },
      checklist: { path: "demo-feature-checklist.yaml" },
      implementation: { done: false },
      acceptance: { path: "demo-feature-acceptance.md", result: null },
    },
  }, null, 2), "utf8");
  writeFileSync(join(issueDir, "work.json"), JSON.stringify({
    schema: 1,
    id: "demo-issue",
    mode: "issue",
    status: "design",
    title: "Demo issue",
    slug: "demo-issue",
    root: ".cyralis/issues/2026-06-01-demo-issue",
    parent: null,
    artifacts: {
      report: { path: "demo-issue-report.md", confirmed: true },
      analysis: { path: "demo-issue-analysis.md", confirmed: false, skipped: false },
      fix: { path: "demo-issue-fix-note.md", result: null, quick_lane: false },
    },
  }, null, 2), "utf8");

  runPython(helper, ["--cwd", dir, "--context-key", "s1", "activate", ".cyralis/features/2026-06-01-demo-feature"]);
  runPython(helper, ["--cwd", dir, "--context-key", "s2", "activate", ".cyralis/issues/2026-06-01-demo-issue"]);

  const s1 = runPython(helper, ["--cwd", dir, "--context-key", "s1", "resolve", "--json"]);
  assert.equal(JSON.parse(s1.stdout).mode, "feature");
  const s2 = runPython(helper, ["--cwd", dir, "--context-key", "s2", "resolve", "--json"]);
  assert.equal(JSON.parse(s2.stdout).mode, "issue");

  const ambiguous = runPython(helper, ["--cwd", dir, "resolve", "--json"], { allowFailure: true });
  assert.equal(JSON.parse(ambiguous.stdout).status, "no_task");
  assert.match(JSON.parse(ambiguous.stdout).reason, /ambiguous/);

  const transition = runPython(helper, ["--cwd", dir, "transition", ".cyralis/features/2026-06-01-demo-feature", "implement"]);
  assert.equal(JSON.parse(transition.stdout).ok, true);
});

function runPython(script, args, options = {}) {
  const result = spawnSync("python3", [script, ...args], {
    encoding: "utf8",
  });
  if (!options.allowFailure && result.status !== 0) {
    throw new Error(`python failed (${result.status})\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  }
  return result;
}

test("host feature skills are full prompt projections", () => {
  const codexDesign = collectTemplates(["codex"]).get(".codex/skills/cs-feat-design/SKILL.md");
  const piDesign = collectTemplates(["pi"]).get(".pi/skills/cs-feat-design/SKILL.md");

  assert.ok(codexDesign, "expected codex feature design skill");
  assert.ok(piDesign, "expected pi feature design skill");
  assert.match(codexDesign, /name: cs-feat-design/);
  assert.match(codexDesign, /# cs-feat-design/);
  assert.match(codexDesign, /feature 流程阶段 1/);
  assert.ok(!codexDesign.includes("Load the source prompt"), "codex skill should not be a thin forwarder");
  assert.ok(!codexDesign.includes("name: cyralis-feature-design"), "codex skill should preserve CodeStable skill identity");
  assert.match(piDesign, /name: cs-feat-design/);
  assert.match(piDesign, /# cs-feat-design/);
  assert.match(piDesign, /feature 流程阶段 1/);
  assert.doesNotMatch(codexDesign, /Cyralis 投影说明/);
  assert.doesNotMatch(piDesign, /Cyralis 投影说明/);
});

test("referenced CodeStable skills are projected for hosts", () => {
  const templates = collectTemplates(["codex", "pi"]);
  const featureSkills = [
    templates.get(".codex/skills/cs-feat/SKILL.md"),
    templates.get(".codex/skills/cs-feat-design/SKILL.md"),
    templates.get(".codex/skills/cs-feat-impl/SKILL.md"),
    templates.get(".codex/skills/cs-feat-accept/SKILL.md"),
  ].join("\n");

  const referencedSkills = new Set(featureSkills.match(/cs-[a-z0-9-]+/g));
  for (const skill of referencedSkills) {
    assert.ok(templates.get(`.codex/skills/${skill}/SKILL.md`), `expected codex projection for ${skill}`);
    assert.ok(templates.get(`.pi/skills/${skill}/SKILL.md`), `expected pi projection for ${skill}`);
  }
});

test("all skill-like references have host skill projections", () => {
  const templates = collectTemplates(["codex", "pi"]);
  const allText = [...templates.values()].join("\n");
  const referencedSkills = new Set(allText.match(/cs-[a-z0-9-]+/g) ?? []);

  for (const skill of referencedSkills) {
    assert.ok(templates.get(`.codex/skills/${skill}/SKILL.md`), `expected codex projection for ${skill}`);
    assert.ok(templates.get(`.pi/skills/${skill}/SKILL.md`), `expected pi projection for ${skill}`);
  }
});

test("source doc writer skills sync memory projections", () => {
  const templates = collectTemplates(["codex"]);
  const shared = templates.get(".cyralis/reference/shared-conventions.md");
  const tools = templates.get(".cyralis/reference/tools.md");
  const compoundWriters = ["cs-learn", "cs-trick", "cs-decide", "cs-explore"];

  assert.match(shared, /cyralis memory sync/);
  assert.match(tools, /cyralis memory sync --kind compound/);
  for (const skill of compoundWriters) {
    const body = templates.get(`.codex/skills/${skill}/SKILL.md`);
    assert.ok(body, `expected ${skill} template`);
    assert.match(body, /cyralis memory sync --kind compound --source/);
  }

  assert.match(templates.get(".codex/skills/cs-arch/SKILL.md"), /cyralis memory sync --kind architecture/);
  assert.match(templates.get(".codex/skills/cs-feat-accept/SKILL.md"), /cyralis memory sync --kind architecture/);
});
