import { readFileSync } from "node:fs";

export const coreTemplates: Array<[string, string]> = [
  [".cyralis/config.yaml", readAsset("cyralis/config.yaml")],
  ["AGENTS.md", readAsset("cyralis/AGENTS.md")],
  [".cyralis/.gitignore", readAsset("cyralis/gitignore")],
  [".cyralis/memory/.gitkeep", ""],
  [".cyralis/memory/projections/.gitkeep", ""],
  [".cyralis/requirements/.gitkeep", ""],
  [
    ".cyralis/architecture/ARCHITECTURE.md",
    readAsset("cyralis/architecture/ARCHITECTURE.md"),
  ],
  [".cyralis/roadmap/.gitkeep", ""],
  [".cyralis/features/.gitkeep", ""],
  [".cyralis/issues/.gitkeep", ""],
  [".cyralis/refactors/.gitkeep", ""],
  [".cyralis/audits/.gitkeep", ""],
  [".cyralis/compound/.gitkeep", ""],
  [".cyralis/brainstorms/.gitkeep", ""],
  [".cyralis/tools/search-yaml.py", readAsset("cyralis/tools/search-yaml.py")],
  [
    ".cyralis/tools/validate-yaml.py",
    readAsset("cyralis/tools/validate-yaml.py"),
  ],
  [".cyralis/tools/work.py", readAsset("cyralis/tools/work.py")],
  [
    ".cyralis/reference/paths-and-naming.md",
    readAsset("cyralis/reference/paths-and-naming.md"),
  ],
  [
    ".cyralis/reference/metadata-and-artifacts.md",
    readAsset("cyralis/reference/metadata-and-artifacts.md"),
  ],
  [
    ".cyralis/reference/workflow-state.md",
    readAsset("cyralis/reference/workflow-state.md"),
  ],
  [
    ".cyralis/reference/feature-design-contract.md",
    readAsset("cyralis/reference/feature-design-contract.md"),
  ],
  [
    ".cyralis/reference/roadmap-feature-link.md",
    readAsset("cyralis/reference/roadmap-feature-link.md"),
  ],
  [
    ".cyralis/reference/completion-and-review.md",
    readAsset("cyralis/reference/completion-and-review.md"),
  ],
  [
    ".cyralis/reference/compound-archive.md",
    readAsset("cyralis/reference/compound-archive.md"),
  ],
  [
    ".cyralis/reference/implementation-reflection.md",
    readAsset("cyralis/reference/implementation-reflection.md"),
  ],
  [
    ".cyralis/reference/decision-hygiene.md",
    readAsset("cyralis/reference/decision-hygiene.md"),
  ],
  [
    ".cyralis/reference/issue-debugging-principles.md",
    readAsset("cyralis/reference/issue-debugging-principles.md"),
  ],
  [
    ".cyralis/reference/issue-quick-lane.md",
    readAsset("cyralis/reference/issue-quick-lane.md"),
  ],
  [
    ".cyralis/reference/issue-patch-shape.md",
    readAsset("cyralis/reference/issue-patch-shape.md"),
  ],
  [
    ".cyralis/reference/issue-fix-gates.md",
    readAsset("cyralis/reference/issue-fix-gates.md"),
  ],
  [
    ".cyralis/reference/code-dimensions.md",
    readAsset("cyralis/reference/code-dimensions.md"),
  ],
  [
    ".cyralis/reference/cross-layer-thinking.md",
    readAsset("cyralis/reference/cross-layer-thinking.md"),
  ],
  [
    ".cyralis/reference/code-reuse-thinking.md",
    readAsset("cyralis/reference/code-reuse-thinking.md"),
  ],
  [
    ".cyralis/reference/maintainer-notes.md",
    readAsset("cyralis/reference/maintainer-notes.md"),
  ],
  [
    ".cyralis/reference/requirement-example.md",
    readAsset("cyralis/reference/requirement-example.md"),
  ],
  [".cyralis/reference/tools.md", readAsset("cyralis/reference/tools.md")],
  [
    ".cyralis/templates/feature/work.json",
    readAsset("cyralis/templates/feature/work.json"),
  ],
  [
    ".cyralis/templates/issue/work.json",
    readAsset("cyralis/templates/issue/work.json"),
  ],
  [
    ".cyralis/templates/refactor/work.json",
    readAsset("cyralis/templates/refactor/work.json"),
  ],
];

function readAsset(relativePath: string): string {
  return readFileSync(
    new URL(`./assets/${relativePath}`, import.meta.url),
    "utf8",
  );
}
