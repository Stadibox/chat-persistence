import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp, uuid, vector } from "drizzle-orm/pg-core";
import { agentStatusEnum } from "./enums.js";

// ULTRAPLAN §2.3 · espejo del MD source-of-truth en agents/**/*.md
export const agents = pgTable(
  "agents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    area: text("area").notNull(),
    owner: text("owner").notNull(),
    reportsTo: uuid("reports_to"),
    sourcePath: text("source_path").notNull(),
    sourceSha: text("source_sha").notNull(),
    instructions: text("instructions").notNull(),
    frontmatter: jsonb("frontmatter").notNull(),
    capabilities: text("capabilities")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    toolsAllowed: text("tools_allowed")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    model: text("model").notNull().default("claude-sonnet-4-6"),
    status: agentStatusEnum("status").notNull().default("draft"),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    embedding: vector("embedding", { dimensions: 1536 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    areaIdx: index("agents_area_idx").on(t.area),
    statusIdx: index("agents_status_idx").on(t.status),
    embeddingIdx: index("agents_embedding_idx").using("hnsw", t.embedding.op("vector_cosine_ops")),
  }),
);

// ULTRAPLAN §2.5 — memoria procedural: snapshots históricos de cada cambio
export const agentConfigRevisions = pgTable(
  "agent_config_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    sourceSha: text("source_sha").notNull(),
    frontmatter: jsonb("frontmatter").notNull(),
    instructions: text("instructions").notNull(),
    author: text("author").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    agentIdx: index("agent_config_revisions_agent_idx").on(t.agentId),
  }),
);

export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
export type AgentConfigRevision = typeof agentConfigRevisions.$inferSelect;
