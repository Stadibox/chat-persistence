import type { AgentSource } from "@stadi/shared";

export interface RunRequest {
  runId: string;
  agent: AgentSource;
  input: string;
  workspaceDir: string;
  triggeredBy: string;
}

// Eventos que el parser emite. Línea NDJSON del CLI -> RunEvent normalizado.
export type RunEvent =
  | { type: "system"; ts: string; payload: { kind: "started" | "ended"; data?: unknown } }
  | { type: "message"; ts: string; payload: { role: "assistant" | "user"; content: unknown } }
  | { type: "tool_use"; ts: string; payload: { id: string; name: string; input: unknown } }
  | { type: "tool_result"; ts: string; payload: { id: string; content: unknown; isError: boolean } }
  | { type: "thinking"; ts: string; payload: { content: string } }
  | {
      type: "usage";
      ts: string;
      payload: {
        inputTokens: number;
        outputTokens: number;
        cacheReadTokens: number;
        cacheCreationTokens: number;
      };
    }
  | { type: "error"; ts: string; payload: { message: string; raw?: unknown } };

export interface RunResult {
  runId: string;
  exitCode: number;
  events: RunEvent[];
  totals: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
  };
  startedAt: string;
  finishedAt: string;
}
