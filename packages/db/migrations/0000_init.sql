-- F1 init migration — generada manualmente, refleja schema en src/schema/.
-- Aplicar después de crear el proyecto Supabase: `pnpm --filter @stadi/db migrate`.
-- pgvector ya viene habilitable en Supabase: enable extension via SQL editor o `CREATE EXTENSION`.

CREATE EXTENSION IF NOT EXISTS "vector";

-- enums
CREATE TYPE "agent_status" AS ENUM ('draft', 'active', 'deprecated');
CREATE TYPE "run_status" AS ENUM ('queued', 'running', 'succeeded', 'failed', 'cancelled');
CREATE TYPE "memory_kind" AS ENUM ('fact', 'lesson', 'pattern', 'incident');
CREATE TYPE "memory_scope" AS ENUM ('global', 'agent', 'area');
CREATE TYPE "flow_status" AS ENUM ('draft', 'active', 'deprecated');
CREATE TYPE "rule_criticality" AS ENUM ('info', 'low', 'medium', 'high', 'critical');

-- placeholder. Para la migración real: `pnpm --filter @stadi/db generate`
-- una vez que tengamos DATABASE_URL en .env.local. drizzle-kit produce el SQL completo
-- a partir del schema TS. Este archivo queda como recordatorio de que las extensiones
-- y enums se necesitan antes.
