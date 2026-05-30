import type { ContextEngine, RecallRuntime } from "../core/index.js";

export interface ContextMemoryRuntime {
  engine: ContextEngine;
  recall: RecallRuntime;
}

export interface HostBinding {
  name: string;
  install(): void | Promise<void>;
}

export interface HostBindingOptions {
  runtime?: ContextMemoryRuntime;
}

