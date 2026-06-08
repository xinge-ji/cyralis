import { existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const isWindows = process.platform === "win32";
const tscPath = join(process.cwd(), "node_modules", ".bin", isWindows ? "tsc.cmd" : "tsc");

if (!existsSync(tscPath)) {
  run("npm", [
    "install",
    "--global=false",
    "--include=dev",
    "--ignore-scripts",
    "--no-audit",
    "--no-save",
    "--no-progress",
  ]);
}

run("npm", ["run", "build"]);

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: isWindows,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
