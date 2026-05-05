import { createHash } from "node:crypto";
import matter from "gray-matter";
import { agentFrontmatterSchema, type AgentSource } from "@stadi/shared";

export interface ParseResult {
  ok: boolean;
  source?: AgentSource;
  errors?: string[];
}

export function parseAgentMarkdown(rawContent: string, sourcePath: string): ParseResult {
  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(rawContent);
  } catch (err) {
    return {
      ok: false,
      errors: [`Could not parse frontmatter: ${(err as Error).message}`],
    };
  }

  const validation = agentFrontmatterSchema.safeParse(parsed.data);
  if (!validation.success) {
    return {
      ok: false,
      errors: validation.error.issues.map(
        (issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`,
      ),
    };
  }

  const instructions = parsed.content.trim();
  const sourceSha = createHash("sha256")
    .update(rawContent, "utf8")
    .digest("hex")
    .slice(0, 16);

  return {
    ok: true,
    source: {
      frontmatter: validation.data,
      instructions,
      sourcePath,
      sourceSha,
    },
  };
}
