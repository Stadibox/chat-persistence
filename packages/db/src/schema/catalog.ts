import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// Output del Cartógrafo — ULTRAPLAN §3.1
export const agentsCatalogSnapshots = pgTable("agents_catalog_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  generatedBy: text("generated_by").notNull(),
  markdown: text("markdown").notNull(),
  graph: jsonb("graph").notNull(),
  gaps: jsonb("gaps").notNull(),
  proposals: jsonb("proposals").notNull(),
  notes: text("notes"),
});

export type AgentsCatalogSnapshot = typeof agentsCatalogSnapshots.$inferSelect;
export type NewAgentsCatalogSnapshot = typeof agentsCatalogSnapshots.$inferInsert;
