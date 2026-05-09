import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function resolveClaudeBin(): string {
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

const Body = z.object({
  message: z.string().min(1),
  sessionId: z.string().optional(),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return new Response("invalid json", { status: 400 });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return new Response("invalid body", { status: 400 });
  }
  const { message, sessionId } = parsed.data;

  const bin = resolveClaudeBin();
  const args = ["-p", message, "--output-format", "stream-json", "--verbose"];
  if (sessionId) args.push("--resume", sessionId);

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const enc = new TextEncoder();
      const writeLine = (obj: unknown) => {
        try {
          controller.enqueue(enc.encode(JSON.stringify(obj) + "\n"));
        } catch {
          /* closed */
        }
      };

      const useShell = process.platform === "win32" && (bin.endsWith(".cmd") || bin === "claude");
      const child = spawn(bin, args, {
        shell: useShell,
        windowsHide: true,
      });
      if (child.stdin && !child.stdin.destroyed) child.stdin.end();

      let buffer = "";
      let sessionEmitted = false;

      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        buffer += chunk;
        let nl = buffer.indexOf("\n");
        while (nl >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          nl = buffer.indexOf("\n");
          if (!line) continue;
          let obj: Record<string, unknown>;
          try {
            obj = JSON.parse(line) as Record<string, unknown>;
          } catch {
            continue;
          }

          const sid = obj.session_id as string | undefined;
          if (sid && !sessionEmitted) {
            sessionEmitted = true;
            writeLine({ kind: "session", sessionId: sid });
          }

          if (obj.type === "assistant") {
            const msg = obj.message as { content?: unknown } | undefined;
            const content = msg?.content;
            if (Array.isArray(content)) {
              for (const c of content) {
                if (c && typeof c === "object") {
                  const block = c as { type?: string; text?: string; name?: string };
                  if (block.type === "text" && typeof block.text === "string") {
                    writeLine({ kind: "text", text: block.text });
                  } else if (block.type === "tool_use" && block.name) {
                    writeLine({ kind: "tool_use", name: block.name });
                  }
                }
              }
            }
          } else if (obj.type === "result") {
            const result = obj.result as string | undefined;
            if (typeof result === "string" && result.length > 0) {
              writeLine({ kind: "final", text: result });
            }
            const cost = obj.total_cost_usd as number | undefined;
            const usage = obj.usage as Record<string, number> | undefined;
            writeLine({
              kind: "usage",
              cost: cost ?? 0,
              inputTokens: usage?.input_tokens ?? 0,
              outputTokens: usage?.output_tokens ?? 0,
              cacheReadTokens: usage?.cache_read_input_tokens ?? 0,
            });
          }
        }
      });

      child.stderr.setEncoding("utf8");
      child.stderr.on("data", (chunk: string) => {
        writeLine({ kind: "stderr", text: chunk });
      });

      child.on("error", (err) => {
        writeLine({ kind: "error", message: (err as Error).message });
        try {
          controller.close();
        } catch {
          /* ya cerrado */
        }
      });

      child.on("close", (code) => {
        writeLine({ kind: "done", exitCode: code ?? 1 });
        try {
          controller.close();
        } catch {
          /* ya cerrado */
        }
      });

      const killTree = () => {
        if (child.exitCode !== null || child.killed) return;
        try {
          if (process.platform === "win32" && child.pid) {
            // taskkill /T mata el árbol entero — child.kill() en Windows
            // no propaga la señal a procesos nietos (bun-runner del plugin).
            spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
              windowsHide: true,
            });
          } else {
            child.kill("SIGKILL");
          }
        } catch {
          /* noop */
        }
      };
      req.signal.addEventListener("abort", killTree);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
