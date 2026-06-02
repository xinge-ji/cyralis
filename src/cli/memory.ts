import { isAbsolute, resolve } from "node:path";
import { syncMemoryProjections, type MemoryProjectionKind } from "../memory/index.js";

interface MemorySyncOptions {
  cwd: string;
  kinds: MemoryProjectionKind[];
  sourcePaths: string[];
  prune?: boolean;
}

export async function memoryCommand(argv: string[]): Promise<void> {
  const [subcommand, ...rest] = argv;
  if (!subcommand || subcommand === "--help" || subcommand === "-h" || subcommand === "help") {
    printMemoryHelp();
    return;
  }
  if (subcommand !== "sync") {
    throw new Error(`Unknown memory command: ${subcommand}\nRun: cyralis memory --help`);
  }

  const options = parseMemorySyncArgs(rest);
  const result = await syncMemoryProjections({
    cwd: options.cwd,
    kinds: options.kinds,
    sourcePaths: options.sourcePaths,
    prune: options.prune,
  });
  console.log("projection sync complete");
  console.log(`created: ${result.created}, updated: ${result.updated}, unchanged: ${result.unchanged}, pruned: ${result.pruned}, skipped: ${result.skipped.length}`);
  for (const item of result.skipped) {
    console.log(`skipped: ${item.path} (${item.reason})`);
  }
}

function parseMemorySyncArgs(argv: string[]): MemorySyncOptions {
  let cwd = process.cwd();
  const kinds: MemoryProjectionKind[] = [];
  const sourcePaths: string[] = [];
  let prune: boolean | undefined;

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      printMemoryHelp();
      process.exit(0);
    }
    if (arg === "--cwd") {
      const value = argv[++index];
      if (!value) throw new Error("--cwd requires a directory");
      cwd = isAbsolute(value) ? value : resolve(process.cwd(), value);
      continue;
    }
    if (arg === "--kind") {
      const value = argv[++index];
      if (!value) throw new Error("--kind requires architecture, compound, or all");
      for (const kind of parseKinds(value)) kinds.push(kind);
      continue;
    }
    if (arg === "--source") {
      const value = argv[++index];
      if (!value) throw new Error("--source requires a markdown document path");
      sourcePaths.push(value);
      continue;
    }
    if (arg === "--prune") {
      prune = true;
      continue;
    }
    if (arg === "--no-prune") {
      prune = false;
      continue;
    }
    throw new Error(`Unknown memory sync option: ${arg}`);
  }

  return {
    cwd: resolve(cwd),
    kinds: kinds.length > 0 ? [...new Set(kinds)] : ["architecture", "compound"],
    sourcePaths,
    prune,
  };
}

function parseKinds(value: string): MemoryProjectionKind[] {
  const kinds: MemoryProjectionKind[] = [];
  for (const raw of value.split(",")) {
    const kind = raw.trim();
    if (!kind || kind === "all") continue;
    if (kind !== "architecture" && kind !== "compound") {
      throw new Error(`Invalid memory projection kind: ${kind}`);
    }
    kinds.push(kind);
  }
  return kinds;
}

function printMemoryHelp(): void {
  console.log(`cyralis memory - synchronize Cyralis markdown memory projections

Usage:
  cyralis memory sync [options]

Options:
  --cwd <dir>              Target project directory. Defaults to current directory.
  --kind <kind>            architecture, compound, or all. Can be repeated.
  --source <path>          Sync a specific source markdown document. Can be repeated.
  --prune                  Prune stale managed projections.
  --no-prune               Do not prune stale managed projections.
  --help, -h               Show help.

Examples:
  cyralis memory sync
  cyralis memory sync --kind compound --source .cyralis/compound/2026-06-02-learning-vite-proxy.md
  cyralis memory sync --kind architecture
`);
}
