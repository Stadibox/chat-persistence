// Worker local standalone. Corre en tu máquina con `claude` CLI instalado.
// Escucha Supabase Realtime + spawn del CLI + writeback de respuesta.
//
// Uso:
//   pnpm tsx scripts/worker-local.ts
//
// Lee apps/web/.env.local para NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
// Opcional CLAUDE_BIN si Node no encuentra el binario.

import { createClient } from "@supabase/supabase-js";
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

// ── Carga .env.local sin dotenv ─────────────────────────────────────────
const envPath = resolve(process.cwd(), "apps/web/.env.local");
if (existsSync(envPath)) {
  const text = readFileSync(envPath, "utf8");
  for (const raw of text.split(/\r?\n/)) {
    const m = raw.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\r\n#]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en apps/web/.env.local");
  process.exit(1);
}

const WORKER_ID = `local-${process.pid}-${Math.random().toString(16).slice(2, 8)}`;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { params: { eventsPerSecond: 10 } },
});

// ── Resolver del binario claude ─────────────────────────────────────────
function resolveClaudeBin(): string {
  if (process.env.CLAUDE_BIN) return process.env.CLAUDE_BIN;
  if (process.platform === "win32") {
    const candidates = [
      join(process.env.APPDATA ?? "", "npm", "claude.cmd"),
      join(
        process.env.APPDATA ?? "",
        "npm",
        "node_modules",
        "@anthropic-ai",
        "claude-code",
        "bin",
        "claude.exe",
      ),
    ];
    for (const c of candidates) if (c && existsSync(c)) return c;
  }
  return "claude";
}

// ── Spawn del CLI con stream-json ───────────────────────────────────────
interface ClaudeOutput {
  text: string;
  sessionId: string | null;
  exitCode: number;
}

async function runClaudeCLI(
  prompt: string,
  sessionId?: string | null,
): Promise<ClaudeOutput> {
  const bin = resolveClaudeBin();
  const args = ["-p", prompt, "--output-format", "stream-json", "--verbose"];
  if (sessionId) args.push("--resume", sessionId);

  return new Promise<ClaudeOutput>((resolveOut, reject) => {
    const useShell =
      process.platform === "win32" && (bin.endsWith(".cmd") || bin === "claude");
    const child = spawn(bin, args, { shell: useShell, windowsHide: true });
    if (child.stdin && !child.stdin.destroyed) child.stdin.end();

    let buffer = "";
    let textOut = "";
    let resultOut = "";
    let sid: string | null = null;

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
        const newSid = obj.session_id as string | undefined;
        if (newSid && !sid) sid = newSid;

        if (obj.type === "assistant") {
          const msg = obj.message as { content?: unknown } | undefined;
          if (Array.isArray(msg?.content)) {
            for (const c of msg.content) {
              if (
                c &&
                typeof c === "object" &&
                (c as { type?: string }).type === "text"
              ) {
                const t = (c as { text?: string }).text;
                if (typeof t === "string") textOut += t;
              }
            }
          }
        } else if (obj.type === "result") {
          const r = obj.result as string | undefined;
          if (typeof r === "string") resultOut = r;
        }
      }
    });

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      process.stderr.write(`[claude] ${chunk}`);
    });

    child.on("error", reject);
    child.on("close", (code) => {
      resolveOut({
        text: resultOut || textOut,
        sessionId: sid,
        exitCode: code ?? 1,
      });
    });
  });
}

// ── Job processing ──────────────────────────────────────────────────────
interface ClaudeJob {
  id: string;
  conversation_id: string;
  user_message_id: string;
  status: string;
}

interface MessageRow {
  role: "user" | "assistant" | "system";
  content: string;
  metadata: Record<string, unknown> | null;
  sequence: number;
}

async function claimNextJob(): Promise<ClaudeJob | null> {
  const { data, error } = await admin.rpc("chat_claim_pending_claude_job", {
    p_worker_id: WORKER_ID,
  });
  if (error) {
    console.error("[claim] error:", error.message);
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const job = data as Partial<ClaudeJob>;
  if (!job.id) return null;
  return job as ClaudeJob;
}

async function loadContext(
  conversationId: string,
): Promise<{ prompt: string; sessionId: string | null }> {
  const { data, error } = await admin
    .from("messages")
    .select("role, content, metadata, sequence")
    .eq("conversation_id", conversationId)
    .order("sequence", { ascending: false })
    .limit(40);
  if (error) throw new Error(`load messages: ${error.message}`);
  const rows = (data ?? []) as MessageRow[];

  const lastUser = rows.find((m) => m.role === "user");
  // Reusa la session_id del último assistant para mantener contexto en el CLI.
  const lastAssistantWithSession = rows.find(
    (m) =>
      m.role === "assistant" &&
      m.metadata &&
      typeof (m.metadata as Record<string, unknown>).claude_session_id === "string",
  );

  return {
    prompt: lastUser?.content ?? "",
    sessionId: lastAssistantWithSession
      ? ((lastAssistantWithSession.metadata as Record<string, unknown>)
          .claude_session_id as string)
      : null,
  };
}

async function processJob(job: ClaudeJob): Promise<void> {
  const t0 = Date.now();
  console.log(`[${WORKER_ID}] job=${job.id.slice(0, 8)} start`);
  try {
    const { prompt, sessionId } = await loadContext(job.conversation_id);
    if (!prompt) throw new Error("no user message in conversation");

    const out = await runClaudeCLI(prompt, sessionId);
    if (out.exitCode !== 0 && !out.text) {
      throw new Error(`claude exit=${out.exitCode}, no output`);
    }

    const { error: insertErr } = await admin.from("messages").insert({
      conversation_id: job.conversation_id,
      role: "assistant",
      content: out.text || "(sin respuesta)",
      metadata: {
        job_id: job.id,
        worker_id: WORKER_ID,
        claude_session_id: out.sessionId,
      },
    });
    if (insertErr) throw new Error(`insert assistant: ${insertErr.message}`);

    const { error: updErr } = await admin
      .from("claude_jobs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        error: null,
      })
      .eq("id", job.id);
    if (updErr) throw new Error(`mark completed: ${updErr.message}`);

    console.log(
      `[${WORKER_ID}] job=${job.id.slice(0, 8)} done in ${((Date.now() - t0) / 1000).toFixed(1)}s`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[${WORKER_ID}] job=${job.id.slice(0, 8)} failed:`, msg);
    await admin
      .from("claude_jobs")
      .update({ status: "failed", error: msg })
      .eq("id", job.id);
  }
}

// ── Drain loop (serializa jobs; un CLI a la vez por máquina) ────────────
let draining = false;
async function drain(): Promise<void> {
  if (draining) return;
  draining = true;
  try {
    for (;;) {
      const job = await claimNextJob();
      if (!job) break;
      await processJob(job);
    }
  } finally {
    draining = false;
  }
}

// ── Main: realtime + polling fallback ───────────────────────────────────
async function main() {
  console.log(`[${WORKER_ID}] starting`);
  console.log(`[${WORKER_ID}] supabase=${SUPABASE_URL}`);
  console.log(`[${WORKER_ID}] claude_bin=${resolveClaudeBin()}`);

  const channel = admin
    .channel(`worker:${WORKER_ID}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "claude_jobs" },
      () => {
        void drain();
      },
    )
    .subscribe((status) => {
      console.log(`[${WORKER_ID}] realtime: ${status}`);
    });

  // Drain inicial (toma jobs pre-existentes) + polling fallback cada 30s
  // (red de seguridad si Realtime se cae).
  await drain();
  const interval = setInterval(() => {
    void drain();
  }, 30000);

  const shutdown = async () => {
    console.log(`[${WORKER_ID}] stopping…`);
    clearInterval(interval);
    try {
      await admin.removeChannel(channel);
    } catch {
      /* noop */
    }
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

void main();
