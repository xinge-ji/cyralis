import type { ContextEngine } from "../core/index.js";

export function buildCodexContextBlock(engine: ContextEngine, currentUserMessage = ""): string {
  return [
    "<cyralis-context>",
    engine.buildContext({ currentUserMessage }),
    "</cyralis-context>",
  ].join("\n");
}

