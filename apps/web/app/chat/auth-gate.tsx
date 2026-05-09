"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

export function AuthGate() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setPending(true);
    try {
      const supabase = getSupabaseBrowser();
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        window.location.reload();
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setInfo(
          "Cuenta creada. Si Supabase pide confirmar email, revisa tu correo. Si no, inicia sesión.",
        );
        setMode("signin");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="card fade-up mx-auto max-w-md p-6">
      <h2 className="text-base font-semibold">
        {mode === "signin" ? "Iniciar sesión" : "Crear cuenta"}
      </h2>
      <p className="mt-1 text-xs text-(--color-fg-muted)">
        Auth manejada por Supabase. Las conversaciones se guardan bajo tu user_id.
      </p>
      <div className="mt-4 space-y-3">
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email"
          className="w-full rounded-md border border-(--color-border) bg-(--color-bg) px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
        />
        <input
          type="password"
          required
          minLength={6}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="contraseña (≥6 caracteres)"
          className="w-full rounded-md border border-(--color-border) bg-(--color-bg) px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
        />
        <button
          type="submit"
          disabled={pending}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-(--color-accent) px-3 py-2 text-sm text-(--color-accent-fg) disabled:opacity-50"
        >
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {mode === "signin" ? "Iniciar sesión" : "Crear cuenta"}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setInfo(null);
          }}
          className="w-full text-xs text-(--color-fg-muted) hover:text-(--color-fg)"
        >
          {mode === "signin" ? "¿No tienes cuenta? Crear una" : "¿Ya tienes cuenta? Inicia sesión"}
        </button>
        {error && <p className="text-xs text-(--color-danger)">{error}</p>}
        {info && <p className="text-xs text-(--color-success)">{info}</p>}
      </div>
    </form>
  );
}
