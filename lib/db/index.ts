import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// neon-http is used for normal request-scoped queries (fast, serverless-friendly).
// The booking engine's serializable transaction uses a separate pooled client below,
// because true SERIALIZABLE transactions need a session-bound connection, which
// neon-http (one-shot HTTP per query) cannot provide.
neonConfig.fetchConnectionCache = true;

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });

export type Database = typeof db;
