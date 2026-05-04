import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

let cached: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb(connectionString?: string) {
  if (cached) return cached;
  const url = connectionString ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const client = postgres(url, { prepare: false });
  cached = drizzle(client, { schema });
  return cached;
}

export type Database = ReturnType<typeof getDb>;
