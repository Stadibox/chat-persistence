// F0 placeholder. Engine de ejecución se materializa en F2:
// - spawn("claude", [...]) con --output-format stream-json (NO usamos @anthropic-ai/sdk)
// - Auth y prompt cache los maneja el CLI vía ~/.claude/
// - Parser de NDJSON línea por línea -> run_events
// - .mcp.json y skills/ inyectados por workspace de cada run
// Espejo de packages/adapters/claude-local/src/server/execute.ts:39 en PaperClip.
export const RUNTIME_VERSION = "0.0.0";
