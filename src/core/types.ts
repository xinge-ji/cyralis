export type ContextLayerName =
  | "system_core"
  | "injections"
  | "session_identity"
  | "project_context"
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
}

export type ProjectContextInput =
  | string
  | Array<string | ProjectContextEntry>;

export interface ProjectContextEntry {
  title?: string;
  path?: string;
  content: string;
}

export interface ContextEngineOptions {
  cwd: string;
  systemCore?: string;
  systemPrompt?: string;
  memoryRoot?: string;
  injections?: string[];
  projectContext?: ProjectContextInput;
  maxRecentTurns?: number;
}

export interface BuildContextOptions {
  currentUserMessage?: string;
  includeCurrentUser?: boolean;
  includeRecentChat?: boolean;
  includeSystemCore?: boolean;
}

export interface ContextBundle {
  systemCore: ContextLayer;
  contextLayers: ContextLayer[];
  allLayers: ContextLayer[];
}
