import { EventEmitter } from "node:events";
import { mkdir, readFile, readdir, writeFile, appendFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type { RunEvent } from "@stadi/runtime";

export type RunStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export interface RunMeta {
  id: string;
  agentSlug: string;
  agentName: string;
  status: RunStatus;
  triggeredBy: string;
  input: string;
  startedAt: string;
  finishedAt?: string;
  exitCode?: number;
  totals?: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
  };
  error?: string;
}

const RUNS_DIR = resolve(process.cwd(), "../../.runs");

interface InMemoryRun {
  meta: RunMeta;
  events: RunEvent[];
  emitter: EventEmitter;
  done: boolean;
}

// Singleton store. Vive en el proceso del server. Se pierde en hot-reload (dev).
declare global {
  // eslint-disable-next-line no-var
  var __stadi_run_store: Map<string, InMemoryRun> | undefined;
}
const store = (globalThis.__stadi_run_store ??= new Map<string, InMemoryRun>());

export function newRunId(): string {
  return randomUUID();
}

export function workspaceDirFor(runId: string): string {
  return join(RUNS_DIR, runId);
}

export async function createRun(meta: RunMeta): Promise<void> {
  await mkdir(workspaceDirFor(meta.id), { recursive: true });
  await writeFile(metaPath(meta.id), JSON.stringify(meta, null, 2), "utf8");
  store.set(meta.id, {
    meta,
    events: [],
    emitter: new EventEmitter(),
    done: false,
  });
}

export async function pushEvent(runId: string, event: RunEvent): Promise<void> {
  const run = store.get(runId);
  if (!run) return;
  run.events.push(event);
  run.emitter.emit("event", event);
  await appendFile(eventsPath(runId), JSON.stringify(event) + "\n", "utf8");
}

export async function finalizeRun(runId: string, patch: Partial<RunMeta>): Promise<void> {
  const run = store.get(runId);
  if (!run) return;
  run.meta = { ...run.meta, ...patch };
  run.done = true;
  run.emitter.emit("done", run.meta);
  await writeFile(metaPath(runId), JSON.stringify(run.meta, null, 2), "utf8");
}

export async function getRun(runId: string): Promise<{
  meta: RunMeta;
  events: RunEvent[];
} | null> {
  const cached = store.get(runId);
  if (cached) return { meta: cached.meta, events: cached.events };
  // Disk fallback
  if (!existsSync(metaPath(runId))) return null;
  const meta = JSON.parse(await readFile(metaPath(runId), "utf8")) as RunMeta;
  const events = await loadEventsFromDisk(runId);
  return { meta, events };
}

export function subscribeToRun(
  runId: string,
  onEvent: (e: RunEvent) => void,
  onDone: (meta: RunMeta) => void,
): () => void {
  const run = store.get(runId);
  if (!run) return () => {};
  run.emitter.on("event", onEvent);
  run.emitter.on("done", onDone);
  return () => {
    run.emitter.off("event", onEvent);
    run.emitter.off("done", onDone);
  };
}

export function isRunDone(runId: string): boolean {
  return store.get(runId)?.done ?? true;
}

export async function listRuns(limit = 50): Promise<RunMeta[]> {
  // Combina memoria + disk. Memoria tiene la fuente más fresca.
  const memMetas = Array.from(store.values()).map((r) => r.meta);
  const memIds = new Set(memMetas.map((m) => m.id));

  const onDisk: RunMeta[] = [];
  if (existsSync(RUNS_DIR)) {
    const entries = await readdir(RUNS_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (memIds.has(entry.name)) continue;
      const p = join(RUNS_DIR, entry.name, "meta.json");
      if (!existsSync(p)) continue;
      try {
        onDisk.push(JSON.parse(await readFile(p, "utf8")) as RunMeta);
      } catch {
        // ignora corruptos
      }
    }
  }

  return [...memMetas, ...onDisk]
    .sort((a, b) => (b.startedAt ?? "").localeCompare(a.startedAt ?? ""))
    .slice(0, limit);
}

async function loadEventsFromDisk(runId: string): Promise<RunEvent[]> {
  const p = eventsPath(runId);
  if (!existsSync(p)) return [];
  const raw = await readFile(p, "utf8");
  return raw
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l) as RunEvent;
      } catch {
        return null;
      }
    })
    .filter((e): e is RunEvent => e !== null);
}

function metaPath(runId: string): string {
  return join(workspaceDirFor(runId), "meta.json");
}

function eventsPath(runId: string): string {
  return join(workspaceDirFor(runId), "events.ndjson");
}
