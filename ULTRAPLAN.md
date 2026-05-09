# ULTRAPLAN — Super Agente Stadi

**Owner:** Paco (Paco@stadibox.com)
**Fecha:** 2026-05-04
**Repo:** `super-agente-Stadi` (local, recién inicializado)

> Hub web para crear, organizar, ejecutar y evolucionar todos los agentes de IA de Stadibox. Replica la lógica de **PaperClip** (almacén + ejecución + memoria) y se alimenta del corpus de docs ya producido por los pipelines de auditoría (`/.paperclip/.../docs`).

---

## 1. Decisión clave: ¿MD en GitHub o Supabase?

**Respuesta: las dos. Híbrido con una source of truth clara.**

| Capa                  | Dónde vive                                    | Qué guarda                                                                                   | Por qué                                                                                                                                                  |
| --------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Source of truth**   | Repo Git (`agents/*.md` con frontmatter YAML) | Definición canónica de cada agente: identidad, instrucciones, tools, owner, área, conexiones | Diffeable, revisable por PR, compatible con skills de Claude Code, copiable a otras máquinas, idéntico al patrón de PaperClip (`skills/{name}/SKILL.md`) |
| **Runtime index**     | Supabase (Postgres + pgvector)                | Tabla espejo del MD + embeddings + métricas de runs + memory persistente + activity log      | Queries rápidas, búsqueda semántica, realtime para la UI, joins con datos de Stadibox                                                                    |
| **Logs de ejecución** | Filesystem local + Supabase Storage           | NDJSON por run (igual que PaperClip `~/.paperclip/instances/{id}/runs/`)                     | Append-only barato; replicado a storage para consulta cross-device                                                                                       |
| **Cache de prompts**  | Filesystem local (`.cache/prompt-cache/`)     | Prefijos cacheables para Anthropic prompt cache                                              | TTL 5min de Anthropic; misma estrategia que `packages/adapters/claude-local/src/server/prompt-cache.ts`                                                  |

**Flujo de sincronización:**

```
PR a agents/*.md  ──merge──▶  GitHub Action  ──parse+embed──▶  Supabase upsert
                                                              └─▶ Notifica UI vía Supabase Realtime
Edit desde UI ──Server Action──▶ Commit a branch ──PR auto──▶ Merge tras CI
```

**Por qué no solo MD:** sin DB no hay búsqueda semántica, ni métricas, ni cuellos de botella, ni memoria persistente cross-agent.
**Por qué no solo Supabase:** sin Git no hay revisión humana, ni reversibilidad, ni compatibilidad con skills de Claude Code, ni portabilidad.

---

## 2. Arquitectura — espejo de PaperClip

### 2.1 Stack (decidido por afinidad con PaperClip y velocidad)

| Capa          | Elección                                                                                                                                           | Justificación                                                                                                                                                                                                           |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lenguaje      | TypeScript estricto                                                                                                                                | Igual que PaperClip; un solo lenguaje front+back                                                                                                                                                                        |
| Framework     | **Next.js 15 (App Router) + React 19**                                                                                                             | Server Actions nos ahorran el Express separado; PaperClip usa Vite+Express porque es Electron-like, nosotros somos web puro                                                                                             |
| UI kit        | **Tailwind 4 + shadcn/ui + @assistant-ui/react**                                                                                                   | shadcn = ergonomía; assistant-ui = mismo chat que PaperClip                                                                                                                                                             |
| Diagramas     | **React Flow** (organigrama y DAGs) + **Mermaid** (export estático)                                                                                | React Flow es interactivo; Mermaid ya lo usa el corpus de docs                                                                                                                                                          |
| ORM           | **Drizzle**                                                                                                                                        | Idéntico a PaperClip → reciclable                                                                                                                                                                                       |
| DB            | **Supabase Postgres + pgvector + Auth + Realtime + Storage**                                                                                       | Una sola pieza para auth, DB, vector, files, websockets                                                                                                                                                                 |
| Agent runtime | **`claude` CLI local** (mismo patrón que PaperClip)                                                                                                | El CLI ya tiene auth, prompt cache, skills, MCP, streaming JSON. No queremos API key separada ni reimplementar lo que el CLI ya da gratis                                                                               |
| Repo MD sync  | **Octokit** (GitHub App)                                                                                                                           | Read+write a un repo `stadi-agents` separado                                                                                                                                                                            |
| Auth          | Supabase Auth + Google SSO (Stadibox dominio)                                                                                                      | Bloqueo por dominio @stadibox.com                                                                                                                                                                                       |
| Deploy        | **Server local-first** (Node + UI servidos por el mismo proceso) + Supabase Cloud para DB. Cron en host local (node-cron / windows scheduled task) | Vercel **no sirve** porque su serverless no puede spawnear el `claude` CLI. Igual que PaperClip: el server corre en tu máquina (o en un host con Claude Code instalado) y el navegador accede vía localhost / Tailscale |

### 2.2 Layout del repo

```
super-agente-Stadi/
├── ULTRAPLAN.md                    ← este archivo
├── apps/
│   └── web/                        ← Next.js 15 (UI + API routes + Server Actions)
│       ├── app/
│       │   ├── (hub)/              ← /library /org /runs /insights /editor
│       │   ├── api/
│       │   │   ├── agents/         ← CRUD
│       │   │   ├── runs/           ← POST /runs, GET stream
│       │   │   └── webhooks/       ← GitHub push, Supabase webhooks
│       │   └── layout.tsx
│       └── components/
├── packages/
│   ├── db/                         ← Drizzle schema + migrations + zod
│   ├── shared/                     ← tipos, validators, dominio
│   ├── runtime/                    ← engine de ejecución (Anthropic SDK + tool routing + cache)
│   ├── memory/                     ← persistent memory layer (vectores + episódica)
│   └── github-sync/                ← Octokit pull/push, parser frontmatter, diff
├── agents/                         ← MD source of truth (sincronizado a `stadi-agents` repo)
│   ├── _template.md
│   ├── operaciones/
│   ├── ventas/
│   ├── producto/
│   ├── tech/
│   ├── finanzas/
│   ├── compliance/
│   └── _meta/
│       ├── cartografo.md           ← el meta-agente que construye AGENTS_INDEX.md
│       └── coach.md                ← el agente que mejora a otros
├── flows/                          ← DAGs (YAML) que componen agentes en orden
├── docs/                           ← copia local consultable del corpus Stadibox (link simbólico al de paperclip)
└── scripts/
    ├── seed.ts                     ← bootstrap inicial: parsea corpus + crea agentes base
    └── sync-corpus.ts              ← copia/actualiza docs/ desde paperclip instance
```

### 2.3 Modelo de datos (Drizzle / Postgres)

```ts
// packages/db/src/schema/agents.ts
agents {
  id uuid pk
  slug text unique               // "operaciones-cuello-botella-detector"
  name text
  area text                      // "operaciones" | "ventas" | "producto" | ...
  owner text                     // email Stadibox
  reports_to uuid?               // jerarquía organigrama
  source_path text               // "agents/operaciones/cuello-botella.md"
  source_sha text                // hash del MD para detectar drift
  instructions text              // body del MD
  frontmatter jsonb              // metadata del agente
  capabilities text[]            // ["read-repo","write-doc","query-supabase"]
  tools_allowed text[]           // whitelist de tools MCP
  model text                     // "claude-opus-4-7" / "claude-sonnet-4-6"
  status enum                    // draft | active | deprecated
  embedding vector(1536)         // para búsqueda semántica + similar-agent lookup
  created_at, updated_at
}

agent_config_revisions {        // historial — igual que PaperClip
  id, agent_id, source_sha, frontmatter, instructions, author, created_at
}

flows {                          // DAGs de agentes
  id, slug, name, area, dag jsonb, status
}

runs {
  id, agent_id?, flow_id?, triggered_by, status, started_at, finished_at,
  input jsonb, output jsonb, cost_cents, tokens_in, tokens_out, cache_read_tokens
}

run_events {                     // streaming/log
  id, run_id, ts, type, payload jsonb
}

memory_entries {                 // memoria persistente cross-run
  id, agent_id?, scope text,     // "global" | "agent" | "area"
  kind text,                     // "fact" | "lesson" | "pattern" | "incident"
  content text, embedding vector(1536),
  source_run_id?, created_at, expires_at?
}

agents_catalog_snapshots {       // outputs del Cartógrafo
  id, generated_at, markdown text, graph jsonb, gaps jsonb, proposals jsonb
}

stadi_repos {                    // espejo del repository-index.md del corpus
  slug, gitlab_id, owner, area, tier, dossier_path, status
}

stadi_business_flows {           // espejo de business-flows/*.md
  flow_id, area, status, repos_involved text[], drafted bool
}

stadi_business_rules {           // las reglas duras (jwt shared secret, audit gate, etc.)
  rule_id, area, source_doc, criticality, content
}
```

### 2.4 Motor de ejecución (`packages/runtime`) — vía `claude` CLI

Replica **exactamente** el adaptador `claude-local` de PaperClip (`packages/adapters/claude-local/src/server/execute.ts`). No usamos `@anthropic-ai/sdk` directo: spawneamos el binario `claude` y leemos su salida.

```
POST /api/runs { agentId, input }
   ↓
loadAgent(agentId)                     // DB → instructions + frontmatter
   ↓
prepareWorkspace()                     // .runs/{runId}/ con SKILL.md sintetizado del agente,
                                       // symlinks a tools MCP permitidas, env del agente
   ↓
spawn("claude", [
  "-p", input,                         // non-interactive print mode
  "--append-system-prompt", instructions,
  "--allowedTools", agent.toolsAllowed.join(","),
  "--model", agent.model,              // "claude-opus-4-7" | "claude-sonnet-4-6"
  "--output-format", "stream-json",    // parseable, evento por línea
  "--cwd", runWorkspace,
])
   ↓
read stdout NDJSON line-by-line:
  - parse Anthropic-style events (message_start, content_block_delta, tool_use, tool_result, ...)
  - persist run_event row + push WebSocket → UI
   ↓
on tool_use: lo maneja el propio CLI vía MCP (configurado por workspace .mcp.json)
   ↓
on process exit:
  - extract usage (tokens, cache_read, cost) del último evento
  - write memory_entries (lecciones extraídas por el Reflector)
  - update run row
```

**Ventajas heredadas del CLI:** auth ya manejada por el login del usuario, prompt cache automático (TTL 5min), MCP servers configurables por workspace, hooks, skills, todo gratis.

**Implicación de hosting:** el proceso Node que ejecuta esto debe estar en una máquina con Claude Code instalado y logueado. Por eso el server es local-first / self-hosted, no serverless.

**Tools MCP integradas (desde día 1):**

- `stadi.docs.search(query)` → semantic search sobre el corpus de docs
- `stadi.repo.read(slug, path)` → lectura cruda de un repo Stadibox
- `stadi.flow.lookup(flowId)` → hidrata un business flow
- `supabase.query(sql)` → queries read-only sobre data de Stadibox (con RLS)
- `github.commit(repo, files)` → write-back a `stadi-agents` o repos de Stadibox
- `memory.recall(query)` y `memory.store(entry)` → para self-improvement

### 2.5 Memoria persistente (la pieza que hace que "aprenda")

Tres niveles, todos en Supabase:

1. **Episódica** (`run_events` + transcripción del run) — todo lo que pasó, append-only.
2. **Semántica** (`memory_entries` con embeddings) — extraída por un sub-agente "Reflector" al final de cada run: "¿qué aprendí?", "¿qué tool funcionó mejor?", "¿qué error volvería a cometer?".
3. **Procedural** (`agent_config_revisions` + propuestas del Coach) — los prompts evolucionan: cuando el Coach detecta un patrón ganador en otro agente, propone PR al MD del agente target.

**Esto es lo que el usuario sospecha que PaperClip hace.** PaperClip _no_ lo hace automáticamente (verificado: tiene la infraestructura — `agent_config_revisions`, instructions-path PATCH — pero no un loop autónomo que reescriba prompts). **Nosotros sí lo vamos a hacer**, vía el agente Coach (sección 3.2).

---

## 3. Los dos meta-agentes que pediste

### 3.1 El Cartógrafo (`agents/_meta/cartografo.md`)

**Misión:** mantener `AGENTS_INDEX.md` vivo y detectar gaps.

**Trigger:** cron diario + on-demand + push a `agents/**`.

**Pipeline:**

1. Lee todos los MD bajo `agents/` y los rows de `agents` table.
2. Cruza con `stadi_repos`, `stadi_business_flows`, `stadi_business_rules` (corpus Stadibox).
3. Genera output en tres archivos:
   - `AGENTS_INDEX.md` — tabla maestra: agente · área · qué hace · inputs · outputs · repos que toca · flows que apoya · owner · status · last-run.
   - `AGENTS_GRAPH.json` — grafo (nodos = agentes + áreas + repos + flows; aristas = relaciones) que la UI renderiza con React Flow.
   - `AGENTS_GAPS.md` — análisis estructurado:
     - Áreas sin agente.
     - Flows de negocio (de los 19 catalogados) sin un agente que los soporte.
     - **Cuellos de botella detectados:** flow con >N pasos manuales sin agente, o agente sobrecargado (muchos runs/día) sin par redundante.
     - **Duplicación:** dos agentes con embeddings cosine > 0.92.
     - **Propuestas de nuevos agentes:** plantilla `{problema, área, prompt-base sugerido, tools sugeridas, MD candidato}`.

**Cómo "capta" propuestas:** consulta a Claude con el grafo + reglas de negocio críticas (las 10 ya extraídas, ej. "JWT secret compartido", "audit gate binario", "Vertex AI safety OFF") y le pide identificar qué procesos hoy son humanos+manuales y podrían volverse agentes, **citando el flow_id o repo concreto**.

### 3.2 El Coach (`agents/_meta/coach.md`)

**Misión:** mejorar agentes existentes y hacer que los nuevos nazcan ya buenos.

**Triggers:**

- Antes de crear un agente nuevo (modo "asistente de creación").
- Después de cada run con score bajo.
- Semanal: revisión de los 5 peores agentes por métrica (latencia, errores, satisfacción).

**Cómo aprende de los previos (lo que pediste):**

```
Al crear "agente X" para área "ventas":
  1. similarAgents = vectorSearch(X.descripción, top_k=5, filter: area=ventas OR shared_capabilities)
  2. winningPatterns = analyze(similarAgents.runs WHERE score >= 4)
       — extrae: aperturas de prompt que funcionan, secuencias de tool-use comunes,
         formatos de output preferidos por el reviewer humano
  3. failureModes = analyze(similarAgents.runs WHERE score <= 2)
       — extrae: prompts ambiguos, tools mal elegidas, contexto faltante
  4. propose draft MD que incluye:
       - prompt base con winningPatterns inyectados
       - sección "Anti-patterns" con failureModes
       - tools whitelist iniciada por intersección de los 3 más exitosos
  5. commit a branch agents/draft/X.md → PR para review humano
```

**Mejora continua:** una vez en producción, cuando el Reflector descubre una lección genérica (ej. "siempre validar permisos antes de ejecutar acción cross-microservicio"), el Coach abre PRs simultáneos a todos los agentes que toquen ese patrón.

> **Guard rail importante:** el Coach **propone vía PR**, nunca commitea directo. La revisión humana queda como audit gate (mismo principio del corpus Stadibox: "audit gate is binary PASS/FAIL").

---

## 4. UI del Hub

Cinco vistas. shadcn/ui + Tailwind, dark/light, sidebar persistente.

### 4.1 `/library` — Biblioteca de agentes

- Grid de cards: avatar (emoji o icono por área), nombre, área pill, status, último run, score promedio.
- Filtros: área, status, owner, tags, "tiene memoria persistente".
- Búsqueda semántica (input → embed → query Supabase).
- Click → abre vista detalle.

### 4.2 `/org` — Organigrama de la empresa

- React Flow con layout dagre.
- Niveles: Empresa → Área (Operaciones, Ventas, Producto, Finanzas, Tech, Compliance) → Sub-equipos → Agentes individuales.
- Capa togglea: muestra repos Stadibox (de `stadi_repos`) y flows (de `stadi_business_flows`) como nodos satelitales conectados a las áreas que los tocan.
- Click en agente → drawer con detalle, runs recientes, edit, run.
- Indicadores visuales: agentes huérfanos (sin owner), áreas sin agente, cuellos de botella (badge rojo basado en `AGENTS_GAPS.md`).

### 4.3 `/runs` — Runner & live output

- Selector: agente individual **o** flow (DAG).
- Si flow: visualización del DAG en ejecución (nodos cambiando de color según estado).
- Stream en vivo (assistant-ui): pensamiento, tool-uses, outputs.
- Panel lateral: contexto cargado, memoria recuperada, costo acumulado.

### 4.4 `/insights` — Output del Cartógrafo

- Resumen ejecutivo arriba: # agentes, # áreas cubiertas, # gaps abiertos, ahorro estimado de tiempo (calculado por runs vs estimación humana).
- Sección **Gaps** — lista de áreas/flows sin cobertura (linkea al doc del flow).
- Sección **Cuellos de botella** — lista priorizada con métricas.
- Sección **Propuestas** — agentes sugeridos con botón "Crear desde plantilla" (lleva al `/editor` con draft prellenado por el Coach).
- Sección **Duplicados** — pares de agentes redundantes con sugerencia de fusión.

### 4.5 `/editor/:slug` — Crear / editar agente

- Editor MDX (mismo `@mdxeditor/editor` que PaperClip) con preview lado a lado.
- Frontmatter form (área, owner, tools, model) en panel.
- Botón **Test run** (sandbox, sin commit a memoria persistente).
- Botón **Pedir sugerencias al Coach** (inyecta winningPatterns).
- Al guardar: branch + PR a `stadi-agents`.
- Diff vs versión anterior visible.

---

## 5. Bootstrap inicial — agentes que ya existen

El corpus Stadibox ya define **9 agentes operativos** que vamos a importar como semilla (no construir desde cero):

| Slug                      | Área                | Stage | Estado                                  |
| ------------------------- | ------------------- | ----- | --------------------------------------- |
| `repo-inventory`          | tech/docs           | 1     | activo (REP-4)                          |
| `documentation`           | tech/docs           | 2     | activo (REP-6) — 26 dossiers            |
| `documentation-auditor`   | compliance          | 3     | activo (REP-7) — gate binario           |
| `interconnection-mapping` | tech/arquitectura   | 4     | activo (REP-9)                          |
| `business-flow-catalog`   | producto            | 7     | activo — 4 drafted, 10 needs-validation |
| `role-permission-matrix`  | security            | 8     | activo — 100+ permisos                  |
| `business-rules-registry` | producto/compliance | 11    | not started                             |
| `change-impact-analyst`   | tech                | 5     | on-demand                               |
| `cross-repo-qa-planner`   | qa                  | 6     | on-demand                               |

**Acción de F1:** `scripts/seed.ts` lee los specs de `_workflow.md` y crea los 9 MD bajo `agents/` con su frontmatter, ya conectados a sus repos/flows. Esto da contenido real desde el día 1 y valida el modelo.

---

## 6. Plan en fases

> Cada fase termina con un demo navegable. No empezamos la siguiente hasta que la actual está en main verde.

### F0 — Bootstrap (1-2 días)

- [x] Repo inicializado
- [ ] `pnpm init` + workspace, scaffolding `apps/web`, `packages/{db,shared,runtime,memory,github-sync}`
- [ ] Supabase project creado, migraciones iniciales (tablas core sin embeddings aún)
- [ ] Auth con Google (dominio @stadibox.com)
- [ ] CI: lint + typecheck + test
- [ ] `.env` template + `CLAUDE.md` con convenciones

**Done when:** levantas el server, te logueas y ves un dashboard vacío.

### F1 — Modelo + seed (2-3 días)

- [ ] Drizzle schema completo (sección 2.3) excepto vector
- [ ] Parser de MD con frontmatter (`gray-matter`)
- [ ] `scripts/seed.ts`: importa los 9 agentes del corpus + repos + flows + rules
- [ ] CRUD de agentes (sin runtime aún) en `/library` y `/editor`
- [ ] GitHub sync read-only: pull desde `stadi-agents`

**Done when:** ves los 9 agentes en `/library`, los abres, los editas, ves el diff.

### F2 — Runtime (3-5 días)

- [ ] `packages/runtime` con Anthropic SDK + streaming + prompt cache
- [ ] MCP server local con tools mínimas: `stadi.docs.search`, `memory.recall/store`
- [ ] `/runs` con assistant-ui streaming
- [ ] Persist run_events y costos
- [ ] Sandbox vs prod runs (sandbox no escribe memory_entries)

**Done when:** ejecutas el agente Documentation contra un repo y ves el output streaming en la UI con costo.

### F3 — Hub completo (3-4 días)

- [ ] pgvector + embeddings al guardar agentes y memory_entries
- [ ] Búsqueda semántica en `/library`
- [ ] `/org` con React Flow (organigrama básico, sin satélites todavía)
- [ ] Edit→PR loop con Octokit (write-back a `stadi-agents`)

**Done when:** búsqueda "agente que audita docs" → encuentra documentation-auditor; editas su MD desde la UI y aparece como PR en GitHub.

### F4 — Flows / DAGs (3 días)

- [ ] `flows/*.yaml` schema (lista ordenada de agent steps con inputs/outputs)
- [ ] Flow runner (orquesta runs con dependencias)
- [ ] Flow visualization en `/runs` (DAG live)
- [ ] Importa los 19 flows del corpus como `stadi_business_flows` y muestra cuáles tienen agente

**Done when:** corres el flow "auth-login-local" como cadena de agentes y ves el DAG progresar.

### F5 — Cartógrafo (3-4 días)

- [ ] Agente `cartografo` definido en `agents/_meta/cartografo.md`
- [ ] Job (Vercel Cron diario) que lo ejecuta y produce los 3 outputs
- [ ] `/insights` page consumiendo los snapshots
- [ ] Detección de duplicados (cosine > 0.92) y cuellos de botella

**Done when:** abres `/insights` y ves la lista de gaps + propuestas, con botón "Crear desde plantilla" funcional.

### F6 — Coach + self-improvement (4-5 días)

- [ ] Agente `coach` definido con su pipeline de winning/failure patterns
- [ ] Reflector (sub-agente) que extrae lessons al final de cada run
- [ ] Loop semanal que abre PRs de mejora a los 5 peores agentes
- [ ] Métricas: score por run (auto-evaluado + override humano), latencia, costo

**Done when:** un agente con score bajo recibe un PR de mejora del Coach durante la semana y, tras merge, sus runs siguientes mejoran el score.

**Total estimado:** ~20-25 días de trabajo enfocado para llegar a F6.

---

## 7. Riesgos y decisiones abiertas

| #   | Riesgo / pregunta                                                                          | Mitigación                                                                                                                                                                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Seguridad: el agente Coach abriendo PRs automáticos puede meter cosas locas                | Todo PR del Coach con label `auto-coach`; **branch protection: ningún agente/bot puede aprobar ni mergear** — solo humanos del equipo aprobador; cap de 1 PR/día por agente                                                                                                        |
| R2  | Costo Anthropic explotando con runs no acotados                                            | Quota por agente y por usuario; alertas Slack; el `claude` CLI ya hace prompt-caching agresivo automáticamente. El billing va contra la subscripción de Claude Code, no API key — un costo único, no per-token                                                                     |
| R3  | Drift entre MD y DB                                                                        | Hash `source_sha`; job que detecta diff y bloquea runs si el MD cambió sin sync                                                                                                                                                                                                    |
| R4  | Filtración de info sensible (las reglas de Stadibox tienen credenciales plaintext flagged) | Outputs del Cartógrafo viven solo en Supabase con RLS; nunca a Git público; igual que el corpus actual ("local-only" rule del CEO)                                                                                                                                                 |
| R5  | Vertex AI safety OFF en `stadibox-tag-manager` (regla #9)                                  | El Cartógrafo lo marca como gap crítico desde día 1; agente "compliance-watch" propuesto en F5                                                                                                                                                                                     |
| R6  | ¿Repo `stadi-agents` separado o subdir de este?                                            | **Decisión:** subdir `agents/` de este repo en F0-F3; extraer a repo propio en F4 cuando estabilicemos schema                                                                                                                                                                      |
| Q1  | ¿Owner del proyecto/aprobador de PRs del Coach?                                            | **Decidido:** un equipo humano aprueba. **Ningún agente puede aprobar PRs** — regla dura, enforced vía branch protection (no GitHub App con write a main; el bot del Coach abre PR pero no mergea).                                                                                |
| Q2  | ¿Hosting?                                                                                  | **Decidido:** Server **local-first** (corre en máquina con Claude Code instalado) + **Supabase Cloud** para DB. Vercel descartado: serverless no puede spawnear `claude` CLI. Para acceso remoto del equipo: Tailscale o reverse-proxy + auth en una VM con Claude Code instalado. |
| Q3  | ¿Modelo default para agentes?                                                              | **Decidido:** Opus 4.7 para meta-agentes (Cartógrafo, Coach, Reflector); Sonnet 4.6 para los 9 operativos                                                                                                                                                                          |
| Q4  | ¿Integramos PaperClip directamente en vez de re-implementar?                               | **No:** PaperClip es Electron-flavored y monorepo grande. Tomamos _patrones_ (skills MD, agent_config_revisions, run-log-store, prompt-cache) pero el código es nuevo y web-nativo                                                                                                 |

---

## 8. Próximos pasos inmediatos

1. ~~Confirmar Q1, Q2, Q3~~ ✅ Cerrado (2026-05-04).
2. **F0:** scaffolding Next + Supabase + Drizzle. Una sesión.
3. **F1:** correr `seed.ts` apuntando al corpus → primera demo navegable con los 9 agentes existentes.
4. Cuando F1 esté en verde: re-lanzar `/ultraplan` desde dentro de este repo para que el agente cloud haga **revisión cruzada** de este plan y proponga ajustes (ya tenemos git inicializado, va a funcionar).

### Política de aprobación (regla dura)

- Existe un **equipo aprobador humano** (a definir miembros) configurado en GitHub como CODEOWNERS / required reviewers.
- **Ningún agente, bot, GitHub App o automatización puede aprobar ni mergear PRs.** El Coach y cualquier otro agente que escriba a Git operan con un GitHub App con scope `contents:write` y `pull_requests:write` pero sin permiso de approval ni merge.
- Branch protection en `main` de `super-agente-Stadi` y `stadi-agents`:
  - Required reviews: ≥1 del equipo aprobador.
  - Dismiss stale reviews: on.
  - Require review from CODEOWNERS: on.
  - Restrict who can push: solo el equipo + GitHub App del Coach (sin merge).
  - Block force pushes y deletions.

---

## Apéndice A — Referencias al corpus Stadibox

- Corpus base: `C:\Users\shado\.paperclip\instances\default\projects\29504717-cedb-4941-9f89-2dd8f3b31dee\9e194313-59df-48dc-b2a1-fa38ab228b9c\_default\docs`
- 28 dossiers `repos/{slug}/README-ARCHITECTURE.md` (100% audit PASS)
- 19 business flows en `business-flows/` (4 drafted + 10 needs-validation + 5 pending-token)
- Mapas: `system/interconnected-repositories-map.md` + `service-dependency-graph.md` + `event-flow-map.md` + `database-touchpoints.md`
- 100+ permisos en `security/role-permission-matrix.md`
- Workflow gobernador: `_workflow.md`

## Apéndice B — Patrones tomados de PaperClip

| Patrón                        | Archivo PaperClip                                         | Aplicación aquí                                                                                            |
| ----------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Skill = MD + frontmatter      | `skills/paperclip/SKILL.md`                               | `agents/**/*.md` con misma estructura                                                                      |
| Agent config revisions        | `server/src/services/agents.ts:32`                        | Tabla `agent_config_revisions` igual                                                                       |
| Run logs append-only          | `server/src/services/run-log-store.ts:30`                 | Tabla `run_events` + Storage NDJSON                                                                        |
| **Spawn del `claude` CLI**    | `packages/adapters/claude-local/src/server/execute.ts:39` | `packages/runtime/src/spawn.ts` — `child_process.spawn("claude", [...])` con `--output-format stream-json` |
| Prompt cache (lo hace el CLI) | el CLI lo gestiona solo bajo `~/.claude/`                 | No reimplementamos. Reusamos lo que el CLI cachea por workspace                                            |
| Heartbeat executor            | `server/src/services/heartbeat.ts:100`                    | Endpoint `/api/runs` con misma estrategia (ventanas cortas, no daemon)                                     |
| Live updates por WS           | `ui/src/...` (TanStack + WS)                              | Supabase Realtime para `run_events`                                                                        |
| Skill / MCP discovery         | `packages/adapters/claude-local/src/server/skills.ts:116` | Inyectamos `.mcp.json` y `skills/` por workspace de run, igual que ellos                                   |
