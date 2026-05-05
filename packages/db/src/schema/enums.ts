import { pgEnum } from "drizzle-orm/pg-core";

export const agentStatusEnum = pgEnum("agent_status", ["draft", "active", "deprecated"]);

export const runStatusEnum = pgEnum("run_status", [
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled",
]);

export const memoryKindEnum = pgEnum("memory_kind", ["fact", "lesson", "pattern", "incident"]);

export const memoryScopeEnum = pgEnum("memory_scope", ["global", "agent", "area"]);

export const flowStatusEnum = pgEnum("flow_status", ["draft", "active", "deprecated"]);

export const ruleCriticalityEnum = pgEnum("rule_criticality", [
  "info",
  "low",
  "medium",
  "high",
  "critical",
]);
