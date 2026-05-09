import { Topbar } from "@/components/Topbar";
import { Badge } from "@/components/Badge";
import { listAgentsFromFs } from "@/lib/agents-fs";

export const dynamic = "force-dynamic";

export default async function OrgPage() {
  const { agents } = await listAgentsFromFs();

  // Tree: empresa -> área -> agentes. F4 cambia a React Flow interactivo.
  const byArea = agents.reduce<Record<string, typeof agents>>((acc, a) => {
    (acc[a.frontmatter.area] ??= []).push(a);
    return acc;
  }, {});
  const order = [
    "_meta",
    "tech",
    "compliance",
    "qa",
    "security",
    "producto",
    "ventas",
    "finanzas",
    "operaciones",
  ];
  const sorted = Object.keys(byArea).sort((a, b) => order.indexOf(a) - order.indexOf(b));

  return (
    <>
      <Topbar title="Organigrama" subtitle="Vista provisional · F4 trae React Flow interactivo" />

      <div className="px-8 py-10">
        <div className="mx-auto max-w-3xl">
          <div className="card fade-up mx-auto w-fit px-6 py-3 text-center">
            <div className="text-[11px] font-medium tracking-widest text-(--color-fg-muted) uppercase">
              Stadibox
            </div>
            <div className="text-lg font-semibold">Super Agente Hub</div>
          </div>

          <div className="mx-auto my-3 h-8 w-px bg-(--color-border)" />

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {sorted.map((area, i) => {
              const items = byArea[area] ?? [];
              return (
                <div
                  key={area}
                  className="card fade-up p-4"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-sm font-semibold">{area}</h3>
                    <Badge tone="neutral">{items.length}</Badge>
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {items.map((a) => (
                      <li key={a.frontmatter.slug}>
                        <a
                          href={`/agents/${a.frontmatter.slug}`}
                          className="flex items-center justify-between rounded px-2 py-1 text-xs transition-colors duration-160 hover:bg-(--color-bg-elev)"
                        >
                          <span className="truncate">{a.frontmatter.name}</span>
                          <code className="font-mono text-[10px] text-(--color-fg-dim)">
                            {a.frontmatter.model.replace("claude-", "")}
                          </code>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
