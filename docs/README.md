# docs/ — corpus Stadibox local

Esta carpeta es **local-only**. El contenido se sincroniza desde la instancia de PaperClip vía:

```bash
pnpm corpus:sync
```

**No commitear** ningún archivo aquí (excepto este `README.md` y `.gitkeep`). Ver `.gitignore` y `ULTRAPLAN.md` §7 R4.

## Origen

`C:\Users\shado\.paperclip\instances\default\projects\29504717-cedb-4941-9f89-2dd8f3b31dee\9e194313-59df-48dc-b2a1-fa38ab228b9c\_default\docs`

## Estructura esperada (tras sync)

```
docs/
  _inputs/               gitlab-corpus
  _para-paco/            notes para Paco
  _template/             plantillas locked (README-ARCHITECTURE, flow-template)
  audits/                documentation-quality-report
  business-flows/        19 flujos de negocio (4 drafted + 10 needs-validation + 5 pending-token)
  impact-reports/        on-demand
  qa/                    on-demand
  repos/                 28 dossiers README-ARCHITECTURE.md
  security/              role-permission-matrix (sensible, NO publicar)
  system/                interconnection map, service-dependency-graph, event-flow-map
  repository-index.md    tabla maestra
  _workflow.md           handoff diagram, hard rules
  README.md              pipeline de 6 agentes
```
