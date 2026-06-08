import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  MarkdownMemoryStore,
  formatRecallHints,
  syncMemoryProjections,
} from "../dist/index.js";

test("syncMemoryProjections creates recall stubs for architecture and compound docs", async () => {
  const dir = mkdtempSync(join(tmpdir(), "cyralis-projections-"));
  const compoundDir = join(dir, ".cyralis", "compound");
  const architectureDir = join(dir, ".cyralis", "architecture");
  mkdirSync(compoundDir, { recursive: true });
  mkdirSync(architectureDir, { recursive: true });
  const learningPath = join(compoundDir, "2026-06-02-learning-vite-proxy.md");
  const stalePath = join(compoundDir, "2026-06-02-decision-old-router.md");

  writeFileSync(learningPath, [
    "---",
    "doc_type: learning",
    "track: pitfall",
    "date: 2026-06-02",
    "slug: vite-proxy",
    "component: dev-server",
    "tags: [vite, proxy]",
    "---",
    "# Vite proxy failure",
    "",
    "代理目标端口错误导致接口失败。最终修复是检查 dev server target。",
    "",
  ].join("\n"), "utf8");
  writeFileSync(stalePath, [
    "---",
    "doc_type: decision",
    "category: architecture",
    "date: 2026-06-02",
    "slug: old-router",
    "status: superseded",
    "tags: [router]",
    "---",
    "# Old router",
    "",
  ].join("\n"), "utf8");
  writeFileSync(join(architectureDir, "cli-entry.md"), [
    "---",
    "doc_type: architecture",
    "slug: cli-entry",
    "scope: CLI entry wiring",
    "summary: CLI dispatch owns command parsing and memory sync commands.",
    "status: current",
    "last_reviewed: 2026-06-02",
    "tags: [cli, command]",
    "---",
    "# CLI entry",
    "",
    "The CLI routes init and memory sync commands to host-neutral modules.",
    "",
  ].join("\n"), "utf8");

  const result = await syncMemoryProjections({ cwd: dir });

  assert.equal(result.created, 2);
  assert.equal(result.skipped.length, 1);
  assert.match(result.skipped[0].reason, /superseded/);

  const projectionRoot = join(dir, ".cyralis", "memory", "projections");
  const compoundProjection = findOneMarkdown(join(projectionRoot, "compound", "learning"));
  const architectureProjection = findOneMarkdown(join(projectionRoot, "architecture"));
  const compoundProjectionText = readFileSync(compoundProjection, "utf8");
  assert.match(compoundProjectionText, /source: \.cyralis\/compound\/2026-06-02-learning-vite-proxy\.md/);
  assert.doesNotMatch(compoundProjectionText, /Search excerpt:/);
  assert.doesNotMatch(compoundProjectionText, /Open the source document/);
  assert.match(readFileSync(architectureProjection, "utf8"), /source: \.cyralis\/architecture\/cli-entry\.md/);

  const store = new MarkdownMemoryStore({ root: join(dir, ".cyralis", "memory") });
  const chineseHints = await store.recallForUser("vite proxy", { limit: 5 });
  const learningHint = chineseHints.find((hint) => hint.id.includes("learning_vite-proxy"));
  assert.ok(learningHint, "expected metadata recall to find the learning projection");
  assert.equal(learningHint.source, ".cyralis/compound/2026-06-02-learning-vite-proxy.md");
  assert.match(formatRecallHints([learningHint]), /source=\.cyralis\/compound\/2026-06-02-learning-vite-proxy\.md/);
  assert.doesNotMatch(formatRecallHints([learningHint]), /excerpt:/);
  const architectureHints = await store.recallForUser("CLI command parsing", { limit: 5 });
  assert.ok(architectureHints.some((hint) => hint.id.includes("arch_cli-entry")), "expected recall to find the architecture projection");

  writeFileSync(learningPath, [
    "---",
    "doc_type: learning",
    "track: pitfall",
    "date: 2026-06-02",
    "slug: vite-proxy",
    "status: outdated",
    "tags: [vite, proxy]",
    "---",
    "# Vite proxy failure",
    "",
  ].join("\n"), "utf8");
  const pruneResult = await syncMemoryProjections({
    cwd: dir,
    kinds: ["compound"],
    sourcePaths: [".cyralis/compound/2026-06-02-learning-vite-proxy.md"],
  });
  assert.equal(pruneResult.pruned, 1);
  assert.ok(!existsSync(compoundProjection), "expected stale source projection to be pruned");
});

test("cyralis memory sync CLI writes projections", () => {
  const dir = mkdtempSync(join(tmpdir(), "cyralis-cli-memory-"));
  const compoundDir = join(dir, ".cyralis", "compound");
  mkdirSync(compoundDir, { recursive: true });
  writeFileSync(join(compoundDir, "2026-06-02-trick-fetch.md"), [
    "---",
    "doc_type: trick",
    "type: technique",
    "date: 2026-06-02",
    "slug: fetch-wrapper",
    "tags: [fetch, api]",
    "---",
    "# Fetch wrapper",
    "",
    "Use the project wrapper for API calls.",
    "",
  ].join("\n"), "utf8");

  const result = spawnSync(process.execPath, ["bin/cyralis.mjs", "memory", "sync", "--cwd", dir, "--kind", "compound"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /projection sync complete/);
  assert.ok(findOneMarkdown(join(dir, ".cyralis", "memory", "projections", "compound", "trick")));
});

function findOneMarkdown(root) {
  const files = readdirSync(root).filter((name) => name.endsWith(".md"));
  assert.equal(files.length, 1, `expected one markdown file under ${root}`);
  return join(root, files[0]);
}
