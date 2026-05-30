export type ContextLayerName =
  | "system"
  | "injections"
  | "session_identity"
  | "recent_chat";

export interface ContextLayer {
  name: ContextLayerName;
  text: string;
}

export interface RecallHint {
  id: string;
  name: string;
  description: string;
  score?: number;
}

export interface TurnRecord {
  index: number;
  userMessage: string;
  assistantMessage: string;
  assistantContext?: string;
  userRecallHints?: RecallHint[];
  assistantRecallHints?: RecallHint[];
}

export interface ContextEngineOptions {
  cwd: string;
  systemPrompt: string;
  memoryRoot?: string;
  injections?: string[];
  maxRecentTurns?: number;
}

export interface BuildContextOptions {
  currentUserMessage?: string;
}

