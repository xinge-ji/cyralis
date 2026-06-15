import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { initCommand, updateCommand } from "./init.js";
import { memoryCommand } from "./memory.js";

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const [command, ...rest] = argv;

  if (!command || command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "init") {
    await initCommand(rest);
    return;
  }

  if (command === "update") {
    await updateCommand(rest);
    return;
  }

  if (command === "memory") {
    await memoryCommand(rest);
    return;
  }

  if (command === "--version" || command === "-v") {
    console.log(readPackageVersion());
    return;
  }

  throw new Error(`Unknown command: ${command}\nRun: cyralis --help`);
}

function readPackageVersion(): string {
  try {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
    const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { version?: string };
    return packageJson.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function printHelp(): void {
  console.log(`cyralis - context and memory projection installer

Usage:
  cyralis init [options]
  cyralis update [options]
  cyralis memory sync [options]

Options:
  --cwd <dir>     Target project directory. Defaults to current directory.
  --pi            Install only the Pi projection.
  --codex         Install only the Codex projection.
  --all           Install all supported projections. Default when no platform flag is passed.
  --force         Overwrite existing managed files.
  --help, -h      Show help.
  --version, -v   Show version.

Examples:
  cyralis init
  cyralis init --pi
  cyralis init --codex --cwd /path/to/project
  cyralis update --cwd /path/to/project
  cyralis memory sync --kind compound
`);
}
