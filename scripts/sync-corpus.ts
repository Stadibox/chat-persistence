/* eslint-disable no-console */
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

// Sincroniza el corpus Stadibox desde la instancia de PaperClip a docs/.
// Local-only: docs/ está gitignoreado. Ver ULTRAPLAN §7 R4.

const DEFAULT_SOURCE =
  "C:/Users/shado/.paperclip/instances/default/projects/29504717-cedb-4941-9f89-2dd8f3b31dee/9e194313-59df-48dc-b2a1-fa38ab228b9c/_default/docs";

const source = process.env.STADI_CORPUS_SRC ?? DEFAULT_SOURCE;
const target = resolve(process.cwd(), "docs");

if (!existsSync(source)) {
  console.error(`[sync-corpus] source not found: ${source}`);
  console.error(`[sync-corpus] override with STADI_CORPUS_SRC env var`);
  process.exit(1);
}

console.log(`[sync-corpus] from: ${source}`);
console.log(`[sync-corpus] to:   ${target}`);

// preserva docs/README.md y docs/.gitkeep que sí están versionados
const PRESERVE = new Set(["README.md", ".gitkeep"]);

if (existsSync(target)) {
  // limpieza selectiva
  for (const entry of (await import("node:fs/promises")).readdir(target).then((r) => r)) {
    if (PRESERVE.has(entry)) continue;
    rmSync(resolve(target, entry), { recursive: true, force: true });
  }
}
mkdirSync(target, { recursive: true });

cpSync(source, target, {
  recursive: true,
  force: true,
  filter: (src) => {
    const base = src.split(/[/\\]/).pop() ?? "";
    return !PRESERVE.has(base);
  },
});

console.log("[sync-corpus] done");
