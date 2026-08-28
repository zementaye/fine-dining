import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import { db } from "@/lib/db";
import { waitlist, servicePeriods } from "@/lib/db/schema";
import { createReservation, NoAvailabilityError } from "@/lib/booking-engine";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

type Params = { params: Promise<{ id: string }> };

const claimSchema = z.object({
  token: z.string().min(1),
  // Same idempotency pattern as the guest-facing confirm form: generated once
  // per page mount and resent on every retry, so a double-click or a network-error
  // retry on "Claim This Table" can never produce two reservations.
  idempotencyKey: z.string().uuid().optional(),
});

// POST /api/waitlist/[id]/claim — guest claims an offered slot via their token.
// Converts the waitlist entry into a real reservation through the booking engine
// (still conflict-checked — the offer isn't a guaranteed hold, just a head start).
// Uses the specific offeredTime captured at offer-time, not the guest's original
// fuzzy requested range.
//
// Rate-limited per IP, same posture as /api/reservations — this is public and
// unauthenticated (the claim token is the only gate).
export async function POST(req: NextRequest, { params }: Params) {
  const ip = getClientIp(req);
  const { allowed } = await checkRateLimit(`waitlist-claim:${ip}`, { windowSeconds: 60, max: 8 });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a moment and try again." },
      { status: 429 }
    );
  }

  const { id } = await params;
  const parsed = claimSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { token, idempotencyKey } = parsed.data;

  const entry = await db.query.waitlist.findFirst({ where: eq(waitlist.id, id) });
  if (!entry || entry.status !== "offered" || entry.claimToken !== token) {
    return NextResponse.json({ error: "This offer is invalid or has expired." }, { status: 410 });
  }
  if (entry.offerExpiresAt && entry.offerExpiresAt < new Date()) {
    await db.update(waitlist).set({ status: "expired" }).where(eq(waitlist.id, id));
    return NextResponse.json({ error: "This offer has expired." }, { status: 410 });
  }
  if (!entry.offeredTime) {
    return NextResponse.json({ error: "This offer is missing a time slot." }, { status: 422 });
  }

  const dayOfWeek = new Date(`${entry.requestedDate}T00:00:00Z`).getUTCDay();
  const period = await db.query.servicePeriods.findFirst({
    where: eq(servicePeriods.dayOfWeek, dayOfWeek),
  });
  if (!period) return NextResponse.json({ error: "Restaurant is closed that day." }, { status: 422 });

  try {
    const result = await createReservation({
      guestName: entry.guestName,
      guestEmail: entry.guestEmail,
      guestPhone: entry.guestPhone ?? undefined,
      partySize: entry.partySize,
      reservationDate: entry.requestedDate,
      reservationTime: entry.offeredTime,
      durationMinutes: period.seatingDurationMinutes,
      preferredTableId: entry.offeredTableId ?? undefined,
      source: "website",
      idempotencyKey,
    });
    // Only flip the waitlist entry on a genuinely new booking — a retried
    // request that matched an existing reservation via idempotencyKey has
    // already done this on the first attempt.
    if (!result.wasIdempotentReplay) {
      await db.update(waitlist).set({ status: "booked" }).where(eq(waitlist.id, id));
    }
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof NoAvailabilityError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error(err);
    Sentry.captureException(err);
    return NextResponse.json({ error: "Could not book." }, { status: 500 });
  }
}
