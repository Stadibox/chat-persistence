import Link from "next/link";
import type { AgentSource } from "@stadi/shared";
import { Badge, StatusDot } from "./Badge";

const STATUS_TONE = {
  active: "success",
  draft: "warning",
  deprecated: "neutral",
} as const;

const AREA_EMOJI: Record<string, string> = {
  tech: "🛠",
  ventas: "💼",
  producto: "📦",
  finanzas: "💸",
  compliance: "🛡",
  qa: "🧪",
  security: "🔒",
  operaciones: "⚙",
  _meta: "✨",
};

export function AgentCard({
  agent,
  index = 0,
}: {
  agent: AgentSource;
  index?: number;
}) {
  const fm = agent.frontmatter;
  const areaIcon = AREA_EMOJI[fm.area] ?? "·";
  return (
    <Link
      href={`/agents/${fm.slug}`}
      className="card card-hover fade-up flex flex-col gap-3 p-4"
      style={{ animationDelay: `${Math.min(index * 35, 400)}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-(--color-bg-elev) ring-1 ring-(--color-border) text-base">
            <span aria-hidden>{areaIcon}</span>
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">{fm.name}</div>
            <div className="text-[11px] text-(--color-fg-dim)">
              <code className="font-mono">{fm.slug}</code>
            </div>
          </div>
        </div>
        <Badge tone={STATUS_TONE[fm.status]}>
          <StatusDot tone={STATUS_TONE[fm.status]} />
          {fm.status}
        </Badge>
      </div>

      <p className="line-clamp-2 text-xs text-(--color-fg-muted)">
        {extractSummary(agent.instructions)}
      </p>

      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-(--color-fg-dim)">
        <Badge tone="neutral">{fm.area}</Badge>
        <span className="font-mono text-[10px]">
          {fm.model.replace("claude-", "")}
        </span>
        {fm.tags.slice(0, 3).map((t) => (
          <span key={t} className="text-(--color-fg-dim)">
            #{t}
          </span>
        ))}
      </div>
    </Link>
  );
}

function extractSummary(instructions: string): string {
  // Toma el primer párrafo después de "# Misión" si existe.
  const missionMatch = instructions.match(/#\s*Misi[oó]n\s*\n+([\s\S]+?)(?=\n#|$)/i);
  const text = (missionMatch?.[1] ?? instructions).replace(/\n+/g, " ").trim();
  return text.length > 180 ? text.slice(0, 180).trimEnd() + "…" : text;
}
