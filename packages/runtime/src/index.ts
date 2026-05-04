// F0 placeholder. Engine de ejecución se materializa en F2:
// - Anthropic SDK con prompt caching (cache_control: ephemeral)
// - Streaming para UI vía assistant-ui
// - Tool routing a MCP server local
// - Persiste run_events
// Espejo del patrón heartbeat de PaperClip (server/src/services/heartbeat.ts:100).
export const RUNTIME_VERSION = "0.0.0";
