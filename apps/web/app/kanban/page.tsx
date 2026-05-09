import { Topbar } from "@/components/Topbar";
import { Badge } from "@/components/Badge";
import { MessageSquare, Mail, Video, Hash } from "lucide-react";

export default function KanbanPage() {
  return (
    <>
      <Topbar title="Gestión de Tareas" subtitle="Vista Kanban de tus compromisos unificados" />
      <div className="px-4 py-4 md:px-8 md:py-6">
        <div className="grid h-[calc(100vh-200px)] grid-cols-1 gap-6 md:grid-cols-3">
          {/* Columna Pendiente */}
          <div className="flex flex-col gap-4 rounded-xl border border-(--color-border) bg-(--color-bg-elev)/30 p-3">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-sm font-semibold tracking-wider text-(--color-fg-muted) uppercase">
                Pendiente
              </h2>
              <Badge tone="accent">0</Badge>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto">
              <div className="card flex flex-col items-center justify-center border-2 border-dashed border-(--color-border) bg-(--color-bg-elev) p-4 text-center opacity-50">
                <p className="text-xs text-(--color-fg-dim)">
                  No hay tareas pendientes.
                  <br />
                  El Asistente Unificador las creará automáticamente desde tus canales.
                </p>
              </div>

              {/* Ejemplo visual */}
              <div className="card group cursor-pointer space-y-2 p-3 transition-colors hover:border-(--color-accent)/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-(--color-accent) uppercase">
                    <MessageSquare className="h-3 w-3" /> WhatsApp
                  </div>
                  <span className="text-[10px] text-(--color-fg-dim)">hace 5m</span>
                </div>
                <h3 className="text-sm leading-tight font-medium">Enviar reporte mensual a Paco</h3>
                <p className="line-clamp-2 text-[11px] text-(--color-fg-muted)">
                  Petición detectada en el chat de Stadibox Ops.
                </p>
              </div>

              <div className="card group cursor-pointer space-y-2 p-3 transition-colors hover:border-(--color-accent)/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-blue-400 uppercase">
                    <Mail className="h-3 w-3" /> Gmail
                  </div>
                  <span className="text-[10px] text-(--color-fg-dim)">hace 1h</span>
                </div>
                <h3 className="text-sm leading-tight font-medium">Revisar contrato de servicios</h3>
                <p className="line-clamp-2 text-[11px] text-(--color-fg-muted)">
                  Email de Legal sobre la nueva oficina.
                </p>
              </div>
            </div>
          </div>

          {/* Columna En Progreso */}
          <div className="flex flex-col gap-4 rounded-xl border border-(--color-border) bg-(--color-bg-elev)/30 p-3">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-sm font-semibold tracking-wider text-(--color-fg-muted) uppercase">
                En Progreso
              </h2>
              <Badge tone="warning">1</Badge>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto">
              <div className="card space-y-2 border-l-2 border-l-(--color-warning) p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-purple-400 uppercase">
                    <Video className="h-3 w-3" /> Google Meet
                  </div>
                  <span className="text-[10px] text-(--color-fg-dim)">en vivo</span>
                </div>
                <h3 className="text-sm leading-tight font-medium">Acciones de la Daily</h3>
                <p className="line-clamp-2 text-[11px] text-(--color-fg-muted)">
                  Escuchando reunión... Procesando compromisos en tiempo real.
                </p>
              </div>
            </div>
          </div>

          {/* Columna Terminado */}
          <div className="flex flex-col gap-4 rounded-xl border border-(--color-border) bg-(--color-bg-elev)/30 p-3">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-sm font-semibold tracking-wider text-(--color-fg-muted) uppercase">
                Terminado
              </h2>
              <Badge tone="success">0</Badge>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto">
              <div className="card flex flex-col items-center justify-center border-2 border-dashed border-(--color-border) bg-(--color-bg-elev) p-4 text-center opacity-50">
                <p className="text-xs text-(--color-fg-dim)">Buen trabajo.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
