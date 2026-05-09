import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import type { AgentSource } from "@stadi/shared";
import { parseAgentMarkdown } from "./parse-agent.js";

export interface ReadAgentsResult {
  agents: AgentSource[];
  failures: { path: string; errors: string[] }[];
}

// Recorre agents/**/*.md y devuelve los que pasan el zod schema.
// Ignora _template.md y archivos que empiezan con _ excepto bajo agents/_meta/.
export async function readAgentsDir(rootDir: string): Promise<ReadAgentsResult> {
  const result: ReadAgentsResult = { agents: [], failures: [] };
  await walk(rootDir, rootDir, result);
  return result;
}

async function walk(dir: string, rootDir: string, out: ReadAgentsResult): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, rootDir, out);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    if (entry.name === "_template.md") continue;
    if (entry.name.startsWith("_") && !full.includes("_meta")) continue;

    const relPath = relative(rootDir, full).split("\\").join("/");
    const raw = await readFile(full, "utf8");
    const parsed = parseAgentMarkdown(raw, relPath);
    if (parsed.ok && parsed.source) {
      out.agents.push(parsed.source);
    } else {
      out.failures.push({ path: relPath, errors: parsed.errors ?? ["unknown"] });
    }
  }
}
