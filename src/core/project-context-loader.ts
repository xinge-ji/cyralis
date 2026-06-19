import { join, resolve } from "node:path";
import type { ProjectContextEntry } from "./types.js";

export interface LoadProjectContextOptions {
  cwd: string;
  cyralisRoot?: string;
  /**
   * @deprecated Project context no longer inlines ARCHITECTURE.md.
   */
  maxArchitectureIndexBytes?: number;
}

export async function loadProjectContext(options: LoadProjectContextOptions): Promise<ProjectContextEntry[]> {
  const cwd = resolve(options.cwd);
  const cyralisRoot = resolve(cwd, options.cyralisRoot ?? ".cyralis");
  return [{
    content: [
      `config: ${join(cyralisRoot, "config.yaml")}`,
    ].join("\n"),
  }];
}
