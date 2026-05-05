import { resolve } from "node:path";
import type { AgentSource } from "@stadi/shared";
import { readAgentsDir } from "@stadi/github-sync";

export function agentsRootDir(): string {
  return resolve(process.cwd(), "../../agents");
}

export async function listAgentsFromFs() {
  return readAgentsDir(agentsRootDir());
}

export async function getAgentBySlug(slug: string): Promise<AgentSource | null> {
  const { agents } = await listAgentsFromFs();
  return agents.find((a) => a.frontmatter.slug === slug) ?? null;
}
