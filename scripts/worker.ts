// Loop de polling del worker para producción. Llama al endpoint HTTP
// /api/chat/worker/tick cada N ms. En dev no es necesario: la UI dispara un
// ping al worker apenas inserta un job (demand-driven).
//
// Uso:
//   pnpm tsx scripts/worker.ts
//   WORKER_TICK_URL=http://localhost:3100/api/chat/worker/tick pnpm tsx scripts/worker.ts

const URL =
  process.env.WORKER_TICK_URL ?? "http://localhost:3000/api/chat/worker/tick";
const POLL = Number(process.env.WORKER_POLL_MS ?? 2000);

let stopping = false;
process.on("SIGINT", () => {
  stopping = true;
});
process.on("SIGTERM", () => {
  stopping = true;
});

async function tick() {
  const res = await fetch(URL, { method: "POST" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as { processed: number; workerId?: string };
}

async function main() {
  console.log(`[worker] tick=${URL} poll=${POLL}ms`);
  while (!stopping) {
    try {
      const r = await tick();
      if (r.processed > 0) console.log(`[worker] processed=${r.processed}`);
    } catch (err) {
      console.error("[worker] tick error:", (err as Error).message);
    }
    if (stopping) break;
    await new Promise((r) => setTimeout(r, POLL));
  }
  console.log("[worker] stopped");
}

void main();
