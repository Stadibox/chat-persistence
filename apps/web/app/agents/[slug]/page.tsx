import { notFound } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Topbar } from "@/components/Topbar";
import { Badge, StatusDot } from "@/components/Badge";
import { getAgentBySlug } from "@/lib/agents-fs";
import { RunForm } from "./run-form";

export const dynamic = "force-dynamic";

export default async function AgentDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const agent = await getAgentBySlug(slug);
  if (!agent) notFound();
  const fm = agent.frontmatter;

  return (
    <>
      <Topbar
        title={fm.name}
        subtitle={
          <>
            <code className="font-mono text-xs">{fm.slug}</code> · {fm.area} ·{" "}
            <span className="font-mono text-xs">{fm.model}</span>
          </>
        }
        actions={
          <Link href="/library" className="text-xs text-(--color-fg-muted) hover:text-(--color-fg)">
            ← biblioteca
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-6 px-8 py-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="card fade-up p-6">
          <article className="prose-stadi">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{agent.instructions}</ReactMarkdown>
          </article>
        </div>

        <aside className="space-y-4">
          <div className="card fade-up p-5" style={{ animationDelay: "40ms" }}>
            <h3 className="text-xs font-semibold tracking-widest text-(--color-fg-muted) uppercase">
              Lanzar ejecución
            </h3>
            <p className="mt-1 text-xs text-(--color-fg-dim)">
              Spawnea <code className="font-mono">claude</code> CLI con las instrucciones de este
              agente.
            </p>
            <div className="mt-4">
              <RunForm slug={fm.slug} />
            </div>
          </div>

          <div className="card fade-up p-5" style={{ animationDelay: "80ms" }}>
            <h3 className="text-xs font-semibold tracking-widest text-(--color-fg-muted) uppercase">
              Metadata
            </h3>
            <dl className="mt-3 space-y-2 text-xs">
              <Field label="Status">
                <Badge tone={fm.status === "active" ? "success" : "warning"}>
                  <StatusDot tone={fm.status === "active" ? "success" : "warning"} />
                  {fm.status}
                </Badge>
              </Field>
              <Field label="Owner">
                <code className="text-[11px]">{fm.owner}</code>
              </Field>
              <Field label="Modelo">
                <code className="font-mono text-[11px]">{fm.model}</code>
              </Field>
              <Field label="Source">
                <code className="text-[11px] text-(--color-fg-dim)">{agent.sourcePath}</code>
              </Field>
              <Field label="SHA">
                <code className="font-mono text-[10px] text-(--color-fg-dim)">
                  {agent.sourceSha}
                </code>
              </Field>
            </dl>
            {fm.toolsAllowed.length > 0 && (
              <div className="mt-4">
                <div className="mb-1.5 text-[11px] font-medium text-(--color-fg-muted)">Tools</div>
                <div className="flex flex-wrap gap-1">
                  {fm.toolsAllowed.map((t) => (
                    <code
                      key={t}
                      className="rounded border border-(--color-border) bg-(--color-bg-elev) px-1.5 py-0.5 font-mono text-[10px] text-(--color-fg-muted)"
                    >
                      {t}
                    </code>
                  ))}
                </div>
              </div>
            )}
            {fm.tags.length > 0 && (
              <div className="mt-4">
                <div className="mb-1.5 text-[11px] font-medium text-(--color-fg-muted)">Tags</div>
                <div className="flex flex-wrap gap-1 text-[11px] text-(--color-fg-dim)">
                  {fm.tags.map((t) => (
                    <span key={t}>#{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-(--color-fg-dim)">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
