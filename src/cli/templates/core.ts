import { readFileSync } from "node:fs";

export const coreTemplates: Array<[string, string]> = [
  [".cyralis/config.yaml", readAsset("cyralis/config.yaml")],
  [".cyralis/attention.md", readAsset("cyralis/attention.md")],
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
    ".cyralis/reference/core.md",
    readAsset("cyralis/reference/core.md"),
  ],
  [".cyralis/reference/shared.md", readAsset("cyralis/reference/shared.md")],
  [
    ".cyralis/reference/shared-conventions.md",
    readAsset("cyralis/reference/shared-conventions.md"),
  ],
  [
    ".cyralis/reference/tools.md",
    readAsset("cyralis/reference/tools.md"),
  ],
  [
    ".cyralis/reference/code-dimensions.md",
    readAsset("cyralis/reference/code-dimensions.md"),
  ],
  [
    ".cyralis/reference/requirement-example.md",
    readAsset("cyralis/reference/requirement-example.md"),
  ],
  [".cyralis/reference/feature.md", readAsset("cyralis/reference/feature.md")],
  [".cyralis/reference/issue.md", readAsset("cyralis/reference/issue.md")],
  [
    ".cyralis/reference/refactor.md",
    readAsset("cyralis/reference/refactor.md"),
  ],
  [
    ".cyralis/reference/arch-audit.md",
    readAsset("cyralis/reference/arch-audit.md"),
  ],
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
