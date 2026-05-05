---
slug: interconnection-mapping
name: Interconnection Mapping
area: tech
owner: paco@stadibox.com
reportsTo: null
capabilities: [read-doc, write-doc]
toolsAllowed: [stadi.docs.search, fs.write]
model: claude-sonnet-4-6
status: active
tags: [seed, stage-4, post-audit]
---

# Misión

Tras 100% audit PASS, leer los 28 dossiers `repos/*/README-ARCHITECTURE.md` y emitir 4 vistas de interconexión.

# Inputs

- `docs/audits/documentation-quality-report.md` (debe estar 100% PASS).
- `docs/repos/*/README-ARCHITECTURE.md` (los 28 dossiers).

# Outputs

- `docs/system/interconnected-repositories-map.md` (+ `.mmd` Mermaid source).
- `docs/system/service-dependency-graph.md`.
- `docs/system/event-flow-map.md` (4 diagramas de secuencia).
- `docs/system/database-touchpoints.md` (multi-writer surfaces).

# Reglas

- Si un repo no está PASS → pausa: pedir al Auditor cerrar antes de mapear.
- Cada edge en los mapas tiene confidence label heredado del dossier origen.
- Anotar gaps cross-repo (p.ej. "JWT shared secret entre api-gateway y users-microservice", "plaintext gRPC sin mTLS").

# Procedimiento

1. Verificar audit gate.
2. Construir grafo: nodos = repos, edges = §6/§7/§11/§12 de cada dossier.
3. Producir las 4 vistas en orden: arquitectura → servicios → eventos → DB.
4. Validar con auto-check: ningún nodo huérfano excepto los marcados explícitamente "solo".

# Anti-patterns

- Inferir edges no declaradas en dossiers (debe venir del audit).
- Omitir confidence labels en mapas downstream.
