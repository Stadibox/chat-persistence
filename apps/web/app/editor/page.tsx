import { PenSquare } from "lucide-react";
import { Topbar } from "@/components/Topbar";

export default function EditorPage() {
  return (
    <>
      <Topbar title="Editor" subtitle="Edición y publicación de agentes · F3" />
      <div className="grid place-items-center px-8 py-20">
        <div className="card fade-up max-w-md p-8 text-center">
          <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-(--color-bg-elev) ring-1 ring-(--color-border)">
            <PenSquare className="h-4 w-4" />
          </div>
          <h2 className="text-base font-semibold">Próximamente</h2>
          <p className="mt-2 text-sm text-(--color-fg-muted)">
            Editor MDX con preview lado a lado, validación de frontmatter en vivo, test-run en
            sandbox y commit → PR a <code>stadi-agents</code>.
          </p>
          <p className="mt-3 text-[11px] text-(--color-fg-dim)">F3 · ULTRAPLAN §4.5</p>
        </div>
      </div>
    </>
  );
}
