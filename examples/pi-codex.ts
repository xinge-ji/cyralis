import {
  ContextEngine,
  MarkdownMemoryStore,
  RecallRuntime,
  createPiHostBinding,
} from "../src/index.js";

const memory = new MarkdownMemoryStore({ root: ".cyralis/memory" });
const engine = new ContextEngine({
  cwd: process.cwd(),
  memoryRoot: memory.root,
  systemPrompt: "You are running with Cyralis context and memory.",
});
const recall = new RecallRuntime({
  memoryStore: memory,
  getExcludedIds: () => engine.getRecentRecallMemoryIds(),
});

export function install(pi: unknown) {
  return createPiHostBinding({
    pi,
    runtime: { engine, recall },
  }).install();
}

