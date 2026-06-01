import { readdirSync, readFileSync, statSync } from "node:fs";

export function hostSkillTemplates(root: string): Array<[string, string]> {
  return skillDirectoryTemplates(root);
}

export function skillDirectoryTemplates(root: string): Array<[string, string]> {
  const skillsRoot = new URL("./assets/skills/", import.meta.url);
  const templates: Array<[string, string]> = [];

  for (const skillName of readdirSync(skillsRoot).sort()) {
    const skillUrl = new URL(`${skillName}/`, skillsRoot);
    if (!statSync(skillUrl).isDirectory()) continue;
    collectSkillFiles(skillUrl, `${root}/${skillName}`, templates);
  }

  return templates;
}

function collectSkillFiles(directoryUrl: URL, outputRoot: string, templates: Array<[string, string]>): void {
  for (const entry of readdirSync(directoryUrl).sort()) {
    const entryUrl = new URL(entry, directoryUrl);
    const outputPath = `${outputRoot}/${entry}`;
    const stat = statSync(entryUrl);
    if (stat.isDirectory()) {
      collectSkillFiles(new URL(`${entry}/`, directoryUrl), outputPath, templates);
      continue;
    }
    templates.push([outputPath, readFileSync(entryUrl, "utf8").trimEnd()]);
  }
}
