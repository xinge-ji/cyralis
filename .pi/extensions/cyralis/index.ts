import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

type PiLike = {
  on?: (eventName: string, handler: (...args: unknown[]) => unknown) => void;
};

export default async function cyralisPiExtension(pi: PiLike) {
  const inject = () => {
    const root = findCyralisRoot(process.cwd());
    if (!root) return undefined;
    return {
      messages: [
        {
          customType: "cyralis.context",
          display: false,
          content: [
            "<cyralis-context>",
            `root: ${root}`,
            `config: ${join(root, ".cyralis", "config.yaml")}`,
            `memory_root: ${join(root, ".cyralis", "memory")}`,
            "Use Cyralis recall hints when available.",
            "</cyralis-context>",
          ].join("\n"),
        },
      ],
    };
  };

  pi.on?.("before_agent_start", inject);
  pi.on?.("input", inject);
}

function findCyralisRoot(start: string): string | null {
  let cur = resolve(start);
  while (cur !== dirname(cur)) {
    if (existsSync(join(cur, ".cyralis"))) return cur;
    cur = dirname(cur);
  }
  return null;
}
