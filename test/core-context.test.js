import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  ContextEngine,
  RecallRuntime,
  buildCodexContextBlock,
  createPiHostBinding,
  loadProjectContext,
} from "../dist/index.js";

test("context engine builds host-neutral layered context", () => {
  const engine = new ContextEngine({
    cwd: "/repo",
    memoryRoot: "/repo/.cyralis/memory",
    systemCore: "[system_core]\nCyralis core rules",
    injections: ["## extension\nExtra rule"],
    projectContext: [{ path: "AGENTS.md", content: "Project attention" }],
    maxRecentTurns: 2,
  });

  engine.recordTurn({
    userMessage: "first",
    assistantMessage: "answer one",
    userRecallHints: [{ id: "mem_user", name: "User memory", description: "Remembered from user." }],
  });
  engine.recordTurn({
    userMessage: "second",
    assistantMessage: "answer two",
    assistantContext: "compact answer two",
  });

  const layers = engine.buildLayers({ currentUserMessage: "current" });
  assert.deepEqual(layers.map((layer) => layer.name), [
    "system_core",
    "injections",
    "session_identity",
    "project_context",
    "recent_chat",
  ]);
  assert.match(layers[0].text, /\[system_core\]/);
  assert.match(layers[3].text, /AGENTS\.md/);
  assert.match(layers.at(-1).text, /\[current_user\]\ncurrent/);
  assert.deepEqual([...engine.getRecentRecallMemoryIds()], ["mem_user"]);
});

test("codex context block carries AGENTS through project_context, not system context", () => {
  const engine = new ContextEngine({
    cwd: "/repo",
    systemCore: "[system_core]\nDo not emit this through Codex hooks.",
    memoryRoot: "/repo/.cyralis/memory",
    projectContext: [{ path: "AGENTS.md", content: "Project attention rule" }],
  });
  engine.recordTurn({ userMessage: "old", assistantMessage: "old answer" });

  const block = buildCodexContextBlock(engine, { currentUserMessage: "current" });
  assert.match(block, /<cyralis-context>/);
  assert.match(block, /\[session_identity\]/);
  assert.match(block, /\[project_context\]/);
  assert.match(block, /--- AGENTS\.md ---\nProject attention rule/);
  assert.doesNotMatch(block, /\[system_core\]/);
  assert.doesNotMatch(block, /\[recent_chat\]/);
  assert.doesNotMatch(block, /\[current_user\]/);
});

test("recall runtime deduplicates within a turn and keeps assistant recall transient", async () => {
  const excludedCalls = [];
  const store = {
    async recallForUser(_text, options) {
      excludedCalls.push(options.excludedIds);
      return [{ id: "mem_user", name: "User", description: "User hint" }];
    },
    async recallForAssistant(_text, options) {
      excludedCalls.push(options.excludedIds);
      return { hints: [{ id: "mem_assistant", name: "Assistant", description: "Assistant hint" }] };
    },
  };
  const recall = new RecallRuntime({
    memoryStore: store,
    getExcludedIds: () => ["mem_recent"],
  });

  recall.beginTurn();
  assert.deepEqual(await recall.recallForUser("user text"), [
    { id: "mem_user", name: "User", description: "User hint" },
  ]);
  recall.observeAssistantText("assistant text");
  assert.deepEqual(await recall.flushAssistantRecall(), [
    { id: "mem_assistant", name: "Assistant", description: "Assistant hint" },
  ]);
  assert.deepEqual(excludedCalls, [
    ["mem_recent"],
    ["mem_recent", "mem_user"],
  ]);
  recall.endTurn();
});

test("pi binding renders system core plus dynamic context through Pi systemPrompt", async () => {
  const handlers = new Map();
  const pi = {
    on(eventName, handler) {
      handlers.set(eventName, handler);
    },
  };
  const engine = new ContextEngine({
    cwd: "/repo",
    systemCore: "[system_core]\nPi system",
    projectContext: [{ path: "AGENTS.md", content: "Pi attention rule" }],
  });
  const recall = {
    observeAssistantText() {},
    async flushAssistantRecall() {
      return [{ id: "mem_pi", name: "Pi", description: "Pi hint" }];
    },
  };

  await createPiHostBinding({ pi, runtime: { engine, recall } }).install();
  const start = handlers.get("before_agent_start")();
  assert.match(start.systemPrompt, /\[system_core\]\nPi system/);
  assert.match(start.systemPrompt, /\[project_context\]/);
  assert.match(start.systemPrompt, /--- AGENTS\.md ---\nPi attention rule/);

  const recallMessage = await handlers.get("turn_end")();
  assert.equal(recallMessage.customType, "cyralis.recall");
  assert.equal(recallMessage.display, false);
  assert.equal(recallMessage.hints[0].id, "mem_pi");
});

test("loadProjectContext exposes helper paths without inlining architecture", async () => {
  const dir = mkdtempSync(join(tmpdir(), "cyralis-project-context-"));
  mkdirSync(join(dir, ".cyralis", "tools"), { recursive: true });
  mkdirSync(join(dir, ".cyralis", "architecture"), { recursive: true });
  mkdirSync(join(dir, ".cyralis", "compound"), { recursive: true });
  writeFileSync(join(dir, ".cyralis", "config.yaml"), "version: 1\n", "utf8");
  writeFileSync(join(dir, ".cyralis", "tools", "work.py"), "# helper\n", "utf8");
  writeFileSync(join(dir, ".cyralis", "architecture", "ARCHITECTURE.md"), "# Project architecture\n\nModule index", "utf8");
  writeFileSync(join(dir, ".cyralis", "compound", "2026-06-02-learning-hidden.md"), "# Hidden learning", "utf8");

  const entries = await loadProjectContext({ cwd: dir });

  assert.equal(entries.length, 1);
  const text = entries.map((entry) => entry.content).join("\n");
  assert.match(text, /config: .*\.cyralis\/config\.yaml/);
  assert.match(text, /workflow_helper: .*\.cyralis\/tools\/work\.py/);
  assert.doesNotMatch(text, /Project architecture/);
  assert.doesNotMatch(text, /architecture_source_root/);
  assert.doesNotMatch(text, /compound_source_root/);
  assert.doesNotMatch(text, /memory_projection_root/);
  assert.doesNotMatch(text, /Full architecture and compound documents/);
  assert.doesNotMatch(text, /Hidden learning/);
});
