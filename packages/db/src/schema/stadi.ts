import { sql } from "drizzle-orm";
import { boolean, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { ruleCriticalityEnum } from "./enums.js";

// Espejo de repository-index.md del corpus Stadibox.
// Local-only: si el corpus se considera sensible, RLS en Supabase limita acceso.
export const stadiRepos = pgTable(
  "stadi_repos",
  {
    slug: text("slug").primaryKey(),
    gitlabId: integer("gitlab_id"),
    owner: text("owner"),
    area: text("area"),
    tier: text("tier"),
    status: text("status"),
    dossierPath: text("dossier_path"),
    summary: text("summary"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    areaIdx: index("stadi_repos_area_idx").on(t.area),
  }),
);

// Espejo de business-flows/*.md del corpus Stadibox.
export const stadiBusinessFlows = pgTable(
  "stadi_business_flows",
  {
    flowId: text("flow_id").primaryKey(),
    name: text("name").notNull(),
    area: text("area"),
    status: text("status"),
    drafted: boolean("drafted").notNull().default(false),
    reposInvolved: text("repos_involved")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    sourcePath: text("source_path"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    areaIdx: index("stadi_business_flows_area_idx").on(t.area),
  }),
);

// Reglas duras detectadas en el corpus (10+ ya identificadas, p.ej. JWT shared secret,
// Vertex AI safety OFF, audit gate binario, etc.). ULTRAPLAN §1 corpus.
export const stadiBusinessRules = pgTable(
  "stadi_business_rules",
  {
    ruleId: text("rule_id").primaryKey(),
    title: text("title").notNull(),
    area: text("area"),
    sourceDoc: text("source_doc"),
    criticality: ruleCriticalityEnum("criticality").notNull().default("medium"),
    content: text("content").notNull(),
    needsValidation: boolean("needs_validation").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    areaIdx: index("stadi_business_rules_area_idx").on(t.area),
    criticalityIdx: index("stadi_business_rules_criticality_idx").on(t.criticality),
  }),
);

export type StadiRepo = typeof stadiRepos.$inferSelect;
export type StadiBusinessFlow = typeof stadiBusinessFlows.$inferSelect;
export type StadiBusinessRule = typeof stadiBusinessRules.$inferSelect;
