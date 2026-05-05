import {
  bigint,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { agents } from "./agents.js";
import { flows } from "./flows.js";
import { runStatusEnum } from "./enums.js";

export const runs = pgTable(
  "runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id").references(() => agents.id, { onDelete: "set null" }),
    flowId: uuid("flow_id").references(() => flows.id, { onDelete: "set null" }),
    triggeredBy: text("triggered_by").notNull(),
    status: runStatusEnum("status").notNull().default("queued"),
    input: jsonb("input"),
    output: jsonb("output"),
    error: text("error"),
    score: integer("score"),
    workspaceDir: text("workspace_dir"),
    tokensIn: bigint("tokens_in", { mode: "number" }),
    tokensOut: bigint("tokens_out", { mode: "number" }),
    cacheReadTokens: bigint("cache_read_tokens", { mode: "number" }),
    costCents: integer("cost_cents"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    agentIdx: index("runs_agent_idx").on(t.agentId),
    flowIdx: index("runs_flow_idx").on(t.flowId),
    statusIdx: index("runs_status_idx").on(t.status),
  }),
);

// Stream NDJSON de PaperClip (server/src/services/run-log-store.ts:30) — apend-only
export const runEvents = pgTable(
  "run_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    ts: timestamp("ts", { withTimezone: true }).notNull().defaultNow(),
    type: text("type").notNull(),
    payload: jsonb("payload").notNull(),
  },
  (t) => ({
    runIdx: index("run_events_run_idx").on(t.runId, t.ts),
  }),
);

export type Run = typeof runs.$inferSelect;
export type NewRun = typeof runs.$inferInsert;
export type RunEvent = typeof runEvents.$inferSelect;
