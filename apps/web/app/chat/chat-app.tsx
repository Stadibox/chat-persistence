"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Loader2,
  LogOut,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  User,
} from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import {
  listConversations,
  listJobsForConversation,
  listMessages,
  sendMessageInConversation,
  startConversation,
} from "@/lib/chat/repo";
import type {
  ChatMessage,
  ClaudeJob,
  Conversation,
} from "@/lib/supabase/types";

interface Props {
  userId: string;
  userEmail: string;
}

export function ChatApp({ userId, userEmail }: Props) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [jobs, setJobs] = useState<ClaudeJob[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1) Carga lista de conversaciones al montar
  useEffect(() => {
    listConversations(supabase)
      .then(setConversations)
      .catch((e) => setError((e as Error).message));
  }, [supabase]);

  // 2) Cuando cambia la conversación activa, carga sus mensajes y jobs
  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      setJobs([]);
      return;
    }
    let cancelled = false;
    Promise.all([
      listMessages(supabase, activeId),
      listJobsForConversation(supabase, activeId),
    ])
      .then(([m, j]) => {
        if (cancelled) return;
        setMessages(m);
        setJobs(j);
      })
      .catch((e) => !cancelled && setError((e as Error).message));
    return () => {
      cancelled = true;
    };
  }, [supabase, activeId]);

  // 3) Realtime — sólo para la conversación activa, sólo INSERT de mensajes y
  //    cambios de status de jobs. No usamos Realtime para streaming de tokens.
  useEffect(() => {
    if (!activeId) return;
    const channel = supabase
      .channel(`conv:${activeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeId}`,
        },
        (payload) => {
          const m = payload.new as ChatMessage;
          setMessages((prev) =>
            prev.some((x) => x.id === m.id)
              ? prev
              : [...prev, m].sort((a, b) => a.sequence - b.sequence),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "claude_jobs",
          filter: `conversation_id=eq.${activeId}`,
        },
        (payload) => {
          const j = payload.new as ClaudeJob;
          setJobs((prev) =>
            prev.some((x) => x.id === j.id) ? prev : [j, ...prev],
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "claude_jobs",
          filter: `conversation_id=eq.${activeId}`,
        },
        (payload) => {
          const j = payload.new as ClaudeJob;
          setJobs((prev) => prev.map((x) => (x.id === j.id ? j : x)));
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, activeId]);

  // Auto-scroll al final cuando llegan mensajes/jobs
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, jobs]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setError(null);
    setInput("");
    setSending(true);
    try {
      if (activeId) {
        const { message, job } = await sendMessageInConversation(
          supabase,
          activeId,
          text,
        );
        setMessages((prev) =>
          prev.some((x) => x.id === message.id)
            ? prev
            : [...prev, message].sort((a, b) => a.sequence - b.sequence),
        );
        setJobs((prev) => (prev.some((x) => x.id === job.id) ? prev : [job, ...prev]));
      } else {
        const { conversation, message, job } = await startConversation(
          supabase,
          text,
        );
        setConversations((prev) => [conversation, ...prev]);
        setActiveId(conversation.id);
        setMessages([message]);
        setJobs([job]);
      }
      // Worker local subscribe Realtime → recoge el job solo, sin HTTP.
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }, [activeId, input, sending, supabase]);

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  function startNew() {
    setActiveId(null);
    setMessages([]);
    setJobs([]);
    setError(null);
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.reload();
  }

  const latestJob = jobs[0];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside
        className="card hidden lg:flex flex-col overflow-hidden"
        style={{ height: "calc(100vh - 180px)" }}
      >
        <div className="flex items-center justify-between border-b border-(--color-border) bg-(--color-bg-elev) px-3 py-2.5">
          <span className="text-xs font-medium">Conversaciones</span>
          <button
            onClick={startNew}
            className="grid h-6 w-6 place-items-center rounded bg-(--color-accent) text-(--color-accent-fg) hover:opacity-90"
            aria-label="Nueva"
            title="Nueva conversación"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <ul className="flex-1 overflow-y-auto py-1">
          {conversations.length === 0 ? (
            <li className="px-3 py-4 text-center text-xs text-(--color-fg-dim)">
              Aún no hay conversaciones.
            </li>
          ) : (
            conversations.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setActiveId(c.id)}
                  className={`flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-(--color-bg-elev) ${
                    activeId === c.id ? "bg-(--color-bg-elev)" : ""
                  }`}
                >
                  <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-(--color-fg-dim)" />
                  <span className="line-clamp-2 flex-1">
                    {c.title ?? "(sin título)"}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
        <div className="border-t border-(--color-border) bg-(--color-bg-elev) px-3 py-2 text-[11px] text-(--color-fg-dim)">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate">{userEmail}</span>
            <button
              onClick={signOut}
              className="grid h-6 w-6 place-items-center rounded text-(--color-fg-muted) hover:text-(--color-fg)"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      <div
        className="card flex flex-col overflow-hidden h-[calc(100vh-140px)] lg:h-[calc(100vh-180px)]"
      >
        <div className="flex items-center justify-between border-b border-(--color-border) bg-(--color-bg-elev) px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-(--color-accent)" />
            <span className="text-xs font-medium">claude (worker)</span>
            {latestJob && (
              <span className="text-[11px] text-(--color-fg-dim)">
                · job {latestJob.status}
              </span>
            )}
          </div>
          {!activeId && (
            <span className="text-[11px] text-(--color-fg-dim)">
              empieza escribiendo abajo
            </span>
          )}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-(--color-fg-dim)">
              <div className="text-center">
                <div className="mx-auto mb-2 grid h-8 w-8 place-items-center rounded-full bg-(--color-bg-elev) ring-1 ring-(--color-border)">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                {activeId
                  ? "Esta conversación aún no tiene mensajes."
                  : "Empieza una conversación nueva."}
              </div>
            </div>
          ) : (
            messages.map((m) => <MessageRow key={m.id} message={m} />)
          )}
          {(latestJob?.status === "pending" ||
            latestJob?.status === "running") && <PendingRow status={latestJob.status} />}
          {latestJob?.status === "failed" && (
            <ErrorRow message={latestJob.error ?? "(sin detalle)"} />
          )}
        </div>

        {error && (
          <div className="border-t border-(--color-danger) bg-[oklch(0.66_0.22_25/0.05)] px-4 py-2 text-xs text-(--color-danger)">
            {error}
          </div>
        )}

        <div className="border-t border-(--color-border) bg-(--color-bg-elev) p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={2}
              placeholder="Escribe un mensaje. Enter para enviar, Shift+Enter para nueva línea."
              className="flex-1 resize-none rounded-md border border-(--color-border) bg-(--color-bg) px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
              disabled={sending}
            />
            <button
              onClick={() => void send()}
              disabled={sending || input.trim().length === 0}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-(--color-accent) text-(--color-accent-fg) transition-opacity disabled:opacity-50"
              aria-label="Enviar"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageRow({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`fade-up flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ring-1 ring-inset ${
          isUser
            ? "bg-(--color-accent-soft) ring-(--color-accent)/30 text-(--color-accent)"
            : "bg-(--color-bg-elev) ring-(--color-border) text-(--color-fg-muted)"
        }`}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
      </div>
      <div
        className={`flex max-w-[80%] flex-col gap-1.5 ${isUser ? "items-end" : "items-start"}`}
      >
        <div
          className={`rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? "bg-(--color-accent) text-(--color-accent-fg)"
              : "bg-(--color-bg-elev) text-(--color-fg) ring-1 ring-inset ring-(--color-border)"
          }`}
        >
          {message.content}
        </div>
      </div>
    </div>
  );
}

function PendingRow({ status }: { status: ClaudeJob["status"] }) {
  return (
    <div className="fade-up flex items-center gap-2 text-[11px] text-(--color-fg-dim)">
      <Loader2 className="h-3 w-3 animate-spin" />
      job {status}…
    </div>
  );
}

function ErrorRow({ message }: { message: string }) {
  return (
    <div className="fade-up rounded-md ring-1 ring-inset ring-(--color-danger)/30 bg-[oklch(0.66_0.22_25/0.05)] p-3 text-xs text-(--color-danger)">
      <div className="font-medium">job falló</div>
      <pre className="mt-1 whitespace-pre-wrap font-mono text-[11px]">{message}</pre>
    </div>
  );
}
