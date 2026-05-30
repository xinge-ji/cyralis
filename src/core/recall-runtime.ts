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

  constructor(options: RecallRuntimeOptions) {
    this.#memoryStore = options.memoryStore;
    this.#getExcludedIds = options.getExcludedIds ?? (() => []);
  }

  async recallForUser(text: string): Promise<RecallHint[]> {
    return this.#memoryStore.recallForUser(text, {
      excludedIds: [...this.#getExcludedIds()],
    });
  }

  observeAssistantText(text: string): void {
    this.#assistantBuffer += text;
  }

  async flushAssistantRecall(): Promise<RecallHint[]> {
    const text = this.#assistantBuffer;
    this.#assistantBuffer = "";
    if (!text.trim()) return [];
    const result = await this.#memoryStore.recallForAssistant(text, {
      excludedIds: [...this.#getExcludedIds()],
    });
    return result.hints;
  }
}

