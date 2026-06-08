import type { RecallHint } from "../core/types.js";

export interface MemoryEntry {
  id: string;
  name: string;
  description: string;
  tags: string[];
  body: string;
  path?: string;
  source?: string;
}

export interface RecallOptions {
  limit?: number;
  excludedIds?: string[];
}

export interface AssistantRecallResult {
  hints: RecallHint[];
}

export interface MemoryStore {
  recallForUser(text: string, options?: RecallOptions): Promise<RecallHint[]>;
  recallForAssistant(text: string, options?: RecallOptions): Promise<AssistantRecallResult>;
  open(id: string): Promise<MemoryEntry | null>;
  save(entry: Omit<MemoryEntry, "id"> & { id?: string }): Promise<MemoryEntry>;
}
