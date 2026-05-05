/* eslint-disable no-console */
import { resolve } from "node:path";
import { readAgentsDir } from "@stadi/github-sync";

async function main() {
  const root = resolve(process.cwd(), "agents");
  const { agents, failures } = await readAgentsDir(root);

  console.log(`Leídos: ${agents.length} agente(s) válido(s) desde ${root}`);
  for (const a of agents) {
    console.log(
      `  · ${a.frontmatter.area.padEnd(11)} ${a.frontmatter.slug.padEnd(28)} ${a.frontmatter.status.padEnd(10)} ${a.frontmatter.model}`,
    );
  }
  if (failures.length > 0) {
    console.log(`\nFallaron ${failures.length}:`);
    for (const f of failures) {
      console.log(`  ${f.path}: ${f.errors.join(" | ")}`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
