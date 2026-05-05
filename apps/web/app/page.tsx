import Link from "next/link";
import { ArrowRight, Play, Sparkles, Users } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { Badge, StatusDot } from "@/components/Badge";
import { listAgentsFromFs } from "@/lib/agents-fs";
import { listRuns } from "@/lib/run-store";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [{ agents }, runs] = await Promise.all([listAgentsFromFs(), listRuns(8)]);
  const byStatus = agents.reduce(
    (acc, a) => {
      acc[a.frontmatter.status] = (acc[a.frontmatter.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const areas = new Set(agents.map((a) => a.frontmatter.area));

  return (
    <>
      <Topbar
        title="Hola, Paco"
        subtitle="Hub de agentes de Stadibox · estado del día"
      />

      <section className="grid grid-cols-1 gap-3 px-8 py-6 md:grid-cols-4">
        <KpiCard label="Agentes" value={agents.length} hint={`${areas.size} áreas`} />
        <KpiCard
          label="Activos"
          value={byStatus.active ?? 0}
          hint={`${byStatus.draft ?? 0} en draft`}
          tone="success"
        />
        <KpiCard
          label="Ejecuciones"
          value={runs.length}
          hint={runs.length === 0 ? "ninguna aún" : "recientes"}
          tone="accent"
        />
        <KpiCard label="Cuellos detectados" value="—" hint="F5 · Cartógrafo" tone="neutral" />
      </section>

      <section className="grid grid-cols-1 gap-6 px-8 pb-10 lg:grid-cols-3">
        <div className="card lg:col-span-2 fade-up">
          <div className="flex items-center justify-between border-b border-(--color-border) px-5 py-3">
            <h2 className="text-sm font-semibold">Ejecuciones recientes</h2>
            <Link
              className="text-xs text-(--color-fg-muted) hover:text-(--color-fg)"
              href="/runs"
            >
              ver todo →
            </Link>
          </div>
          {runs.length === 0 ? (
            <EmptyRuns />
          ) : (
            <ul className="divide-y divide-(--color-border)">
              {runs.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/runs/${r.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-(--color-bg-elev) transition-colors duration-160"
                  >
                    <div className="flex items-center gap-3">
                      <StatusDot tone={runStatusTone(r.status)} />
                      <div>
                        <div className="text-sm font-medium">{r.agentName}</div>
                        <div className="text-[11px] text-(--color-fg-dim)">
                          <code>{r.id.slice(0, 8)}</code> · {r.startedAt}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-(--color-fg-dim)" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card fade-up p-5" style={{ animationDelay: "60ms" }}>
          <h2 className="text-sm font-semibold">Acciones rápidas</h2>
          <div className="mt-4 grid gap-2">
            <QuickLink
              href="/library"
              icon={<Users className="h-4 w-4" />}
              label="Ver biblioteca"
              hint={`${agents.length} agentes`}
            />
            <QuickLink
              href="/runs"
              icon={<Play className="h-4 w-4" />}
              label="Lanzar ejecución"
              hint="elige agente y corre"
            />
            <QuickLink
              href="/insights"
              icon={<Sparkles className="h-4 w-4" />}
              label="Insights"
              hint="próximamente"
              disabled
            />
          </div>
        </div>
      </section>
    </>
  );
}

function KpiCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: "neutral" | "accent" | "success";
}) {
  return (
    <div className="card fade-up p-4">
      <div className="text-xs uppercase tracking-wide text-(--color-fg-dim)">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-3xl font-semibold tracking-tight">{value}</span>
        {hint && (
          <span className="text-xs text-(--color-fg-muted)">{hint}</span>
        )}
      </div>
      <div className="mt-3 flex items-center gap-1">
        <Badge tone={tone}>
          <StatusDot tone={tone} />
          live
        </Badge>
      </div>
    </div>
  );
}

function EmptyRuns() {
  return (
    <div className="px-5 py-10 text-center text-sm text-(--color-fg-muted)">
      <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-(--color-bg-elev) ring-1 ring-(--color-border) mb-2">
        <Play className="h-4 w-4" />
      </div>
      Aún no has lanzado ningún agente.
      <br />
      <Link className="text-(--color-accent) underline-offset-4 hover:underline" href="/library">
        Elige uno de la biblioteca →
      </Link>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  label,
  hint,
  disabled,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  const cls =
    "flex items-center justify-between rounded-md border border-(--color-border) bg-(--color-bg) px-3 py-2.5 text-sm transition-colors duration-160";
  if (disabled) {
    return (
      <div className={cls + " opacity-50 cursor-not-allowed"}>
        <span className="flex items-center gap-2.5">
          {icon}
          {label}
        </span>
        {hint && <span className="text-[11px] text-(--color-fg-dim)">{hint}</span>}
      </div>
    );
  }
  return (
    <Link href={href} className={cls + " hover:bg-(--color-bg-elev) hover:border-(--color-border-strong)"}>
      <span className="flex items-center gap-2.5">
        {icon}
        {label}
      </span>
      {hint && <span className="text-[11px] text-(--color-fg-dim)">{hint}</span>}
    </Link>
  );
}

function runStatusTone(s: string) {
  if (s === "running" || s === "queued") return "accent" as const;
  if (s === "succeeded") return "success" as const;
  if (s === "failed") return "danger" as const;
  return "neutral" as const;
}
