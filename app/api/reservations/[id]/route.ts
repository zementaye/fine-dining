import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { reservations } from "@/lib/db/schema";
import { updateReservationSchema } from "@/lib/validations";
import { requireRole, auth } from "@/lib/auth";
import { getSetting } from "@/lib/db/queries/settings";
import { reassignTable } from "@/lib/booking-engine";
import { logAdminActivity } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

// GET /api/reservations/[id] — guest (owner) or staff can view
export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const reservation = await db.query.reservations.findFirst({
    where: eq(reservations.id, id),
    with: { table: true },
  });
  if (!reservation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const session = await auth().catch(() => null);
  const role = (session?.user as any)?.role;
  const isOwner = (session?.user as any)?.id === reservation.userId;
  const isStaff = role === "host" || role === "admin";

  if (!isOwner && !isStaff) {
    // Guests without accounts reach their reservation via the confirmation-code
    // route (app/reservations/[confirmationCode]), not this id-keyed endpoint.
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Dietary notes/allergens must always be visible to staff; internal_notes/vip
  // fields are staff-only and simply omitted for guest viewers.
  if (!isStaff) {
    const { internalNotes, ...guestSafe } = reservation as any;
    return NextResponse.json(guestSafe);
  }
  return NextResponse.json(reservation);
}

// PATCH /api/reservations/[id] — staff only (status changes, table assignment, notes)
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await requireRole(["host", "admin"]);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const before = await db.query.reservations.findFirst({ where: eq(reservations.id, id) });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = updateReservationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { tableId, ...rest } = parsed.data;
  const actorName = session.user?.name ?? "Unknown staff";
  const actorUserId = (session.user as any)?.id;

  // Table (re)assignment must go through the booking engine's conflict check —
  // never a raw UPDATE, even from the admin floor map.
  if (tableId) {
    try {
      await reassignTable(id, tableId);
      await logAdminActivity({
        actorUserId,
        actorName,
        action: "table_reassign",
        targetType: "reservation",
        targetId: id,
        detail: { from: before.tableId, to: tableId },
      });
    } catch (err: any) {
      return NextResponse.json({ error: err.message ?? "Assignment failed" }, { status: 409 });
    }
  }

  if (Object.keys(rest).length > 0) {
    await db
      .update(reservations)
      .set({ ...rest, updatedAt: new Date() })
      .where(eq(reservations.id, id));

    if (rest.status && rest.status !== before.status) {
      await logAdminActivity({
        actorUserId,
        actorName,
        action: "status_change",
        targetType: "reservation",
        targetId: id,
        detail: { from: before.status, to: rest.status },
      });
    }
  }

  const updated = await db.query.reservations.findFirst({ where: eq(reservations.id, id) });
  return NextResponse.json(updated);
}

// DELETE /api/reservations/[id] — cancellation. Enforces the cancellation-window
// rule server-side for guest-initiated cancels; staff can always cancel.
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const reservation = await db.query.reservations.findFirst({ where: eq(reservations.id, id) });
  if (!reservation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const session = await auth().catch(() => null);
  const role = (session?.user as any)?.role;
  const isStaff = role === "host" || role === "admin";

  if (!isStaff) {
    const windowHours = Number((await getSetting("cancellation_window_hours")) ?? 24);
    const reservationDateTime = new Date(
      `${reservation.reservationDate}T${reservation.reservationTime}`
    );
    const hoursUntil = (reservationDateTime.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntil < windowHours) {
      return NextResponse.json(
        {
          error: "cancellation_window_passed",
          message: "This reservation is within the cancellation window — please call the restaurant.",
        },
        { status: 403 }
      );
    }
  }

  await db
    .update(reservations)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(reservations.id, id));

  if (isStaff) {
    await logAdminActivity({
      actorUserId: (session!.user as any)?.id,
      actorName: session!.user?.name ?? "Unknown staff",
      action: "cancel",
      targetType: "reservation",
      targetId: id,
      detail: { previousStatus: reservation.status },
    });
  }

  return NextResponse.json({ ok: true });
}
