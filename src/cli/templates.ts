import { codexTemplates } from "./templates/codex.js";
import { coreTemplates } from "./templates/core.js";
import { piTemplates } from "./templates/pi.js";

export type Platform = "pi" | "codex";

export function collectTemplates(platforms: Platform[]): Map<string, string> {
  const files = new Map<string, string>();
  addTemplates(files, coreTemplates);
  if (platforms.includes("pi")) addTemplates(files, piTemplates);
  if (platforms.includes("codex")) addTemplates(files, codexTemplates);
  return files;
}

function addTemplates(files: Map<string, string>, templates: Array<[string, string]>): void {
  for (const [path, content] of templates) {
    files.set(path, content);
  }
}
