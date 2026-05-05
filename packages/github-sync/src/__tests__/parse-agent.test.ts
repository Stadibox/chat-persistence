import { describe, expect, it } from "vitest";
import { parseAgentMarkdown } from "../parse-agent.js";

const VALID = `---
slug: test-agent
name: Test Agent
area: tech
owner: paco@stadibox.com
capabilities: [read-repo]
toolsAllowed: []
model: claude-sonnet-4-6
status: active
tags: [seed]
---

# Misión

Hola.
`;

const INVALID_NO_AREA = `---
slug: x
name: X
owner: paco@stadibox.com
---

body
`;

describe("parseAgentMarkdown", () => {
  it("acepta frontmatter válido y extrae instrucciones", () => {
    const r = parseAgentMarkdown(VALID, "agents/tech/test.md");
    expect(r.ok).toBe(true);
    expect(r.source?.frontmatter.slug).toBe("test-agent");
    expect(r.source?.frontmatter.area).toBe("tech");
    expect(r.source?.instructions).toContain("# Misión");
    expect(r.source?.sourcePath).toBe("agents/tech/test.md");
    expect(r.source?.sourceSha).toHaveLength(16);
  });

  it("rechaza frontmatter sin area", () => {
    const r = parseAgentMarkdown(INVALID_NO_AREA, "agents/x/x.md");
    expect(r.ok).toBe(false);
    expect(r.errors?.length).toBeGreaterThan(0);
  });
});
