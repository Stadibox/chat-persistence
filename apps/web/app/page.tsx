export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-12">
      <header className="border-b border-(--color-border) pb-6">
        <h1 className="text-3xl font-semibold">Super Agente Stadi</h1>
        <p className="mt-2 text-(--color-muted-foreground)">
          Hub de agentes de IA de Stadibox · F0 bootstrap
        </p>
      </header>

      <section className="grid gap-3">
        <NavCard href="/library" title="Biblioteca" subtitle="Explora y edita los agentes" />
        <NavCard
          href="/org"
          title="Organigrama"
          subtitle="Estructura de la empresa y agentes por área"
        />
        <NavCard href="/runs" title="Ejecuciones" subtitle="Lanza agentes y flujos" />
        <NavCard
          href="/insights"
          title="Insights"
          subtitle="Output del Cartógrafo: gaps, propuestas, cuellos"
        />
      </section>

      <footer className="mt-auto pt-6 text-sm text-(--color-muted-foreground)">
        F0 — bootstrap. Ver{" "}
        <a className="underline" href="https://github.com" rel="noreferrer" target="_blank">
          ULTRAPLAN.md
        </a>{" "}
        para roadmap.
      </footer>
    </main>
  );
}

function NavCard({ href, title, subtitle }: { href: string; title: string; subtitle: string }) {
  return (
    <a
      className="rounded-lg border border-(--color-border) px-4 py-3 transition hover:bg-(--color-muted)"
      href={href}
    >
      <div className="font-medium">{title}</div>
      <div className="text-sm text-(--color-muted-foreground)">{subtitle}</div>
    </a>
  );
}
