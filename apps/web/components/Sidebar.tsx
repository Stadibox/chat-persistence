"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Library, Network, Play, Sparkles, PenSquare, MessageSquare } from "lucide-react";
import clsx from "clsx";

const NAV = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/library", label: "Biblioteca", icon: Library },
  { href: "/org", label: "Organigrama", icon: Network },
  { href: "/runs", label: "Ejecuciones", icon: Play },
  { href: "/insights", label: "Insights", icon: Sparkles },
  { href: "/editor", label: "Editor", icon: PenSquare },
  { href: "/chat", label: "Chat", icon: MessageSquare },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-(--color-border) bg-(--color-bg-elev) px-3 py-5 lg:flex">
      <Link href="/" className="mb-8 flex items-center gap-2 px-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-(--color-accent) text-(--color-accent-fg)">
          <span className="text-sm font-bold">S</span>
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">Super Agente</div>
          <div className="text-[11px] text-(--color-fg-dim)">Stadi · v0.1</div>
        </div>
      </Link>

      <nav className="flex flex-col gap-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors duration-160",
                "hover:bg-(--color-bg-card)",
                active
                  ? "bg-(--color-bg-card) text-(--color-fg) shadow-[inset_0_0_0_1px_var(--color-border)]"
                  : "text-(--color-fg-muted)",
              )}
            >
              <Icon
                className={clsx(
                  "h-4 w-4 shrink-0 transition-colors",
                  active
                    ? "text-(--color-accent)"
                    : "text-(--color-fg-dim) group-hover:text-(--color-fg-muted)",
                )}
                strokeWidth={1.75}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-(--color-border) pt-4">
        <div className="rounded-lg border border-(--color-border) bg-(--color-bg-card) p-3 text-[11px] text-(--color-fg-dim)">
          <div className="font-medium text-(--color-fg-muted)">Runtime</div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-(--color-success)" />
            <code className="font-mono">claude</code> CLI
          </div>
        </div>
      </div>
    </aside>
  );
}
