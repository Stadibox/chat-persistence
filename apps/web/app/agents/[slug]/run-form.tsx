"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Play, Loader2 } from "lucide-react";
import { Button } from "@/components/Button";

export function RunForm({ slug }: { slug: string }) {
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          try {
            const res = await fetch("/api/runs", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ agentSlug: slug, input: input.trim() || "Hola." }),
            });
            if (!res.ok) {
              const t = await res.text();
              throw new Error(t || `HTTP ${res.status}`);
            }
            const { runId } = (await res.json()) as { runId: string };
            router.push(`/runs/${runId}`);
          } catch (err) {
            setError((err as Error).message);
          }
        });
      }}
      className="space-y-3"
    >
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={3}
        placeholder="Mensaje al agente · ej. 'Audita el dossier de stadibox-server'"
        className="w-full resize-none rounded-md border border-(--color-border) bg-(--color-bg) px-3 py-2 text-sm text-(--color-fg) placeholder-(--color-fg-dim) outline-none transition-colors duration-160 focus:border-(--color-accent)"
      />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Lanzando…
          </>
        ) : (
          <>
            <Play className="h-3.5 w-3.5" />
            Ejecutar agente
          </>
        )}
      </Button>
      {error && (
        <div className="rounded border border-(--color-danger) bg-[oklch(0.66_0.22_25/0.05)] px-3 py-2 text-xs text-(--color-danger)">
          {error}
        </div>
      )}
    </form>
  );
}
