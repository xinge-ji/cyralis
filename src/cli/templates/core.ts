import { readFileSync } from "node:fs";

export const coreTemplates: Array<[string, string]> = [
  [".cyralis/config.yaml", readAsset("cyralis/config.yaml")],
  [".cyralis/workflow.md", readAsset("cyralis/workflow.md")],
  [".cyralis/attention.md", readAsset("cyralis/attention.md")],
  [".cyralis/.gitignore", readAsset("cyralis/gitignore")],
  [".cyralis/memory/.gitkeep", ""],
  [".cyralis/requirements/.gitkeep", ""],
  [".cyralis/architecture/ARCHITECTURE.md", readAsset("cyralis/architecture/ARCHITECTURE.md")],
  [".cyralis/roadmap/.gitkeep", ""],
  [".cyralis/features/.gitkeep", ""],
  [".cyralis/issues/.gitkeep", ""],
  [".cyralis/refactors/.gitkeep", ""],
  [".cyralis/compound/.gitkeep", ""],
  [".cyralis/brainstorm/.gitkeep", ""],
  [".cyralis/tools/search-yaml.py", readAsset("cyralis/tools/search-yaml.py")],
  [".cyralis/tools/validate-yaml.py", readAsset("cyralis/tools/validate-yaml.py")],
  [".cyralis/tools/work.py", readAsset("cyralis/tools/work.py")],
  [".cyralis/reference/shared-conventions.md", readAsset("cyralis/reference/shared-conventions.md")],
  [".cyralis/reference/decision-hygiene.md", readAsset("cyralis/reference/decision-hygiene.md")],
  [".cyralis/reference/feature-workflow.md", readAsset("cyralis/reference/feature-workflow.md")],
  [".cyralis/reference/work-json.md", readAsset("cyralis/reference/work-json.md")],
  [".cyralis/reference/code-dimensions.md", readAsset("cyralis/reference/code-dimensions.md")],
  [".cyralis/reference/maintainer-notes.md", readAsset("cyralis/reference/maintainer-notes.md")],
  [".cyralis/reference/requirement-example.md", readAsset("cyralis/reference/requirement-example.md")],
  [".cyralis/reference/system-overview.md", readAsset("cyralis/reference/system-overview.md")],
  [".cyralis/reference/tools.md", readAsset("cyralis/reference/tools.md")],
  [".cyralis/templates/feature/work.json", readAsset("cyralis/templates/feature/work.json")],
  [".cyralis/templates/issue/work.json", readAsset("cyralis/templates/issue/work.json")],
  [".cyralis/templates/refactor/work.json", readAsset("cyralis/templates/refactor/work.json")],
];

function readAsset(relativePath: string): string {
  return readFileSync(new URL(`./assets/${relativePath}`, import.meta.url), "utf8");
}
