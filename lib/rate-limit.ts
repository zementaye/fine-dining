import { db } from "./db/index";
import { rateLimitBuckets } from "./db/schema";
import { and, eq, sql } from "drizzle-orm";

/**
 * Fixed-window rate limiter backed by Postgres. Deliberately not in-memory:
 * Vercel functions are stateless and multi-instance, so an in-process Map
 * would let each cold instance give an attacker a fresh quota. Not Redis
 * either — this app doesn't otherwise need Redis, and a single UPSERT here
 * is cheap enough at the traffic volumes a reservation site sees. If you
 * later need sub-second precision or very high request volume, swap this
 * for Upstash Redis using the same call signature.
 *
 * Usage: `await checkRateLimit(key, { windowSeconds: 60, max: 5 })`
 */
export async function checkRateLimit(
  key: string,
  opts: { windowSeconds: number; max: number }
): Promise<{ allowed: boolean; remaining: number }> {
  const windowStart = new Date(
    Math.floor(Date.now() / (opts.windowSeconds * 1000)) * opts.windowSeconds * 1000
  );

  const [row] = await db
    .insert(rateLimitBuckets)
    .values({ key, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: [rateLimitBuckets.key, rateLimitBuckets.windowStart],
      set: { count: sql`${rateLimitBuckets.count} + 1` },
    })
    .returning({ count: rateLimitBuckets.count });

  // This insert-or-update always returns exactly one row in practice; if it
  // somehow doesn't, fail open (allow the request) rather than take down
  // every rate-limited route in the app over a rate-limiter bug.
  if (!row) return { allowed: true, remaining: opts.max };

  const allowed = row.count <= opts.max;
  return { allowed, remaining: Math.max(0, opts.max - row.count) };
}

/** Best-effort client identifier: real IP behind Vercel's proxy, falling back to a header-less default. */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
