import type {
  BuildContextOptions,
  ContextBundle,
  ContextEngineOptions,
  ContextLayer,
  ProjectContextEntry,
  ProjectContextInput,
  RecallHint,
  TurnRecord,
} from "./types.js";

export class ContextEngine {
  readonly cwd: string;
  readonly memoryRoot?: string;
  #systemCore: string;
  #injections: string[];
  #projectContext: ProjectContextEntry[];
  #maxRecentTurns: number;
  #turns: TurnRecord[] = [];

  constructor(options: ContextEngineOptions) {
    this.cwd = options.cwd;
    this.memoryRoot = options.memoryRoot;
    const systemCore = options.systemCore ?? options.systemPrompt;
    if (!systemCore) throw new Error("ContextEngine requires systemCore or systemPrompt");
    this.#systemCore = systemCore;
    this.#injections = [...(options.injections ?? [])];
    this.#projectContext = normalizeProjectContext(options.projectContext);
    this.#maxRecentTurns = options.maxRecentTurns ?? 10;
  }

  buildLayers(options: BuildContextOptions = {}): ContextLayer[] {
    const layers: ContextLayer[] = [];

    if (options.includeSystemCore !== false) {
      layers.push({ name: "system_core", text: this.#systemCore });
    }

    if (this.#injections.length > 0) {
      layers.push({
        name: "injections",
        text: ["[injections]", ...this.#injections].join("\n"),
      });
    }

    layers.push({ name: "session_identity", text: this.#sessionIdentity() });

    const projectContext = this.#projectContextLayer();
    if (projectContext) layers.push({ name: "project_context", text: projectContext });

    if (options.includeRecentChat !== false) {
      layers.push({
        name: "recent_chat",
        text: this.#recentChat(options.currentUserMessage, options.includeCurrentUser),
      });
    }

    return layers;
  }

  buildContext(options: BuildContextOptions = {}): string {
    return renderContextLayers(this.buildLayers(options));
  }

  buildContextBundle(options: BuildContextOptions = {}): ContextBundle {
    const systemCore: ContextLayer = { name: "system_core", text: this.#systemCore };
    const contextLayers = this.buildLayers({ ...options, includeSystemCore: false });
    return {
      systemCore,
      contextLayers,
      allLayers: [systemCore, ...contextLayers],
    };
  }

  recordTurn(input: Omit<TurnRecord, "index">): TurnRecord {
    const turn: TurnRecord = {
      index: this.#turns.length + 1,
      ...input,
    };
    this.#turns.push(turn);
    if (this.#turns.length > this.#maxRecentTurns) {
      this.#turns = this.#turns.slice(-this.#maxRecentTurns);
    }
    return turn;
  }

  getRecentRecallMemoryIds(): Set<string> {
    const ids = new Set<string>();
    for (const turn of this.#turns) {
      for (const hint of turn.userRecallHints ?? []) ids.add(hint.id);
    }
    return ids;
  }

  setSystemPrompt(systemPrompt: string): void {
    this.#systemCore = systemPrompt;
  }

  setSystemCore(systemCore: string): void {
    this.#systemCore = systemCore;
  }

  setInjections(injections: string[]): void {
    this.#injections = [...injections];
  }

  setProjectContext(projectContext: ProjectContextInput): void {
    this.#projectContext = normalizeProjectContext(projectContext);
  }

  #sessionIdentity(): string {
    const lines = ["[session_identity]", `cwd: ${this.cwd}`];
    if (this.memoryRoot) lines.push(`memory_root: ${this.memoryRoot}`);
    return lines.join("\n");
  }

  #projectContextLayer(): string {
    if (this.#projectContext.length === 0) return "";
    const blocks = this.#projectContext
      .map((entry) => {
        const header = entry.path
          ? `--- ${entry.path} ---`
          : entry.title
            ? `## ${entry.title}`
            : "";
        return [header, entry.content.trimEnd()].filter(Boolean).join("\n");
      })
      .filter(Boolean);
    if (blocks.length === 0) return "";
    return ["[project_context]", ...blocks].join("\n");
  }

  #recentChat(currentUserMessage?: string, includeCurrentUser = true): string {
    const lines = ["[recent_chat]"];
    if (this.#turns.length === 0) {
      lines.push("(no prior turns)");
    }
    for (const turn of this.#turns) {
      lines.push("", `## Turn ${turn.index}`, "[user]", turn.userMessage);
      const userRecall = formatRecallHints(turn.userRecallHints);
      if (userRecall) lines.push("", userRecall);
      lines.push("", "[assistant]", turn.assistantContext || turn.assistantMessage);
    }
    if (includeCurrentUser && currentUserMessage) lines.push("", "[current_user]", currentUserMessage);
    return lines.join("\n");
  }
}

export function renderContextLayers(layers: ContextLayer[]): string {
  return layers.map((layer) => layer.text).join("\n\n");
}

export function formatRecallHints(hints: RecallHint[] = []): string {
  if (hints.length === 0) return "";
  const lines = ["[recall]"];
  for (const hint of hints) {
    const score = Number.isFinite(hint.score) ? ` | score=${hint.score?.toFixed(2)}` : "";
    lines.push(`- ${hint.id}${score} | ${hint.name} | ${hint.description}`);
  }
  return lines.join("\n");
}

function normalizeProjectContext(input: ProjectContextInput | undefined): ProjectContextEntry[] {
  if (!input) return [];
  const items = Array.isArray(input) ? input : [input];
  return items
    .map((item) => {
      if (typeof item === "string") return { content: item };
      return item;
    })
    .filter((item) => item.content.trim().length > 0);
}
