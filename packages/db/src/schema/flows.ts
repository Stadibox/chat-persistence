import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { flowStatusEnum } from "./enums.js";

// DAGs que componen agentes en orden — ULTRAPLAN §2.3 + Fase F4
export const flows = pgTable(
  "flows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    area: text("area").notNull(),
    description: text("description"),
    dag: jsonb("dag").notNull(),
    sourcePath: text("source_path"),
    status: flowStatusEnum("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    areaIdx: index("flows_area_idx").on(t.area),
  }),
);

export type Flow = typeof flows.$inferSelect;
export type NewFlow = typeof flows.$inferInsert;
