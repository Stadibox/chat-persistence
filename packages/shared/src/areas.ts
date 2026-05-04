export const AREAS = [
  "operaciones",
  "ventas",
  "producto",
  "tech",
  "finanzas",
  "compliance",
  "qa",
  "security",
  "_meta",
] as const;

export type Area = (typeof AREAS)[number];

export const AGENT_STATUSES = ["draft", "active", "deprecated"] as const;
export type AgentStatus = (typeof AGENT_STATUSES)[number];

export const RUN_STATUSES = ["queued", "running", "succeeded", "failed", "cancelled"] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];
