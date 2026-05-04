import { z } from "zod";
import { AGENT_STATUSES, AREAS } from "./areas.js";

export const agentFrontmatterSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  area: z.enum(AREAS),
  owner: z.string().email(),
  reportsTo: z.string().nullable().optional(),
  capabilities: z.array(z.string()).default([]),
  toolsAllowed: z.array(z.string()).default([]),
  model: z
    .enum(["claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"])
    .default("claude-sonnet-4-6"),
  status: z.enum(AGENT_STATUSES).default("draft"),
  tags: z.array(z.string()).default([]),
});

export type AgentFrontmatter = z.infer<typeof agentFrontmatterSchema>;

export interface AgentSource {
  frontmatter: AgentFrontmatter;
  instructions: string;
  sourcePath: string;
  sourceSha: string;
}
