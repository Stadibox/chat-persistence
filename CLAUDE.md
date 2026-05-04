# CLAUDE.md — convenciones para asistentes IA en este repo

Documento corto que se carga automáticamente. Reglas para Claude Code (y cualquier agente que toque este repo) cuando colabora con humanos.

## Regla #1 — Aprobación humana, sin excepciones

Ningún agente, bot, GitHub App ni automatización puede aprobar ni mergear PRs en `super-agente-Stadi` ni en el repo hermano `stadi-agents`. Si eres un agente: abres PR, esperas review humano, **no auto-mergeas**, **no usas `--no-verify`**, **no haces force-push**. Detalle en `ULTRAPLAN.md` §8.

## Stack

- Node 22, pnpm 9 monorepo
- Next.js 15 App Router + React 19 + Tailwind 4 (`apps/web`)
- TypeScript estricto en todo (`tsconfig.base.json`)
- Drizzle ORM + Postgres (Supabase) (`packages/db`)
- **`claude` CLI local** como runtime (igual que PaperClip). NO usamos `@anthropic-ai/sdk` ni `ANTHROPIC_API_KEY`. El runtime spawnea `claude --output-format stream-json` y parsea NDJSON. Auth y prompt-cache los maneja el CLI.
- Modelos: **Opus 4.7** para meta-agentes (Cartógrafo, Coach, Reflector); **Sonnet 4.6** para agentes operativos. Decidido en `ULTRAPLAN.md` §7 Q3.
- Hosting: server local-first (no Vercel — serverless no puede spawnear el CLI).

## Convenciones de código

- ESM en todo (`"type": "module"`)
- Import paths internos por workspace: `@stadi/shared`, `@stadi/db`, `@stadi/runtime`, `@stadi/memory`, `@stadi/github-sync`
- Nombres de tabla y columna en `snake_case`; tipos TS en `camelCase`
- Zod para todo el contrato de I/O entre packages y APIs
- No comentarios decorativos. Sí comentarios para invariantes no obvios o referencias a ULTRAPLAN/PaperClip

## Agentes (archivos MD)

- Source of truth: `agents/**/*.md` con frontmatter YAML que pasa `agentFrontmatterSchema` (`packages/shared/src/agent.ts`)
- DB es espejo, no source. Si MD y DB difieren, MD gana
- Cuando se edita un agente desde la UI, se hace branch + PR a `stadi-agents`. Nunca commit directo a `main`

## Comandos comunes

```bash
pnpm dev            # apps/web en :3000
pnpm typecheck      # en todo el monorepo
pnpm lint           # en todo el monorepo
pnpm test           # en todo el monorepo
pnpm format         # prettier write
```

## Antes de abrir PR

1. `pnpm typecheck` verde
2. `pnpm lint` verde
3. `pnpm test` verde
4. Frontmatter de cualquier agente tocado pasa el schema
5. Sin secretos en diff (`.env.local` está en `.gitignore`)

## Referencia rápida

- Plan completo: `ULTRAPLAN.md`
- Branch protection: `.github/branch-protection.md`
- Owners: `.github/CODEOWNERS`
- Patrones espejo de PaperClip: `ULTRAPLAN.md` Apéndice B
