import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

// Session-bound pooled connection: required for the booking engine's
// SERIALIZABLE transaction (see lib/booking-engine.ts). Do NOT use this
// for simple reads — use lib/db/index.ts (neon-http) instead, it's cheaper.
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL_UNPOOLED! });
export const dbPool = drizzle(pool, { schema });
