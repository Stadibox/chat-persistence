export interface Conversation {
  id: string;
  user_id: string;
  title: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  user_id: string | null;
  role: "user" | "assistant" | "system";
  content: string;
  sequence: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ClaudeJob {
  id: string;
  conversation_id: string;
  user_message_id: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  worker_id: string | null;
  locked_at: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}
