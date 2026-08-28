import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { reservations } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth";

// GET /api/admin/reservations-by-date?date=YYYY-MM-DD — feeds the floor map and
// admin reservation list/calendar views. Staff-only; dietary notes are included
// deliberately (safety-critical, must reach every relevant admin screen).
export async function GET(req: NextRequest) {
  const session = await requireRole(["host", "admin"]);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const date = new URL(req.url).searchParams.get("date");
  if (!date) return NextResponse.json({ error: "date is required" }, { status: 400 });

  const rows = await db.query.reservations.findMany({
    where: eq(reservations.reservationDate, date),
    orderBy: (r, { asc }) => [asc(r.reservationTime)],
  });
  return NextResponse.json(rows);
}
