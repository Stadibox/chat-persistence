import { resolve } from "node:path";
import { readAgentsDir } from "@stadi/github-sync";

export function agentsRootDir(): string {
  // apps/web -> ../../agents
  return resolve(process.cwd(), "../../agents");
}

export async function listAgentsFromFs() {
  return readAgentsDir(agentsRootDir());
}
