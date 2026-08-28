import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { assignTableSchema } from "@/lib/validations";
import { reassignTable, NoAvailabilityError } from "@/lib/booking-engine";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { reservations } from "@/lib/db/schema";
import { logAdminActivity } from "@/lib/audit";

// PATCH /api/admin/floor/assign — drag-to-seat on the floor map. Routes through
// the same conflict-checked booking-engine function as everything else.
export async function PATCH(req: NextRequest) {
  const session = await requireRole(["host", "admin"]);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = assignTableSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const before = await db.query.reservations.findFirst({
    where: eq(reservations.id, parsed.data.reservationId),
  });

  try {
    await reassignTable(parsed.data.reservationId, parsed.data.tableId);
    await logAdminActivity({
      actorUserId: (session.user as any)?.id,
      actorName: session.user?.name ?? "Unknown staff",
      action: "table_reassign",
      targetType: "reservation",
      targetId: parsed.data.reservationId,
      detail: { from: before?.tableId ?? null, to: parsed.data.tableId, via: "floor_map" },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof NoAvailabilityError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: "Assignment failed" }, { status: 500 });
  }
}
