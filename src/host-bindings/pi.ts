import type { HostBinding, HostBindingOptions } from "./types.js";
import { renderContextLayers } from "../core/index.js";

interface PiLike {
  on?: (eventName: string, handler: (...args: unknown[]) => unknown) => void;
}

export interface PiHostBindingOptions extends HostBindingOptions {
  pi: unknown;
}

export function createPiHostBinding(options: PiHostBindingOptions): HostBinding {
  const pi = options.pi as PiLike;
  return {
    name: "pi",
    install() {
      if (typeof pi.on !== "function") return;
      pi.on("before_agent_start", () => {
        const engine = options.runtime?.engine;
        if (!engine) return undefined;
        const bundle = engine.buildContextBundle({ includeCurrentUser: false });
        const dynamicContext = renderContextLayers(bundle.contextLayers);
        return {
          systemPrompt: [bundle.systemCore.text, dynamicContext].filter(Boolean).join("\n\n"),
        };
      });
      pi.on("message_update", (event: unknown) => {
        const text = extractTextDelta(event);
        if (text) options.runtime?.recall.observeAssistantText(text);
      });
      pi.on("turn_end", async () => {
        const hints = await options.runtime?.recall.flushAssistantRecall();
        if (!hints || hints.length === 0) return undefined;
        return { customType: "cyralis.recall", display: false, hints };
      });
    },
  };
}

function extractTextDelta(event: unknown): string {
  if (!event || typeof event !== "object") return "";
  const record = event as Record<string, unknown>;
  const direct = record.delta;
  if (typeof direct === "string") return direct;
  const assistantEvent = record.assistantMessageEvent;
  if (assistantEvent && typeof assistantEvent === "object") {
    const nested = (assistantEvent as Record<string, unknown>).delta;
    if (typeof nested === "string") return nested;
  }
  return "";
}
