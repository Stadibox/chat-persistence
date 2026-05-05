import { Topbar } from "@/components/Topbar";
import { AgentCard } from "@/components/AgentCard";
import { listAgentsFromFs } from "@/lib/agents-fs";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const { agents, failures } = await listAgentsFromFs();

  const byArea = agents.reduce<Record<string, typeof agents>>((acc, a) => {
    const k = a.frontmatter.area;
    (acc[k] ??= []).push(a);
    return acc;
  }, {});
  const areaOrder = ["_meta", "tech", "compliance", "qa", "security", "producto", "ventas", "finanzas", "operaciones"];
  const sortedAreas = Object.keys(byArea).sort((a, b) => {
    const ia = areaOrder.indexOf(a);
    const ib = areaOrder.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  return (
    <>
      <Topbar
        title="Biblioteca"
        subtitle={`${agents.length} agentes · agrupados por área`}
      />

      {failures.length > 0 && (
        <div className="mx-8 mt-6 rounded-lg border border-(--color-danger) bg-[oklch(0.66_0.22_25/0.05)] p-4 text-sm">
          <div className="font-medium text-(--color-danger)">
            {failures.length} archivo(s) inválido(s):
          </div>
          <ul className="mt-2 space-y-1 text-(--color-fg-muted)">
            {failures.map((f) => (
              <li key={f.path}>
                <code>{f.path}</code> — {f.errors.join(" · ")}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-10 px-8 py-8">
        {sortedAreas.map((area, areaIdx) => {
          const items = byArea[area] ?? [];
          return (
            <section key={area}>
              <div className="mb-3 flex items-baseline gap-3">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-(--color-fg-muted)">
                  {area}
                </h2>
                <span className="text-[11px] text-(--color-fg-dim)">
                  {items.length} {items.length === 1 ? "agente" : "agentes"}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((a, i) => (
                  <AgentCard
                    key={a.frontmatter.slug}
                    agent={a}
                    index={areaIdx * 4 + i}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
