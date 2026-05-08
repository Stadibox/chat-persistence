import { randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { ChatMessage, ClaudeJob } from "@/lib/supabase/types";

const WORKER_ID = `worker-${process.pid}-${randomUUID().slice(0, 8)}`;
const MAX_PER_TICK = 5;

// Placeholder limpio. Reemplazable por:
//   - spawn del `claude` CLI local (ver apps/web/app/api/chat/route.ts)
//   - SSH a un host con CLI instalado
//   - Anthropic API directa
// La firma sólo asume role+content; quien la implemente decide cómo formatea.
export type ConversationTurn = Pick<ChatMessage, "role" | "content">;
export type ClaudeRunner = (turns: ConversationTurn[]) => Promise<string>;

const defaultRunner: ClaudeRunner = async () => {
  return "Claude response placeholder";
};

let runner: ClaudeRunner = defaultRunner;
export function setClaudeRunner(fn: ClaudeRunner): void {
  runner = fn;
}

export async function processPendingClaudeJobs(): Promise<{
  processed: number;
  workerId: string;
}> {
  const admin = getSupabaseAdmin();
  let processed = 0;
  for (let i = 0; i < MAX_PER_TICK; i += 1) {
    const job = await claimNextJob(admin);
    if (!job) break;
    await runJob(admin, job);
    processed += 1;
  }
  return { processed, workerId: WORKER_ID };
}

async function claimNextJob(admin: ReturnType<typeof getSupabaseAdmin>): Promise<ClaudeJob | null> {
  const { data, error } = await admin.rpc("chat_claim_pending_claude_job", {
    p_worker_id: WORKER_ID,
  });
  if (error) {
    console.error("chat_claim_pending_claude_job error:", error.message);
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const job = data as Partial<ClaudeJob>;
  if (!job.id) return null;
  return job as ClaudeJob;
}

async function runJob(admin: ReturnType<typeof getSupabaseAdmin>, job: ClaudeJob): Promise<void> {
  try {
    const turns = await loadTurns(admin, job.conversation_id);
    const responseText = await runner(turns);

    const { error: insertErr } = await admin.from("messages").insert({
      conversation_id: job.conversation_id,
      role: "assistant",
      content: responseText,
      metadata: { job_id: job.id, worker_id: WORKER_ID },
    });
    if (insertErr) throw new Error(`insert assistant: ${insertErr.message}`);

    const { error: updateErr } = await admin
      .from("claude_jobs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        error: null,
      })
      .eq("id", job.id);
    if (updateErr) throw new Error(`mark completed: ${updateErr.message}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("worker job failed:", job.id, message);
    await admin.from("claude_jobs").update({ status: "failed", error: message }).eq("id", job.id);
  }
}

async function loadTurns(
  admin: ReturnType<typeof getSupabaseAdmin>,
  conversationId: string,
): Promise<ConversationTurn[]> {
  const { data, error } = await admin
    .from("messages")
    .select("role, content, sequence")
    .eq("conversation_id", conversationId)
    .order("sequence", { ascending: true });
  if (error) throw new Error(`load messages: ${error.message}`);
  return (data ?? []).map((m) => ({
    role: m.role as ConversationTurn["role"],
    content: m.content as string,
  }));
}
