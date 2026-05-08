# Super Agente Stadi

Hub web para crear, organizar, ejecutar y evolucionar todos los agentes de IA de Stadibox.

> Basado en patrones de PaperClip + corpus de docs Stadibox auditado. Ver [`ULTRAPLAN.md`](./ULTRAPLAN.md) para arquitectura completa, fases y decisiones.

## Estructura

```
apps/
  web/                Next.js 15 (UI + API routes)
packages/
  db/                 Drizzle schema + migrations
  shared/             tipos, validators de dominio
  runtime/            engine de ejecución (Anthropic SDK + tools)
  memory/             memoria persistente (vectores + episódica)
  github-sync/        Octokit pull/push, parser frontmatter
agents/               MD source-of-truth de los agentes
flows/                DAGs (YAML) que componen agentes
docs/                 espejo local del corpus Stadibox
scripts/              seed, sync-corpus, etc.
```

## Setup

```bash
pnpm install
cp .env.example .env.local   # llenar credenciales
pnpm dev
```

## Comandos

|                  |                                           |
| ---------------- | ----------------------------------------- |
| `pnpm dev`       | Levanta `apps/web` en modo desarrollo     |
| `pnpm build`     | Build de producción de todos los packages |
| `pnpm typecheck` | TypeScript en todo el monorepo            |
| `pnpm lint`      | ESLint en todo el monorepo                |
| `pnpm format`    | Prettier write                            |
| `pnpm test`      | Tests en todos los packages               |

## Fase actual

**F0** — bootstrap. Ver `ULTRAPLAN.md` §6 para roadmap completo.
