import { NextResponse } from "next/server";
import { processPendingClaudeJobs } from "@/lib/chat/worker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Procesa hasta MAX_PER_TICK jobs pendientes. Pensado para ser disparado:
//   - por la UI inmediatamente después de insertar un mensaje (demand-driven)
//   - por un cron / poller (scripts/worker.ts) en producción
export async function POST() {
  try {
    const result = await processPendingClaudeJobs();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
