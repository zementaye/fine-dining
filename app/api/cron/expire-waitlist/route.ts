import { NextRequest, NextResponse } from "next/server";
import { and, eq, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { waitlist } from "@/lib/db/schema";

function authorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

// GET /api/cron/expire-waitlist — Vercel Cron. Auto-expires unclaimed offers.
export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const expired = await db
    .update(waitlist)
    .set({ status: "expired" })
    .where(and(eq(waitlist.status, "offered"), lt(waitlist.offerExpiresAt, now)))
    .returning({ id: waitlist.id });

  return NextResponse.json({ expiredCount: expired.length });
}
