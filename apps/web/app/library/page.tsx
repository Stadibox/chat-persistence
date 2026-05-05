import { listAgentsFromFs } from "@/lib/agents-fs";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const { agents, failures } = await listAgentsFromFs();

  const byArea = agents.reduce<Record<string, typeof agents>>((acc, a) => {
    const area = a.frontmatter.area;
    (acc[area] ??= []).push(a);
    return acc;
  }, {});

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 p-12">
      <header className="flex items-baseline justify-between border-b border-(--color-border) pb-6">
        <div>
          <h1 className="text-3xl font-semibold">Biblioteca</h1>
          <p className="mt-2 text-(--color-muted-foreground)">
            {agents.length} agentes leídos de <code>agents/</code> · F1 (sin DB todavía)
          </p>
        </div>
        <a className="text-sm text-(--color-muted-foreground) underline" href="/">
          ← inicio
        </a>
      </header>

      {failures.length > 0 && (
        <section className="rounded-lg border border-red-500/40 bg-red-500/5 p-4 text-sm">
          <div className="font-medium text-red-500">
            {failures.length} archivo(s) no pasaron el schema:
          </div>
          <ul className="mt-2 space-y-1">
            {failures.map((f) => (
              <li key={f.path}>
                <code>{f.path}</code> — {f.errors.join(" · ")}
              </li>
            ))}
          </ul>
        </section>
      )}

      {Object.entries(byArea)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([area, items]) => (
          <section key={area} className="grid gap-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-(--color-muted-foreground)">
              {area} · {items.length}
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {items.map((a) => (
                <article
                  key={a.frontmatter.slug}
                  className="rounded-lg border border-(--color-border) p-4"
                >
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-medium">{a.frontmatter.name}</h3>
                    <span className="text-xs text-(--color-muted-foreground)">
                      {a.frontmatter.status}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-(--color-muted-foreground)">
                    <code>{a.frontmatter.slug}</code> · {a.frontmatter.model}
                  </div>
                  {a.frontmatter.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {a.frontmatter.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded border border-(--color-border) px-1.5 py-0.5 text-[10px] text-(--color-muted-foreground)"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))}
    </main>
  );
}
