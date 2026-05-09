import { Sparkles } from "lucide-react";
import { Topbar } from "@/components/Topbar";

export default function InsightsPage() {
  return (
    <>
      <Topbar title="Insights" subtitle="Output del Cartógrafo · F5" />
      <div className="grid place-items-center px-8 py-20">
        <div className="card fade-up max-w-md p-8 text-center">
          <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-(--color-accent-soft) ring-1 ring-(--color-accent)/30">
            <Sparkles className="h-4 w-4 text-(--color-accent)" />
          </div>
          <h2 className="text-base font-semibold">Próximamente</h2>
          <p className="mt-2 text-sm text-(--color-fg-muted)">
            El Cartógrafo correrá un cron diario que genera <code>AGENTS_INDEX.md</code>, detecta
            áreas sin cobertura, cuellos de botella y propone nuevos agentes citando flow_id
            concreto del corpus Stadibox.
          </p>
          <p className="mt-3 text-[11px] text-(--color-fg-dim)">Se prende en F5 · ULTRAPLAN §3.1</p>
        </div>
      </div>
    </>
  );
}
