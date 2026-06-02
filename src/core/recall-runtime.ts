import type { RecallHint } from "./types.js";
import type { MemoryStore } from "../memory/index.js";

export interface RecallRuntimeOptions {
  memoryStore: MemoryStore;
  getExcludedIds?: () => Iterable<string>;
}

export class RecallRuntime {
  #memoryStore: MemoryStore;
  #getExcludedIds: () => Iterable<string>;
  #assistantBuffer = "";
  #turnSeenMemoryIds = new Set<string>();

  constructor(options: RecallRuntimeOptions) {
    this.#memoryStore = options.memoryStore;
    this.#getExcludedIds = options.getExcludedIds ?? (() => []);
  }

  async recallForUser(text: string): Promise<RecallHint[]> {
    const hints = await this.#memoryStore.recallForUser(text, {
      excludedIds: this.#excludedIds(),
    });
    this.#rememberHints(hints);
    return hints;
  }

  observeAssistantText(text: string): void {
    this.#assistantBuffer += text;
  }

  async flushAssistantRecall(): Promise<RecallHint[]> {
    const text = this.#assistantBuffer;
    this.#assistantBuffer = "";
    if (!text.trim()) return [];
    const result = await this.#memoryStore.recallForAssistant(text, {
      excludedIds: this.#excludedIds(),
    });
    this.#rememberHints(result.hints);
    return result.hints;
  }

  beginTurn(): void {
    this.#assistantBuffer = "";
    this.#turnSeenMemoryIds.clear();
  }

  endTurn(): void {
    this.#assistantBuffer = "";
    this.#turnSeenMemoryIds.clear();
  }

  #excludedIds(): string[] {
    return [...this.#getExcludedIds(), ...this.#turnSeenMemoryIds];
  }

  #rememberHints(hints: RecallHint[]): void {
    for (const hint of hints) this.#turnSeenMemoryIds.add(hint.id);
  }
}
