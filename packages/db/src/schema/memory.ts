import { index, pgTable, text, timestamp, uuid, vector } from "drizzle-orm/pg-core";
import { agents } from "./agents.js";
import { runs } from "./runs.js";
import { memoryKindEnum, memoryScopeEnum } from "./enums.js";

// ULTRAPLAN §2.5 — memoria semántica
export const memoryEntries = pgTable(
  "memory_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id").references(() => agents.id, { onDelete: "cascade" }),
    scope: memoryScopeEnum("scope").notNull().default("agent"),
    kind: memoryKindEnum("kind").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
    sourceRunId: uuid("source_run_id").references(() => runs.id, { onDelete: "set null" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    agentIdx: index("memory_entries_agent_idx").on(t.agentId),
    kindIdx: index("memory_entries_kind_idx").on(t.kind),
    embeddingIdx: index("memory_entries_embedding_idx").using(
      "hnsw",
      t.embedding.op("vector_cosine_ops"),
    ),
  }),
);

export type MemoryEntry = typeof memoryEntries.$inferSelect;
export type NewMemoryEntry = typeof memoryEntries.$inferInsert;
