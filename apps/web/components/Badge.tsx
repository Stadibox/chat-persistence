import clsx from "clsx";
import type { ReactNode } from "react";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

const TONE: Record<Tone, string> = {
  neutral: "bg-(--color-bg-elev) text-(--color-fg-muted) ring-(--color-border)",
  accent: "bg-(--color-accent-soft) text-(--color-accent) ring-(--color-accent)/30",
  success: "bg-[oklch(0.74_0.16_145/0.12)] text-(--color-success) ring-[oklch(0.74_0.16_145/0.3)]",
  warning: "bg-[oklch(0.78_0.16_80/0.12)] text-(--color-warning) ring-[oklch(0.78_0.16_80/0.3)]",
  danger: "bg-[oklch(0.66_0.22_25/0.12)] text-(--color-danger) ring-[oklch(0.66_0.22_25/0.3)]",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        TONE[tone],
      )}
    >
      {children}
    </span>
  );
}

export function StatusDot({ tone = "neutral" }: { tone?: Tone }) {
  return (
    <span
      className={clsx("inline-block h-1.5 w-1.5 rounded-full", {
        "bg-(--color-fg-dim)": tone === "neutral",
        "bg-(--color-accent)": tone === "accent",
        "bg-(--color-success)": tone === "success",
        "bg-(--color-warning)": tone === "warning",
        "bg-(--color-danger)": tone === "danger",
      })}
    />
  );
}
