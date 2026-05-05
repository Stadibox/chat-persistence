import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ChatMessage,
  ClaudeJob,
  Conversation,
} from "@/lib/supabase/types";

// =========================================================================
// Lecturas — todas filtradas por RLS (cada user sólo ve lo suyo)
// =========================================================================

export async function listConversations(
  client: SupabaseClient,
): Promise<Conversation[]> {
  const { data, error } = await client
    .from("conversations")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Conversation[];
}

export async function listMessages(
  client: SupabaseClient,
  conversationId: string,
): Promise<ChatMessage[]> {
  const { data, error } = await client
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("sequence", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ChatMessage[];
}

export async function listJobsForConversation(
  client: SupabaseClient,
  conversationId: string,
): Promise<ClaudeJob[]> {
  const { data, error } = await client
    .from("claude_jobs")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ClaudeJob[];
}

// =========================================================================
// Escrituras — vía RPCs atómicos definidos en 0001_chat_schema.sql
// =========================================================================

export interface StartConversationResult {
  conversation: Conversation;
  message: ChatMessage;
  job: ClaudeJob;
}

// Crea conversación + primer mensaje del usuario + job pendiente en una sola
// transacción del lado de Postgres. RLS aplica via SECURITY INVOKER.
export async function startConversation(
  client: SupabaseClient,
  content: string,
): Promise<StartConversationResult> {
  const { data, error } = await client.rpc("chat_start_conversation_with_message", {
    p_content: content,
  });
  if (error) throw error;
  return data as StartConversationResult;
}

export interface SendMessageResult {
  message: ChatMessage;
  job: ClaudeJob;
}

// Inserta mensaje del usuario + job pendiente en una conversación existente.
export async function sendMessageInConversation(
  client: SupabaseClient,
  conversationId: string,
  content: string,
): Promise<SendMessageResult> {
  const { data, error } = await client.rpc("chat_send_message_in_conversation", {
    p_conversation_id: conversationId,
    p_content: content,
  });
  if (error) throw error;
  return data as SendMessageResult;
}

// Hint a la UI para arrancar el worker apenas se inserta un job.
// No bloqueante; si falla, el worker eventualmente lo recoge en un tick.
export function pingWorker(): void {
  void fetch("/api/chat/worker/tick", { method: "POST" }).catch(() => {});
}
