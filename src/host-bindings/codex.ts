import type { ContextEngine } from "../core/index.js";
import { renderContextLayers } from "../core/index.js";

export interface CodexContextBlockOptions {
  currentUserMessage?: string;
  includeCurrentUser?: boolean;
  includeRecentChat?: boolean;
}

export function buildCodexContextBlock(engine: ContextEngine, options: CodexContextBlockOptions | string = {}): string {
  const resolved = typeof options === "string" ? { currentUserMessage: options } : options;
  const layers = engine.buildLayers({
    currentUserMessage: resolved.currentUserMessage,
    includeCurrentUser: resolved.includeCurrentUser ?? false,
    includeRecentChat: resolved.includeRecentChat ?? false,
    includeSystemCore: false,
  });
  return [
    "<cyralis-context>",
    renderContextLayers(layers),
    "</cyralis-context>",
  ].join("\n");
}
