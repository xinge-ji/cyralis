import type {
  BuildContextOptions,
  ContextEngineOptions,
  ContextLayer,
  RecallHint,
  TurnRecord,
} from "./types.js";

export class ContextEngine {
  readonly cwd: string;
  readonly memoryRoot?: string;
  #systemPrompt: string;
  #injections: string[];
  #maxRecentTurns: number;
  #turns: TurnRecord[] = [];

  constructor(options: ContextEngineOptions) {
    this.cwd = options.cwd;
    this.memoryRoot = options.memoryRoot;
    this.#systemPrompt = options.systemPrompt;
    this.#injections = [...(options.injections ?? [])];
    this.#maxRecentTurns = options.maxRecentTurns ?? 10;
  }

  buildLayers(options: BuildContextOptions = {}): ContextLayer[] {
    const layers: ContextLayer[] = [
      { name: "system", text: this.#systemPrompt },
    ];

    if (this.#injections.length > 0) {
      layers.push({
        name: "injections",
        text: ["[injections]", ...this.#injections].join("\n"),
      });
    }

    layers.push({ name: "session_identity", text: this.#sessionIdentity() });
    layers.push({
      name: "recent_chat",
      text: this.#recentChat(options.currentUserMessage),
    });

    return layers;
  }

  buildContext(options: BuildContextOptions = {}): string {
    return this.buildLayers(options).map((layer) => layer.text).join("\n\n");
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
      for (const hint of turn.assistantRecallHints ?? []) ids.add(hint.id);
    }
    return ids;
  }

  setSystemPrompt(systemPrompt: string): void {
    this.#systemPrompt = systemPrompt;
  }

  setInjections(injections: string[]): void {
    this.#injections = [...injections];
  }

  #sessionIdentity(): string {
    const lines = ["[session_identity]", `cwd: ${this.cwd}`];
    if (this.memoryRoot) lines.push(`memory_root: ${this.memoryRoot}`);
    return lines.join("\n");
  }

  #recentChat(currentUserMessage?: string): string {
    const lines = ["[recent_chat]"];
    if (this.#turns.length === 0) {
      lines.push("(no prior turns)");
    }
    for (const turn of this.#turns) {
      lines.push("", `## Turn ${turn.index}`, "[user]", turn.userMessage);
      const userRecall = formatRecallHints(turn.userRecallHints);
      if (userRecall) lines.push("", userRecall);
      lines.push("", "[assistant]", turn.assistantContext || turn.assistantMessage);
      const assistantRecall = formatRecallHints(turn.assistantRecallHints);
      if (assistantRecall) lines.push("", assistantRecall);
    }
    if (currentUserMessage) lines.push("", "[current_user]", currentUserMessage);
    return lines.join("\n");
  }
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

