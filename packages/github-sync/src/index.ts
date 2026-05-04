// F0 placeholder. Pull/push del repo `stadi-agents` (ULTRAPLAN §1):
// - parseAgentMd(filePath) -> AgentSource (gray-matter + zod)
// - syncFromGitHub() -> upsert en DB
// - openCoachPR() -> branch + commit + PR (jamás merge — regla humana)
// Implementación en F1 (read-only) y F3 (write-back).
export const GITHUB_SYNC_VERSION = "0.0.0";
