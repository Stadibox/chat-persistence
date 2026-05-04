# Convenciones para agentes operando en este repo

> Este archivo se carga automáticamente cuando un agente Claude Code (o similar) trabaja aquí. Es la versión espejo de `CLAUDE.md` para herramientas que prefieren `AGENTS.md`. Mismo contenido vinculante.

Ver `CLAUDE.md` en la raíz para detalles. Resumen mínimo:

1. **Ningún agente aprueba ni mergea PRs.** Solo humanos del team aprobador.
2. **Stack:** Next 15 + React 19 + Tailwind 4 + Drizzle + Supabase + Anthropic SDK.
3. **Modelos:** Opus 4.7 para meta-agentes; Sonnet 4.6 para operativos.
4. **MD es source of truth** para agentes; DB es espejo.
5. Antes de PR: `pnpm typecheck && pnpm lint && pnpm test`.

Plan maestro: `ULTRAPLAN.md`.
