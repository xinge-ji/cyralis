import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import test from "node:test";

import { collectTemplates } from "../dist/cli/templates.js";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

test("pi template injects Cyralis context as a hidden system prompt", () => {
  const template = collectTemplates(["pi"]).get(
    ".pi/extensions/cyralis/index.ts",
  );

  assert.ok(template, "expected the Pi extension template to exist");
  assert.match(template, /before_agent_start/);
  assert.match(template, /registerCommand\?\.\("cyralis:work"/);
  assert.match(template, /work\.py/);
  assert.match(template, /summary", "--json", "--host", "pi"/);
  assert.match(template, /systemPrompt:/);
  assert.match(template, /workflow_helper:/);
  assert.match(template, /\[session_identity\]/);
  assert.match(template, /\[project_context\]/);
  assert.doesNotMatch(template, /host_skill_root:/);
  assert.doesNotMatch(template, /reference_root:/);
  assert.doesNotMatch(template, /template_root:/);
  assert.doesNotMatch(template, /memory_root:/);
  assert.doesNotMatch(template, /roadmap_root:/);
  assert.doesNotMatch(template, /feature_root:/);
  assert.doesNotMatch(template, /issue_root:/);
  assert.doesNotMatch(template, /refactor_root:/);
  assert.doesNotMatch(template, /\.cyralis\/architecture\/ARCHITECTURE\.md/);
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
    templates.get("AGENTS.md"),
    "expected AGENTS template",
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
  assert.match(templates.get(".cyralis/tools/work.py"), /cmd_summary/);
  assert.match(templates.get(".cyralis/tools/work.py"), /workflow_references/);
  assert.doesNotMatch(templates.get(".cyralis/tools/work.py"), /shared-conventions\.md/);
  assert.doesNotMatch(templates.get(".cyralis/tools/work.py"), /work-json\.md/);
  assert.ok(
    !templates.get(".cyralis/workflow.md"),
    "workflow guide markdown should not be installed",
  );
  assert.match(
    templates.get(".cyralis/config.yaml"),
    /helper: \.cyralis\/tools\/work\.py/,
  );
  assert.ok(
    !templates.get(".cyralis/reference/shared-conventions.md"),
    "shared conventions should be split and no longer installed",
  );
  assert.ok(
    !templates.get(".cyralis/reference/feature-workflow.md"),
    "feature workflow should be split and no longer installed",
  );
  assert.ok(
    !templates.get(".cyralis/reference/work-json.md"),
    "work-json should be merged and no longer installed",
  );
  assert.ok(
    !templates.get(".cyralis/reference/debugging-governance.md"),
    "debugging governance should be split and no longer installed",
  );
  assert.ok(
    templates.get(".cyralis/reference/paths-and-naming.md"),
    "expected paths and naming reference",
  );
  assert.ok(
    templates.get(".cyralis/reference/metadata-and-artifacts.md"),
    "expected metadata and artifacts reference",
  );
  assert.match(
    templates.get(".cyralis/reference/metadata-and-artifacts.md"),
    /Behavior Evaluation/,
  );
  assert.match(
    templates.get(".cyralis/reference/metadata-and-artifacts.md"),
    /只要 feature 会改变用户可见流程、系统可观察结果、错误 \/ 回退路径、跨步骤不变量，就写这个小节/,
  );
  assert.match(
    templates.get(".cyralis/reference/metadata-and-artifacts.md"),
    /Behavior Coverage/,
  );
  assert.match(
    templates.get(".cyralis/reference/metadata-and-artifacts.md"),
    /technical-only/,
  );
  assert.ok(
    templates.get(".cyralis/reference/decision-hygiene.md"),
    "expected decision hygiene reference",
  );
  assert.ok(
    templates.get(".cyralis/reference/issue-debugging-principles.md"),
    "expected issue debugging principles reference",
  );
  assert.ok(
    templates.get(".cyralis/reference/issue-quick-lane.md"),
    "expected issue quick-lane reference",
  );
  assert.ok(
    templates.get(".cyralis/reference/issue-patch-shape.md"),
    "expected issue patch-shape reference",
  );
  assert.ok(
    templates.get(".cyralis/reference/issue-fix-gates.md"),
    "expected issue fix gates reference",
  );
  assert.ok(
    templates.get(".cyralis/reference/feature-design-contract.md"),
    "expected feature reference",
  );
  assert.match(
    templates.get(".cyralis/reference/feature-design-contract.md"),
    /Behavior Evaluation（按需）/,
  );
  assert.match(
    templates.get(".cyralis/reference/feature-design-contract.md"),
    /只要 feature 会改变用户可见流程、系统可观察结果、错误 \/ 回退路径、跨步骤不变量，就写这里/,
  );
  assert.match(
    templates.get(".cyralis/reference/feature-design-contract.md"),
    /technical-only/,
  );
  assert.ok(
    templates.get(".cyralis/reference/workflow-state.md"),
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
    templates.get(".cyralis/reference/cross-layer-thinking.md"),
    "expected cross-layer thinking reference",
  );
  assert.ok(
    templates.get(".cyralis/reference/code-reuse-thinking.md"),
    "expected code reuse thinking reference",
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

  assert.doesNotMatch(templates.get(".cyralis/tools/work.py"), /\.cyralis\/skills/);
});

test("codex templates do not install the legacy memory agent role", () => {
  const templates = collectTemplates(["codex"]);

  assert.ok(
    !templates.get(".codex/agents/cyralis-memory.toml"),
    "Codex context is injected by hooks, not a standalone agent role",
  );
});

test("codex init removes the legacy managed memory agent role", () => {
  const dir = mkdtempSync(join(tmpdir(), "cyralis-codex-obsolete-agent-"));
  const legacyPath = join(dir, ".codex", "agents", "cyralis-memory.toml");
  const legacyContent = [
    'name = "cyralis-memory"',
    'description = "Use Cyralis context and memory boundaries when working in this repository."',
    'instructions = """',
    "legacy",
    '"""',
    "",
  ].join("\n");

  mkdirSync(join(dir, ".codex", "agents"), { recursive: true });
  mkdirSync(join(dir, ".cyralis"), { recursive: true });
  writeFileSync(legacyPath, legacyContent, "utf8");
  writeFileSync(
    join(dir, ".cyralis", ".template-hashes.json"),
    JSON.stringify({
      version: 1,
      files: {
        ".codex/agents/cyralis-memory.toml": sha256(legacyContent),
      },
    }, null, 2) + "\n",
    "utf8",
  );

  const result = spawnSync(process.execPath, ["bin/cyralis.mjs", "init", "--cwd", dir, "--codex", "--force"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /removed: 1/);
  assert.equal(existsSync(legacyPath), false);
  assert.ok(
    !JSON.parse(readFileSync(join(dir, ".cyralis", ".template-hashes.json"), "utf8")).files[".codex/agents/cyralis-memory.toml"],
    "obsolete agent role should not remain in the managed template manifest",
  );
});

test("init removes the legacy managed workflow guide", () => {
  const dir = mkdtempSync(join(tmpdir(), "cyralis-obsolete-workflow-"));
  const workflowPath = join(dir, ".cyralis", "workflow.md");
  const workflowContent = "# Cyralis Workflow\n\nlegacy guide\n";

  mkdirSync(join(dir, ".cyralis"), { recursive: true });
  writeFileSync(workflowPath, workflowContent, "utf8");
  writeFileSync(
    join(dir, ".cyralis", ".template-hashes.json"),
    JSON.stringify({
      version: 1,
      files: {
        ".cyralis/workflow.md": sha256(workflowContent),
      },
    }, null, 2) + "\n",
    "utf8",
  );

  const result = spawnSync(process.execPath, ["bin/cyralis.mjs", "init", "--cwd", dir, "--pi", "--force"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /removed: 1/);
  assert.equal(existsSync(workflowPath), false);
  assert.ok(
    !JSON.parse(readFileSync(join(dir, ".cyralis", ".template-hashes.json"), "utf8")).files[".cyralis/workflow.md"],
    "obsolete workflow guide should not remain in the managed template manifest",
  );
});

test("init removes obsolete managed reference files", () => {
  const dir = mkdtempSync(join(tmpdir(), "cyralis-obsolete-references-"));
  const legacyProjectGuidancePath = [".cyralis", "atten" + "tion.md"].join("/");
  const obsolete = {
    ".cyralis/reference/shared-conventions.md": "# Shared\n\nlegacy\n",
    ".cyralis/reference/work-json.md": "# Work JSON\n\nlegacy\n",
    ".cyralis/reference/feature-workflow.md": "# Feature Workflow\n\nlegacy\n",
    ".cyralis/reference/debugging-governance.md": "# Debugging Governance\n\nlegacy\n",
    ".cyralis/reference/old-generated-guide.md": "# Old Generated Guide\n\nlegacy\n",
    [legacyProjectGuidancePath]: "# Legacy Project Guidance\n\nlegacy\n",
  };

  const files = {};
  for (const [relativePath, content] of Object.entries(obsolete)) {
    const absolutePath = join(dir, relativePath);
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, content, "utf8");
    files[relativePath] = sha256(content);
  }
  mkdirSync(join(dir, ".cyralis"), { recursive: true });
  writeFileSync(
    join(dir, ".cyralis", ".template-hashes.json"),
    JSON.stringify({ version: 1, files }, null, 2) + "\n",
    "utf8",
  );

  const result = spawnSync(process.execPath, ["bin/cyralis.mjs", "init", "--cwd", dir, "--pi", "--force"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /removed: 6/);
  const manifest = JSON.parse(readFileSync(join(dir, ".cyralis", ".template-hashes.json"), "utf8"));
  for (const relativePath of Object.keys(obsolete)) {
    assert.equal(existsSync(join(dir, relativePath)), false, `${relativePath} should be removed`);
    assert.ok(!manifest.files[relativePath], `${relativePath} should not remain in the managed template manifest`);
  }
});

test("init keeps obsolete managed files that were edited locally", () => {
  const dir = mkdtempSync(join(tmpdir(), "cyralis-edited-obsolete-reference-"));
  const relativePath = ".cyralis/reference/old-generated-guide.md";
  const original = "# Old Generated Guide\n\nlegacy\n";
  const edited = "# Old Generated Guide\n\nlocal edit\n";
  const absolutePath = join(dir, relativePath);

  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, edited, "utf8");
  mkdirSync(join(dir, ".cyralis"), { recursive: true });
  writeFileSync(
    join(dir, ".cyralis", ".template-hashes.json"),
    JSON.stringify({ version: 1, files: { [relativePath]: sha256(original) } }, null, 2) + "\n",
    "utf8",
  );

  const result = spawnSync(process.execPath, ["bin/cyralis.mjs", "init", "--cwd", dir, "--pi", "--force"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /removed: 0/);
  assert.equal(readFileSync(absolutePath, "utf8"), edited);
});

test("update force-updates templates and prunes obsolete managed files", () => {
  const dir = mkdtempSync(join(tmpdir(), "cyralis-update-obsolete-"));
  const configPath = join(dir, ".cyralis", "config.yaml");
  const oldConfig = "version: 0\n";
  const obsoletePath = ".cyralis/reference/old-generated-guide.md";
  const obsoleteContent = "# Old Generated Guide\n\nlegacy\n";

  mkdirSync(dirname(configPath), { recursive: true });
  mkdirSync(dirname(join(dir, obsoletePath)), { recursive: true });
  writeFileSync(configPath, oldConfig, "utf8");
  writeFileSync(join(dir, obsoletePath), obsoleteContent, "utf8");
  writeFileSync(
    join(dir, ".cyralis", ".template-hashes.json"),
    JSON.stringify({
      version: 1,
      files: {
        ".cyralis/config.yaml": sha256(oldConfig),
        [obsoletePath]: sha256(obsoleteContent),
      },
    }, null, 2) + "\n",
    "utf8",
  );

  const result = spawnSync(process.execPath, ["bin/cyralis.mjs", "update", "--cwd", dir, "--pi"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Cyralis updated/);
  assert.match(result.stdout, /updated: /);
  assert.match(result.stdout, /removed: 1/);
  assert.notEqual(readFileSync(configPath, "utf8"), oldConfig);
  assert.equal(existsSync(join(dir, obsoletePath)), false);
});

test("init appends Cyralis AGENTS sections without overwriting an existing project guide", () => {
  const dir = mkdtempSync(join(tmpdir(), "cyralis-existing-agents-"));
  const agentsPath = join(dir, "AGENTS.md");
  const existing = [
    "# Existing Agents",
    "",
    "Keep this repository-specific guidance.",
    "",
  ].join("\n");
  writeFileSync(agentsPath, existing, "utf8");

  const result = spawnSync(process.execPath, ["bin/cyralis.mjs", "init", "--cwd", dir, "--codex"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /updated: /);
  assert.doesNotMatch(result.stdout, /conflicts: [1-9]/);

  const updated = readFileSync(agentsPath, "utf8");
  assert.ok(updated.startsWith(existing), "existing AGENTS content should stay at the top");
  assert.match(updated, /## 项目碎片知识/);
  assert.match(updated, /<!-- cs-note managed: 用 cs-note 维护，新条目按下面分节追加 -->/);
  assert.match(updated, /### 编译与构建/);
  assert.match(updated, /### 运行与本地起服务/);
  assert.match(updated, /### 测试/);
  assert.doesNotMatch(
    updated,
    /开发遵循SOLID和KISS软件工程原则/,
    "existing AGENTS files should receive only the Cyralis note skeleton",
  );
});

test("init ignores lower-case agents files and manages only AGENTS.md", () => {
  const dir = mkdtempSync(join(tmpdir(), "cyralis-existing-lower-agents-"));
  const lowerAgentsPath = join(dir, "agents.md");
  const lowerAgentsContent = "# Existing Agents\n\nKeep this file name.\n";
  writeFileSync(lowerAgentsPath, lowerAgentsContent, "utf8");

  const result = spawnSync(process.execPath, ["bin/cyralis.mjs", "init", "--cwd", dir, "--codex"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(lowerAgentsPath, "utf8"), lowerAgentsContent);
  assert.match(readFileSync(join(dir, "AGENTS.md"), "utf8"), /## 项目碎片知识/);
  assert.ok(
    JSON.parse(readFileSync(join(dir, ".cyralis", ".template-hashes.json"), "utf8")).files["AGENTS.md"],
    "manifest should track only AGENTS.md",
  );
});

test("init leaves existing AGENTS note sections unchanged even with force", () => {
  const dir = mkdtempSync(join(tmpdir(), "cyralis-existing-agents-sections-"));
  const agentsPath = join(dir, "AGENTS.md");
  const existing = [
    "# Existing Agents",
    "",
    "Project-specific guidance.",
    "",
    "## 项目碎片知识",
    "",
    "<!-- cs-note managed: 用 cs-note 维护，新条目按下面分节追加 -->",
    "",
    "### 编译与构建",
    "",
    "- Build with npm.",
    "",
    "### 运行与本地起服务",
    "",
    "### 测试",
    "",
    "### 命令与脚本陷阱",
    "",
    "### 路径与目录约定",
    "",
    "### 环境变量与凭证",
    "",
    "### 其他",
    "",
  ].join("\n");
  writeFileSync(agentsPath, existing, "utf8");

  const result = spawnSync(process.execPath, ["bin/cyralis.mjs", "init", "--cwd", dir, "--codex", "--force"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(agentsPath, "utf8"), existing);
  assert.doesNotMatch(result.stdout, /conflicts: [1-9]/);
});

test("init adds missing AGENTS note subsections without duplicating existing ones", () => {
  const dir = mkdtempSync(join(tmpdir(), "cyralis-partial-agents-sections-"));
  const agentsPath = join(dir, "AGENTS.md");
  writeFileSync(
    agentsPath,
    [
      "# Existing Agents",
      "",
      "## 项目碎片知识",
      "",
      "### 编译与构建",
      "",
      "- Build with npm.",
      "",
      "## Other Guidance",
      "",
      "Keep this after the note block.",
      "",
    ].join("\n"),
    "utf8",
  );

  const result = spawnSync(process.execPath, ["bin/cyralis.mjs", "init", "--cwd", dir, "--codex"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  const updated = readFileSync(agentsPath, "utf8");
  assert.equal((updated.match(/### 编译与构建/g) ?? []).length, 1);
  assert.match(updated, /<!-- cs-note managed: 用 cs-note 维护，新条目按下面分节追加 -->/);
  assert.match(updated, /### 运行与本地起服务/);
  assert.match(updated, /### 其他/);
  assert.match(updated, /## Other Guidance/);
  assert.ok(
    updated.indexOf("### 其他") < updated.indexOf("## Other Guidance"),
    "missing note subsections should stay inside the project knowledge section",
  );
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
  assert.match(design, /"结构健康度与微重构"是固定步骤/);
  assert.match(implement, /方案文件够不够撑实现/);
  assert.match(implement, /写代码时的三条姿态/);
  assert.match(accept, /验收闭环/);
  assert.match(accept, /跟 design 的章节强依赖/);
  assert.match(design, /work\.json\.artifacts\.design\.approval/);
  assert.doesNotMatch(design, /Cyralis 投影说明/);
  assert.doesNotMatch(design, /Cyralis 状态写入点/);
  assert.doesNotMatch(design, /status=approved/);
  assert.match(design, /cross-layer-thinking\.md/);
  assert.match(design, /code-reuse-thinking\.md/);
  assert.match(implement, /cross-layer-thinking\.md/);
  assert.match(implement, /code-reuse-thinking\.md/);
});

test("backend and ui skills are projected and reference shared thinking guides", () => {
  const templates = collectTemplates(["codex", "pi"]);

  for (const host of ["codex", "pi"]) {
    const backend = templates.get(`.${host}/skills/cs-backend/SKILL.md`);
    const backendReference = templates.get(
      `.${host}/skills/cs-backend/reference.md`,
    );
    const ui = templates.get(`.${host}/skills/cs-ui/SKILL.md`);
    const uiReference = templates.get(`.${host}/skills/cs-ui/reference.md`);

    assert.ok(backend, `expected ${host} backend skill`);
    assert.ok(backendReference, `expected ${host} backend reference`);
    assert.ok(ui, `expected ${host} ui skill`);
    assert.ok(uiReference, `expected ${host} ui reference`);
    assert.match(backend, /领域辅助技能/);
    assert.match(backend, /cross-layer-thinking\.md/);
    assert.match(backend, /code-reuse-thinking\.md/);
    assert.match(ui, /领域辅助技能/);
    assert.match(ui, /cross-layer-thinking\.md/);
    assert.match(ui, /code-reuse-thinking\.md/);
  }
});

test("feature design prompts project behavior evaluation rules into both hosts", () => {
  const templates = collectTemplates(["codex", "pi"]);
  const paths = [
    ".codex/skills/cs-feat-design/SKILL.md",
    ".pi/skills/cs-feat-design/SKILL.md",
    ".codex/skills/cs-feat-design/reference.md",
    ".pi/skills/cs-feat-design/reference.md",
    ".codex/skills/cs-feat-design/design-document-reviewer-prompt.md",
    ".pi/skills/cs-feat-design/design-document-reviewer-prompt.md",
    ".codex/skills/cs-feat-accept/SKILL.md",
    ".pi/skills/cs-feat-accept/SKILL.md",
  ];

  for (const path of paths) {
    assert.ok(templates.get(path), `expected ${path}`);
  }

  for (const host of ["codex", "pi"]) {
    const designSkill = templates.get(`.${host}/skills/cs-feat-design/SKILL.md`);
    const designReference = templates.get(
      `.${host}/skills/cs-feat-design/reference.md`,
    );
    const reviewerPrompt = templates.get(
      `.${host}/skills/cs-feat-design/design-document-reviewer-prompt.md`,
    );
    const acceptSkill = templates.get(`.${host}/skills/cs-feat-accept/SKILL.md`);

    assert.match(designSkill, /Behavior Evaluation（按需）/);
    assert.match(
      designSkill,
      /只要 feature 会改变用户可见流程、系统可观察结果、错误 \/ 回退路径、跨步骤不变量，就先写这个小节/,
    );
    assert.match(designSkill, /Behavior Coverage/);
    assert.match(designSkill, /technical-only/);
    assert.match(designReference, /Behavior Evaluation（按需）/);
    assert.match(
      designReference,
      /只要 feature 会改变用户可见流程、系统可观察结果、错误 \/ 回退路径、跨步骤不变量，就写这里/,
    );
    assert.match(designReference, /Behavior Coverage/);
    assert.match(designReference, /technical-only/);
    assert.match(reviewerPrompt, /Behavior Evaluation/);
    assert.match(reviewerPrompt, /failure signal/);
    assert.match(reviewerPrompt, /correction path/);
    assert.match(reviewerPrompt, /fake coverage/);
    assert.match(acceptSkill, /关键场景清单/);
    assert.match(acceptSkill, /Behavior Evaluation 逐项核对/);
    assert.match(acceptSkill, /Failure signal/);
    assert.match(acceptSkill, /Correction path/);
    assert.match(acceptSkill, /technical-only/);
  }
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

test("codex hook exposes workflow and project paths", () => {
  const hook = collectTemplates(["codex"]).get(
    ".codex/hooks/inject-context-memory.py",
  );

  assert.ok(hook, "expected codex hook template");
  assert.match(hook, /workflow_helper = root \/ "\.cyralis" \/ "tools" \/ "work\.py"/);
  assert.match(hook, /\[session_identity\]/);
  assert.match(hook, /\[project_context\]/);
  assert.doesNotMatch(hook, /\.cyralis" \/ "workflow\.md"/);
  assert.doesNotMatch(hook, /host_skill_root:/);
  assert.doesNotMatch(hook, /memory_root:/);
  assert.doesNotMatch(hook, /reference_root:/);
  assert.doesNotMatch(hook, /template_root:/);
  assert.doesNotMatch(hook, /roadmap_root:/);
  assert.doesNotMatch(hook, /feature_root:/);
  assert.doesNotMatch(hook, /issue_root:/);
  assert.doesNotMatch(hook, /refactor_root:/);
  assert.doesNotMatch(hook, /architecture_index/);
  assert.doesNotMatch(hook, /\.cyralis\/architecture\/ARCHITECTURE\.md/);
  assert.doesNotMatch(hook, /memory_projection_root:/);
  assert.match(hook, /def recall_projection_hints/);
  assert.match(hook, /<cyralis-recall>/);
  assert.doesNotMatch(hook, /Workflow skills are projected/);
  assert.doesNotMatch(hook, /Workflow status is stored/);
  assert.doesNotMatch(hook, /Full architecture and compound documents/);
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
  assert.doesNotMatch(template, /memory_projection_root:/);
  assert.doesNotMatch(template, /host_skill_root:/);
  assert.doesNotMatch(template, /memory_root:/);
  assert.doesNotMatch(template, /reference_root:/);
  assert.doesNotMatch(template, /template_root:/);
  assert.doesNotMatch(template, /roadmap_root:/);
  assert.doesNotMatch(template, /feature_root:/);
  assert.doesNotMatch(template, /issue_root:/);
  assert.doesNotMatch(template, /refactor_root:/);
  assert.doesNotMatch(template, /Workflow skills are projected/);
  assert.doesNotMatch(template, /Full architecture and compound documents/);
  assert.doesNotMatch(template, /\.cyralis\/architecture\/ARCHITECTURE\.md/);
  assert.match(template, /before_provider_request/);
  assert.match(template, /appendRecallToPayload/);
  assert.match(template, /lastUserMessageIsRecall/);
  assert.doesNotMatch(template, /containsRecallMarker/);
  assert.match(template, /<cyralis-recall>/);
  assert.match(template, /CYRALIS_PI_DUMP_PROVIDER_REQUEST/);
  assert.match(template, /return undefined/);
  assert.ok(templates.get(".pi/skills/cs-feat-design/SKILL.md"));
  assert.match(template, /<workflow-state>/);
  assert.match(template, /breadcrumb", "--host", "pi"/);
  assert.match(template, /work\.py breadcrumb/);
  assert.match(template, /workflow_helper:/);
  assert.doesNotMatch(template, /workflow: "\s*\+ join\(root, "\.cyralis", "workflow\.md"\)/);
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

test("codex hook emits session context once while recall stays per prompt", () => {
  const templates = collectTemplates(["codex"]);
  const dir = mkdtempSync(join(tmpdir(), "cyralis-codex-session-context-"));
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
      "Vite proxy target port failures.",
      "",
    ].join("\n"),
    "utf8",
  );

  const runHook = (input) => spawnSync("python3", ["-X", "utf8", hook], {
    cwd: dir,
    input: JSON.stringify(input),
    encoding: "utf8",
  });

  const first = runHook({ cwd: dir, session_id: "demo", prompt: "vite proxy" });
  assert.equal(first.status, 0, first.stderr);
  assert.match(first.stdout, /<cyralis-context>/);
  assert.match(first.stdout, /\[project_context\]/);
  assert.match(first.stdout, /<workflow-state>/);
  assert.match(first.stdout, /<cyralis-recall>/);

  const second = runHook({ cwd: dir, session_id: "demo", prompt: "vite proxy" });
  assert.equal(second.status, 0, second.stderr);
  assert.doesNotMatch(second.stdout, /<cyralis-context>/);
  assert.doesNotMatch(second.stdout, /<workflow-state>/);
  assert.match(second.stdout, /<cyralis-recall>/);

  const afterCompact = runHook({
    cwd: dir,
    session_id: "demo",
    event: "after_compact",
    prompt: "vite proxy",
  });
  assert.equal(afterCompact.status, 0, afterCompact.stderr);
  assert.match(afterCompact.stdout, /<cyralis-context>/);
  assert.match(afterCompact.stdout, /<workflow-state>/);
  assert.match(afterCompact.stdout, /<cyralis-recall>/);
});

test("codex hook skips weak projection recall matches", () => {
  const templates = collectTemplates(["codex"]);
  const dir = mkdtempSync(join(tmpdir(), "cyralis-codex-weak-recall-"));
  const hook = join(dir, ".codex", "hooks", "inject-context-memory.py");
  const projectionDir = join(
    dir,
    ".cyralis",
    "memory",
    "projections",
    "compound",
    "decision",
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
    join(projectionDir, "decision_doris.md"),
    [
      "---",
      "id: decision_doris",
      "name: Doris aggregate key",
      "description: Doris physical property validation constraint.",
      "tags: [doris, aggregate_key]",
      "source: .cyralis/compound/2026-06-13-decision-doris.md",
      "projection: true",
      "---",
      "",
      "Doris aggregate key is not supported in this adapter.",
      "",
    ].join("\n"),
    "utf8",
  );

  const result = spawnSync("python3", ["-X", "utf8", hook], {
    cwd: dir,
    input: JSON.stringify({
      cwd: dir,
      prompt: "doris alpha beta gamma delta epsilon zeta eta theta iota kappa lambda",
    }),
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, /<cyralis-recall>/);
  assert.doesNotMatch(result.stdout, /decision_doris/);
});

test("work helper resolves session-scoped active work and gated transitions", () => {
  const templates = collectTemplates([]);
  const dir = mkdtempSync(join(tmpdir(), "cyralis-work-"));
  const helper = join(dir, ".cyralis", "tools", "work.py");
  const featureDir = join(
    dir,
    ".cyralis",
    "features",
    "2026-06-01-demo-feature",
  );
  const issueDir = join(dir, ".cyralis", "issues", "2026-06-01-demo-issue");
  const doneIssueDir = join(
    dir,
    ".cyralis",
    "issues",
    "2026-06-01-done-issue",
  );

  mkdirSync(join(dir, ".cyralis", "tools"), { recursive: true });
  mkdirSync(featureDir, { recursive: true });
  mkdirSync(issueDir, { recursive: true });
  mkdirSync(doneIssueDir, { recursive: true });
  mkdirSync(join(dir, ".cyralis", "roadmap", "demo-roadmap"), { recursive: true });
  writeFileSync(helper, templates.get(".cyralis/tools/work.py"), "utf8");
  writeFileSync(
    join(dir, ".cyralis", "roadmap", "demo-roadmap", "demo-roadmap-items.yaml"),
    [
      "roadmap: demo-roadmap",
      "created: 2026-06-01",
      "",
      "items:",
      "  - slug: foundation",
      "    description: Shared foundation",
      "    depends_on: []",
      "    status: done",
      "    feature: 2026-06-01-foundation",
      "    minimal_loop: true",
      "    notes: null",
      "",
      "  - slug: ready-feature",
      "    description: Ready roadmap feature",
      "    depends_on: [foundation]",
      "    status: planned",
      "    feature: null",
      "    minimal_loop: false",
      "    notes: null",
      "",
      "  - slug: blocked-feature",
      "    description: Blocked roadmap feature",
      "    depends_on: [ready-feature]",
      "    status: planned",
      "    feature: null",
      "    minimal_loop: false",
      "    notes: null",
      "",
    ].join("\n"),
    "utf8",
  );
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
  writeFileSync(
    join(doneIssueDir, "work.json"),
    JSON.stringify(
      {
        schema: 1,
        id: "done-issue",
        mode: "issue",
        status: "done",
        title: "Done issue",
        slug: "done-issue",
        root: ".cyralis/issues/2026-06-01-done-issue",
        parent: null,
        artifacts: {},
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
  runPython(helper, [
    "--cwd",
    dir,
    "--context-key",
    "s3",
    "activate",
    ".cyralis/issues/2026-06-01-done-issue",
  ]);

  const s1 = runPython(helper, [
    "--cwd",
    dir,
    "--context-key",
    "s1",
    "resolve",
    "--json",
  ]);
  const s1Data = JSON.parse(s1.stdout);
  assert.equal(s1Data.mode, "feature");
  assert.match(s1Data.host_skill, /\.codex\/skills\/cs-feat-design\/SKILL\.md/);
  assert.ok(
    s1Data.references.includes(".cyralis/reference/feature-design-contract.md"),
    "feature design references should come from work.py",
  );
  assert.match(s1Data.commands.transition, /work\.py transition \.cyralis\/features\/2026-06-01-demo-feature <target-status>/);
  const s2 = runPython(helper, [
    "--cwd",
    dir,
    "--context-key",
    "s2",
    "resolve",
    "--json",
  ]);
  assert.equal(JSON.parse(s2.stdout).mode, "issue");

  const breadcrumb = runPython(helper, [
    "--cwd",
    dir,
    "--context-key",
    "s1",
    "breadcrumb",
    "--host",
    "codex",
  ]);
  assert.match(breadcrumb.stdout, /references:/);
  assert.match(breadcrumb.stdout, /commands:/);
  assert.doesNotMatch(breadcrumb.stdout, /\.cyralis\/workflow\.md/);

  const summary = runPython(helper, [
    "--cwd",
    dir,
    "--context-key",
    "s1",
    "summary",
    "--json",
    "--host",
    "pi",
  ]);
  const summaryData = JSON.parse(summary.stdout);
  assert.equal(summaryData.counts.total, 3);
  assert.equal(summaryData.counts.open, 2);
  assert.equal(summaryData.counts.done, 1);
  assert.equal(summaryData.counts.roadmap_planned, 2);
  assert.equal(summaryData.counts.roadmap_ready, 1);
  assert.equal(
    summaryData.current.work_root,
    ".cyralis/features/2026-06-01-demo-feature",
  );
  assert.ok(
    summaryData.items.find((item) => item.id === "demo-feature")?.active,
    "active work should be marked in the summary",
  );
  assert.ok(
    !summaryData.items.some((item) => item.id === "done-issue"),
    "summary should list unfinished work only",
  );
  assert.match(
    summaryData.items.find((item) => item.id === "demo-feature").host_skill,
    /\.pi\/skills\/cs-feat-design\/SKILL\.md/,
  );
  assert.equal(
    summaryData.roadmap_items.find((item) => item.slug === "ready-feature")?.ready,
    true,
  );
  assert.deepEqual(
    summaryData.roadmap_items.find((item) => item.slug === "blocked-feature")?.blocked_by,
    ["ready-feature"],
  );

  const doneCurrent = runPython(helper, [
    "--cwd",
    dir,
    "--context-key",
    "s3",
    "resolve",
    "--json",
  ]);
  const doneCurrentData = JSON.parse(doneCurrent.stdout);
  assert.equal(doneCurrentData.status, "no_task");
  assert.equal(doneCurrentData.work_root, null);
  assert.match(doneCurrentData.reason, /active work is done/);

  const doneSummary = runPython(helper, [
    "--cwd",
    dir,
    "--context-key",
    "s3",
    "summary",
    "--json",
    "--host",
    "pi",
  ]);
  assert.equal(JSON.parse(doneSummary.stdout).current, null);

  const textSummary = runPython(helper, ["--cwd", dir, "summary", "--text"]);
  assert.match(textSummary.stdout, /Cyralis work summary/);
  assert.match(textSummary.stdout, /Unfinished work:/);
  assert.match(textSummary.stdout, /Roadmap planned: 2 \/ Ready: 1/);
  assert.match(textSummary.stdout, /Planned roadmap items:/);
  assert.match(textSummary.stdout, /ready-feature/);
  assert.doesNotMatch(textSummary.stdout, /Done issue/);

  const transition = runPython(helper, [
    "--cwd",
    dir,
    "transition",
    ".cyralis/features/2026-06-01-demo-feature",
    "implement",
  ]);
  assert.equal(JSON.parse(transition.stdout).ok, true);

  const secondTransition = runPython(helper, [
    "--cwd",
    dir,
    "transition",
    ".cyralis/issues/2026-06-01-demo-issue",
    "implement",
  ]);
  assert.equal(JSON.parse(secondTransition.stdout).ok, true);
  const secondIssue = JSON.parse(readFileSync(join(issueDir, "work.json"), "utf8"));
  secondIssue.artifacts.analysis.confirmed = true;
  writeFileSync(
    join(issueDir, "work.json"),
    JSON.stringify(secondIssue, null, 2) + "\n",
    "utf8",
  );
  assert.equal(
    JSON.parse(
      runPython(helper, [
        "--cwd",
        dir,
        "transition",
        ".cyralis/issues/2026-06-01-demo-issue",
        "verify",
      ]).stdout,
    ).ok,
    true,
  );
  writeFileSync(join(issueDir, "demo-issue-fix-note.md"), "fixed\n", "utf8");
  const verifyIssue = JSON.parse(readFileSync(join(issueDir, "work.json"), "utf8"));
  verifyIssue.artifacts.fix.result = "passed";
  writeFileSync(
    join(issueDir, "work.json"),
    JSON.stringify(verifyIssue, null, 2) + "\n",
    "utf8",
  );
  assert.equal(
    JSON.parse(
      runPython(helper, [
        "--cwd",
        dir,
        "transition",
        ".cyralis/issues/2026-06-01-demo-issue",
        "done",
      ]).stdout,
    ).ok,
    true,
  );

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

test("host skill projections do not repeat the AGENTS preload instruction", () => {
  const templates = collectTemplates(["codex", "pi"]);
  const repeatedPrelude = "开始任何判断或动作前，先检查 `AGENTS.md`。";

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
  const metadata = templates.get(".cyralis/reference/metadata-and-artifacts.md");
  const tools = templates.get(".cyralis/reference/tools.md");
  const compoundWriters = ["cs-learn", "cs-trick", "cs-decide", "cs-explore"];

  assert.match(metadata, /cyralis memory sync/);
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
