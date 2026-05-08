import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { RunEvent, RunRequest, RunResult } from "./types.js";

// Espejo de packages/adapters/claude-local/src/server/execute.ts:39 en PaperClip.
// Spawneamos el binario `claude` con --output-format stream-json y parseamos NDJSON.

export interface SpawnOptions {
  bin?: string;
  onEvent?: (event: RunEvent) => void;
  signal?: AbortSignal;
}

// Resuelve el binario `claude`. En Windows el shim .cmd tiene problemas de
// quoting con prompts largos: preferimos el .exe directo si lo encontramos.
function resolveClaudeBin(override?: string): string {
  if (override) return override;
  if (process.env.CLAUDE_BIN) return process.env.CLAUDE_BIN;
  if (process.platform === "win32") {
    const candidates = [
      join(
        process.env.APPDATA ?? "",
        "npm",
        "node_modules",
        "@anthropic-ai",
        "claude-code",
        "bin",
        "claude.exe",
      ),
      join(process.env.LOCALAPPDATA ?? "", "Programs", "claude", "claude.exe"),
    ];
    for (const c of candidates) {
      if (c && existsSync(c)) return c;
    }
  }
  return "claude";
}

export async function spawnClaudeRun(
  req: RunRequest,
  options: SpawnOptions = {},
): Promise<RunResult> {
  const bin = resolveClaudeBin(options.bin);
  const startedAt = new Date().toISOString();

  await mkdir(req.workspaceDir, { recursive: true });
  await writeFile(
    join(req.workspaceDir, "AGENT.md"),
    `# ${req.agent.frontmatter.name}\n\n${req.agent.instructions}\n`,
    "utf8",
  );

  const args = [
    "-p",
    req.input,
    "--append-system-prompt",
    req.agent.instructions,
    "--model",
    req.agent.frontmatter.model,
    "--output-format",
    "stream-json",
    "--verbose",
  ];
  if (req.agent.frontmatter.toolsAllowed.length > 0) {
    args.push("--allowedTools", req.agent.frontmatter.toolsAllowed.join(","));
  }

  const events: RunEvent[] = [];
  const totals = {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
  };

  const exitCode: number = await new Promise<number>((resolve, reject) => {
    // shell:false con .exe directo evita problemas de quoting en cmd.exe
    const useShell = process.platform === "win32" && (bin.endsWith(".cmd") || bin === "claude");
    const child = spawn(bin, args, {
      cwd: req.workspaceDir,
      env: {
        ...process.env,
        STADI_RUN_ID: req.runId,
        STADI_AGENT_SLUG: req.agent.frontmatter.slug,
      },
      signal: options.signal,
      shell: useShell,
      windowsHide: true,
    });
    // Cerramos stdin de inmediato: pasamos prompt vía -p, no por pipe.
    // Sin esto el CLI espera stdin y bloquea con "no stdin data received".
    if (child.stdin && !child.stdin.destroyed) {
      child.stdin.end();
    }

    let buffer = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      buffer += chunk;
      let nl = buffer.indexOf("\n");
      while (nl >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        nl = buffer.indexOf("\n");
        if (!line) continue;
        const event = parseLine(line);
        if (event) {
          if (event.type === "usage") {
            totals.inputTokens += event.payload.inputTokens;
            totals.outputTokens += event.payload.outputTokens;
            totals.cacheReadTokens += event.payload.cacheReadTokens;
            totals.cacheCreationTokens += event.payload.cacheCreationTokens;
          }
          events.push(event);
          options.onEvent?.(event);
        }
      }
    });

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      const event: RunEvent = {
        type: "error",
        ts: new Date().toISOString(),
        payload: { message: chunk.trim() },
      };
      events.push(event);
      options.onEvent?.(event);
    });

    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });

  return {
    runId: req.runId,
    exitCode,
    events,
    totals,
    startedAt,
    finishedAt: new Date().toISOString(),
  };
}

interface ClaudeStreamLine {
  type?: string;
  message?: { content?: unknown; usage?: ClaudeUsage };
  delta?: { type?: string; text?: string; thinking?: string };
  tool_use?: { id?: string; name?: string; input?: unknown };
  tool_use_id?: string;
  content?: unknown;
  is_error?: boolean;
  usage?: ClaudeUsage;
}

interface ClaudeUsage {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
}

function parseLine(line: string): RunEvent | null {
  let parsed: ClaudeStreamLine;
  try {
    parsed = JSON.parse(line) as ClaudeStreamLine;
  } catch {
    return {
      type: "error",
      ts: new Date().toISOString(),
      payload: { message: `unparseable line`, raw: line },
    };
  }
  const ts = new Date().toISOString();
  const usage = parsed.usage ?? parsed.message?.usage;
  if (usage) {
    return {
      type: "usage",
      ts,
      payload: {
        inputTokens: usage.input_tokens ?? 0,
        outputTokens: usage.output_tokens ?? 0,
        cacheReadTokens: usage.cache_read_input_tokens ?? 0,
        cacheCreationTokens: usage.cache_creation_input_tokens ?? 0,
      },
    };
  }
  switch (parsed.type) {
    case "message":
      return {
        type: "message",
        ts,
        payload: { role: "assistant", content: parsed.message?.content },
      };
    case "tool_use":
      return {
        type: "tool_use",
        ts,
        payload: {
          id: parsed.tool_use?.id ?? "",
          name: parsed.tool_use?.name ?? "",
          input: parsed.tool_use?.input,
        },
      };
    case "tool_result":
      return {
        type: "tool_result",
        ts,
        payload: {
          id: parsed.tool_use_id ?? "",
          content: parsed.content,
          isError: parsed.is_error ?? false,
        },
      };
    case "thinking":
      return { type: "thinking", ts, payload: { content: parsed.delta?.thinking ?? "" } };
    default:
      return { type: "system", ts, payload: { kind: "ended", data: parsed } };
  }
}
