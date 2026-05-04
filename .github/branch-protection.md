# Branch Protection — `main`

> Documenta la configuración requerida en GitHub para los repos `super-agente-Stadi` y `stadi-agents`. Aplicar manualmente cuando los repos se publiquen en GitHub.

## Reglas requeridas

1. **Required pull request reviews before merging:**
   - Required approving reviews: **1** (mínimo)
   - Dismiss stale pull request approvals when new commits are pushed: **on**
   - Require review from Code Owners: **on**
   - Restrict approvals to specific actors: **on** — solo miembros del team `super-agente-stadi-approvers`

2. **Require status checks to pass before merging:**
   - Require branches to be up to date before merging: **on**
   - Required checks: `build` (job de `.github/workflows/ci.yml`)

3. **Require linear history:** **on**

4. **Require conversation resolution before merging:** **on**

5. **Restrict who can push to matching branches:**
   - Permitir solo al team `super-agente-stadi-approvers` y a los GitHub Apps necesarios para CI/Coach.
   - **Coach GitHub App:** scopes `contents:write` + `pull_requests:write`. **NO** se le concede permiso para aprobar reviews ni mergear (no se incluye en "people allowed to merge").

6. **Block force pushes:** **on**

7. **Block deletions:** **on**

## Regla dura

> **Ningún agente, bot, GitHub App o automatización puede aprobar ni mergear PRs.** Solo humanos miembros del team aprobador. Esta regla es no negociable y está documentada en `ULTRAPLAN.md` §7 R1 y §8.
