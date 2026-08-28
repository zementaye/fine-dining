import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { waitlistCreateSchema } from "@/lib/validations";
import { db } from "@/lib/db";
import { waitlist } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// POST /api/waitlist — guest joins the waitlist for a date/time range
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = await checkRateLimit(`waitlist:${ip}`, { windowSeconds: 60, max: 5 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }

  const body = await req.json();
  const parsed = waitlistCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const [row] = await db.insert(waitlist).values({ ...parsed.data, status: "waiting" }).returning();
  return NextResponse.json(row, { status: 201 });
}

// GET /api/waitlist — staff-only list of current waitlist entries
export async function GET() {
  const session = await requireRole(["host", "admin"]);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await db.query.waitlist.findMany({
    where: and(eq(waitlist.status, "waiting")),
    orderBy: (w, { asc }) => [asc(w.createdAt)],
  });
  return NextResponse.json(rows);
}
