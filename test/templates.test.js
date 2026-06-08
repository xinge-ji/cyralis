import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { collectTemplates } from "../dist/cli/templates.js";

test("pi template injects Cyralis context as a hidden system prompt", () => {
  const template = collectTemplates(["pi"]).get(
    ".pi/extensions/cyralis/index.ts",
  );

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
  assert.doesNotMatch(
    template,
    /result\.messages\s*=/,
    "template should not return an unsupported before_agent_start messages array",
  );
  assert.ok(
    !template.includes('pi.on?.("input", inject);'),
    "template should not hook input for the context injection",
  );
});

test("core templates install host-neutral workflow assets", () => {
  const templates = collectTemplates([]);

  assert.ok(
    !templates.get(".cyralis/prompts/feature/index.md"),
    "feature prompt copy should not be installed twice",
  );
  assert.ok(
    !templates.get(".cyralis/prompts/feature/design.md"),
    "feature prompt copy should not be installed twice",
  );
  assert.ok(
    !templates.get(".cyralis/prompts/feature/implement.md"),
    "feature prompt copy should not be installed twice",
  );
  assert.ok(
    !templates.get(".cyralis/prompts/feature/accept.md"),
    "feature prompt copy should not be installed twice",
  );
  assert.ok(
    ![...templates.keys()].some((path) => path.startsWith(".cyralis/skills/")),
    "core install should not duplicate host skill projections",
  );
  assert.ok(
    templates.get(".cyralis/attention.md"),
    "expected attention template",
  );
  assert.ok(
    templates.get(".cyralis/architecture/ARCHITECTURE.md"),
    "expected architecture template",
  );
  assert.ok(
    templates.has(".cyralis/memory/projections/.gitkeep"),
    "expected memory projection root",
  );
  assert.ok(
    templates.get(".cyralis/tools/search-yaml.py"),
    "expected search-yaml tool",
  );
  assert.ok(
    templates.get(".cyralis/tools/validate-yaml.py"),
    "expected validate-yaml tool",
  );
  assert.ok(
    templates.get(".cyralis/tools/work.py"),
    "expected workflow state helper",
  );
  assert.match(templates.get(".cyralis/tools/work.py"), /next:/);
  assert.ok(
    templates.get(".cyralis/reference/shared-conventions.md"),
    "expected shared reference",
  );
  assert.ok(
    templates.get(".cyralis/reference/decision-hygiene.md"),
    "expected decision hygiene reference",
  );
  assert.ok(
    templates.get(".cyralis/reference/debugging-governance.md"),
    "expected debugging governance reference",
  );
  assert.ok(
    templates.get(".cyralis/reference/feature-workflow.md"),
    "expected feature reference",
  );
  assert.ok(
    templates.get(".cyralis/reference/work-json.md"),
    "expected work json reference",
  );
  assert.ok(
    templates.get(".cyralis/reference/tools.md"),
    "expected tools reference",
  );
  assert.ok(
    templates.get(".cyralis/reference/code-dimensions.md"),
    "expected code dimensions reference",
  );
  assert.ok(
    templates.get(".cyralis/templates/feature/work.json"),
    "expected feature work json template",
  );
  assert.ok(
    templates.get(".cyralis/templates/issue/work.json"),
    "expected issue work json template",
  );
  assert.ok(
    templates.get(".cyralis/templates/refactor/work.json"),
    "expected refactor work json template",
  );
  assert.ok(
    templates.has(".cyralis/audits/.gitkeep"),
    "expected audits root",
  );
  assert.ok(
    !templates.get(".cyralis/templates/feature/design.md"),
    "feature design markdown template should not be installed",
  );
  assert.ok(
    !templates.get(".cyralis/templates/feature/checklist.yaml"),
    "feature checklist yaml template should not be installed",
  );
  assert.ok(
    !templates.get(".cyralis/templates/feature/acceptance.md"),
    "feature acceptance markdown template should not be installed",
  );

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

test("feature skills preserve cyralis-style phase boundaries", () => {
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

test("arch review skill is cyralis-native", () => {
  const templates = collectTemplates(["codex", "pi"]);
  const codexSkill = templates.get(".codex/skills/cs-arch-review/SKILL.md");
  const piSkill = templates.get(".pi/skills/cs-arch-review/SKILL.md");
  const reference = templates.get(".codex/skills/cs-arch-review/reference.md");

  assert.ok(codexSkill, "expected codex arch review skill");
  assert.ok(piSkill, "expected pi arch review skill");
  assert.ok(reference, "expected arch review reference");
  assert.match(codexSkill, /name: cs-arch-review/);
  assert.match(codexSkill, /\.cyralis\/audits/);
  assert.match(codexSkill, /cs-refactor/);
  assert.match(codexSkill, /cs-roadmap/);
  assert.match(codexSkill, /cs-decide/);
  assert.doesNotMatch(codexSkill, /Tailwind via CDN/);
  assert.doesNotMatch(codexSkill, /xdg-open/);
  assert.doesNotMatch(reference, /docs\/adr/);
});

test("codex hook exposes workflow and skill source paths", () => {
  const hook = collectTemplates(["codex"]).get(
    ".codex/hooks/inject-context-memory.py",
  );

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
  assert.match(
    hook,
    /architecture_index = root \/ "\.cyralis" \/ "architecture" \/ "ARCHITECTURE\.md"/,
  );
  assert.match(hook, /memory_projection_root:/);
  assert.match(hook, /def recall_projection_hints/);
  assert.match(hook, /<cyralis-recall>/);
  assert.match(
    hook,
    /Workflow status is stored in each active work item's work\.json/,
  );
  assert.match(hook, /work\.py/);
  assert.match(hook, /<workflow-state>/);
  assert.doesNotMatch(hook, /\[system_core\]/);
  assert.doesNotMatch(hook, /\[recent_chat\]/);
  assert.doesNotMatch(hook, /\[current_user\]/);
});

test("pi extension injects dynamic workflow state", () => {
  const template = collectTemplates(["pi"]).get(
    ".pi/extensions/cyralis/index.ts",
  );
  const templates = collectTemplates(["pi"]);

  assert.ok(template, "expected pi extension template");
  assert.match(template, /buildWorkflowState/);
  assert.match(template, /buildProjectContext/);
  assert.match(template, /memory_projection_root:/);
  assert.match(template, /\.cyralis\/attention\.md/);
  assert.match(template, /\.cyralis\/architecture\/ARCHITECTURE\.md/);
  assert.match(template, /before_provider_request/);
  assert.match(template, /appendRecallToPayload/);
  assert.match(template, /<cyralis-recall>/);
  assert.match(template, /CYRALIS_PI_DUMP_PROVIDER_REQUEST/);
  assert.match(template, /return undefined/);
  assert.match(template, /currentWorkRef/);
  assert.match(template, /\.pi\/skills/);
  assert.match(template, /<workflow-state>/);
  assert.match(template, /next:/);
  assert.ok(
    !templates.get(".pi/skills/cyralis-memory/SKILL.md"),
    "memory is injected by Pi hooks, not a standalone skill",
  );
});

test("codex hook injects projection recall hints from user prompt", () => {
  const templates = collectTemplates(["codex"]);
  const dir = mkdtempSync(join(tmpdir(), "cyralis-codex-recall-"));
  const hook = join(dir, ".codex", "hooks", "inject-context-memory.py");
  const projectionDir = join(
    dir,
    ".cyralis",
    "memory",
    "projections",
    "compound",
    "learning",
  );

  mkdirSync(join(dir, ".codex", "hooks"), { recursive: true });
  mkdirSync(projectionDir, { recursive: true });
  mkdirSync(join(dir, ".cyralis", "tools"), { recursive: true });
  writeFileSync(
    hook,
    templates.get(".codex/hooks/inject-context-memory.py"),
    "utf8",
  );
  writeFileSync(
    join(dir, ".cyralis", "attention.md"),
    "Project attention",
    "utf8",
  );
  writeFileSync(
    join(projectionDir, "learning_proxy.md"),
    [
      "---",
      "id: learning_proxy",
      "name: learning proxy",
      "description: Vite proxy target port failures.",
      "tags: [vite, proxy]",
      "source: .cyralis/compound/2026-06-02-learning-vite-proxy.md",
      "projection: true",
      "---",
      "",
      "source: .cyralis/compound/2026-06-02-learning-vite-proxy.md",
      "kind: compound",
      "doc_type: learning",
      "",
    ].join("\n"),
    "utf8",
  );

  const result = spawnSync("python3", ["-X", "utf8", hook], {
    cwd: dir,
    input: JSON.stringify({ cwd: dir, prompt: "vite proxy 怎么处理" }),
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /<cyralis-recall>/);
  assert.match(result.stdout, /learning_proxy/);
  assert.match(
    result.stdout,
    /source=\.cyralis\/compound\/2026-06-02-learning-vite-proxy\.md/,
  );
  assert.doesNotMatch(result.stdout, /excerpt:/);
  assert.doesNotMatch(result.stdout, /Open the source document/);
});

test("work helper resolves session-scoped active work and gated transitions", () => {
  const templates = collectTemplates([]);
  const dir = mkdtempSync(join(tmpdir(), "cyralis-work-"));
  const helper = join(dir, ".cyralis", "tools", "work.py");
  const workflow = join(dir, ".cyralis", "workflow.md");
  const featureDir = join(
    dir,
    ".cyralis",
    "features",
    "2026-06-01-demo-feature",
  );
  const issueDir = join(dir, ".cyralis", "issues", "2026-06-01-demo-issue");

  mkdirSync(join(dir, ".cyralis", "tools"), { recursive: true });
  mkdirSync(featureDir, { recursive: true });
  mkdirSync(issueDir, { recursive: true });
  writeFileSync(helper, templates.get(".cyralis/tools/work.py"), "utf8");
  writeFileSync(workflow, templates.get(".cyralis/workflow.md"), "utf8");
  writeFileSync(
    join(featureDir, "demo-feature-checklist.yaml"),
    [
      "feature: 2026-06-01-demo-feature",
      "steps:",
      '  - action: "step one"',
      '    exit_signal: "done"',
      "    status: pending",
      "checks: []",
      "",
    ].join("\n"),
    "utf8",
  );
  writeFileSync(
    join(featureDir, "work.json"),
    JSON.stringify(
      {
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
      },
      null,
      2,
    ),
    "utf8",
  );
  writeFileSync(
    join(issueDir, "work.json"),
    JSON.stringify(
      {
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
          analysis: {
            path: "demo-issue-analysis.md",
            confirmed: false,
            skipped: false,
          },
          fix: {
            path: "demo-issue-fix-note.md",
            result: null,
            quick_lane: false,
          },
        },
      },
      null,
      2,
    ),
    "utf8",
  );

  runPython(helper, [
    "--cwd",
    dir,
    "--context-key",
    "s1",
    "activate",
    ".cyralis/features/2026-06-01-demo-feature",
  ]);
  runPython(helper, [
    "--cwd",
    dir,
    "--context-key",
    "s2",
    "activate",
    ".cyralis/issues/2026-06-01-demo-issue",
  ]);

  const s1 = runPython(helper, [
    "--cwd",
    dir,
    "--context-key",
    "s1",
    "resolve",
    "--json",
  ]);
  assert.equal(JSON.parse(s1.stdout).mode, "feature");
  const s2 = runPython(helper, [
    "--cwd",
    dir,
    "--context-key",
    "s2",
    "resolve",
    "--json",
  ]);
  assert.equal(JSON.parse(s2.stdout).mode, "issue");

  const ambiguous = runPython(helper, ["--cwd", dir, "resolve", "--json"], {
    allowFailure: true,
  });
  assert.equal(JSON.parse(ambiguous.stdout).status, "no_task");
  assert.match(JSON.parse(ambiguous.stdout).reason, /ambiguous/);

  const transition = runPython(helper, [
    "--cwd",
    dir,
    "transition",
    ".cyralis/features/2026-06-01-demo-feature",
    "implement",
  ]);
  assert.equal(JSON.parse(transition.stdout).ok, true);
});

function runPython(script, args, options = {}) {
  const result = spawnSync("python3", [script, ...args], {
    encoding: "utf8",
  });
  if (!options.allowFailure && result.status !== 0) {
    throw new Error(
      `python failed (${result.status})\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );
  }
  return result;
}

test("host feature skills are full prompt projections", () => {
  const codexDesign = collectTemplates(["codex"]).get(
    ".codex/skills/cs-feat-design/SKILL.md",
  );
  const piDesign = collectTemplates(["pi"]).get(
    ".pi/skills/cs-feat-design/SKILL.md",
  );

  assert.ok(codexDesign, "expected codex feature design skill");
  assert.ok(piDesign, "expected pi feature design skill");
  assert.match(codexDesign, /name: cs-feat-design/);
  assert.match(codexDesign, /# cs-feat-design/);
  assert.match(codexDesign, /feature 流程阶段 1/);
  assert.ok(
    !codexDesign.includes("Load the source prompt"),
    "codex skill should not be a thin forwarder",
  );
  assert.ok(
    !codexDesign.includes("name: cyralis-feature-design"),
    "codex skill should preserve cyralis skill identity",
  );
  assert.match(piDesign, /name: cs-feat-design/);
  assert.match(piDesign, /# cs-feat-design/);
  assert.match(piDesign, /feature 流程阶段 1/);
  assert.doesNotMatch(codexDesign, /Cyralis 投影说明/);
  assert.doesNotMatch(piDesign, /Cyralis 投影说明/);
});

test("host skill projections do not repeat the attention preload instruction", () => {
  const templates = collectTemplates(["codex", "pi"]);
  const repeatedPrelude =
    "开始任何判断或动作前，先读取 `.cyralis/attention.md`。";

  for (const [path, body] of templates) {
    if (!/^\.(codex|pi)\/skills\/.+\/SKILL\.md$/.test(path)) continue;
    if (path.endsWith("/cs-note/SKILL.md")) continue;
    assert.ok(
      !body.includes(repeatedPrelude),
      `expected ${path} to rely on injected project_context`,
    );
  }
});

test("referenced cyralis skills are projected for hosts", () => {
  const templates = collectTemplates(["codex", "pi"]);
  const featureSkills = [
    templates.get(".codex/skills/cs-feat/SKILL.md"),
    templates.get(".codex/skills/cs-feat-design/SKILL.md"),
    templates.get(".codex/skills/cs-feat-impl/SKILL.md"),
    templates.get(".codex/skills/cs-feat-accept/SKILL.md"),
  ].join("\n");

  const referencedSkills = new Set(featureSkills.match(/cs-[a-z0-9-]+/g));
  for (const skill of referencedSkills) {
    assert.ok(
      templates.get(`.codex/skills/${skill}/SKILL.md`),
      `expected codex projection for ${skill}`,
    );
    assert.ok(
      templates.get(`.pi/skills/${skill}/SKILL.md`),
      `expected pi projection for ${skill}`,
    );
  }
});

test("all skill-like references have host skill projections", () => {
  const templates = collectTemplates(["codex", "pi"]);
  const allText = [...templates.values()].join("\n");
  const referencedSkills = new Set(allText.match(/cs-[a-z0-9-]+/g) ?? []);

  for (const skill of referencedSkills) {
    assert.ok(
      templates.get(`.codex/skills/${skill}/SKILL.md`),
      `expected codex projection for ${skill}`,
    );
    assert.ok(
      templates.get(`.pi/skills/${skill}/SKILL.md`),
      `expected pi projection for ${skill}`,
    );
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

  assert.match(
    templates.get(".codex/skills/cs-arch/SKILL.md"),
    /cyralis memory sync --kind architecture/,
  );
  assert.match(
    templates.get(".codex/skills/cs-feat-accept/SKILL.md"),
    /cyralis memory sync --kind architecture/,
  );
});
