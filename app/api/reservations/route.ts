import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createReservationSchema } from "@/lib/validations";
import { createReservation, NoAvailabilityError } from "@/lib/booking-engine";
import { db } from "@/lib/db";
import { servicePeriods } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sendReservationConfirmationEmail } from "@/lib/email/send";
import { auth } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// POST /api/reservations — public booking creation (guests). Always goes through
// the booking-engine's serializable transaction; never bypassed.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = await checkRateLimit(`reservations:${ip}`, { windowSeconds: 60, max: 8 });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many booking attempts. Please wait a moment and try again." },
      { status: 429 }
    );
  }

  const body = await req.json();
  const parsed = createReservationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;

  const dayOfWeek = new Date(`${input.reservationDate}T00:00:00Z`).getUTCDay();
  const period = await db.query.servicePeriods.findFirst({
    where: eq(servicePeriods.dayOfWeek, dayOfWeek),
  });
  if (!period) {
    return NextResponse.json({ error: "Restaurant is closed on that date." }, { status: 422 });
  }

  const session = await auth().catch(() => null);

  try {
    const result = await createReservation({
      ...input,
      durationMinutes: period.seatingDurationMinutes,
      userId: (session?.user as any)?.id,
      source: "website",
      // Public flow NEVER sets allowOverbookingBuffer — that's host-assisted only.
      allowOverbookingBuffer: false,
    });

    if (result.status === "confirmed" && !result.wasIdempotentReplay) {
      await sendReservationConfirmationEmail({
        to: input.guestEmail,
        guestName: input.guestName,
        confirmationCode: result.confirmationCode,
        date: input.reservationDate,
        time: input.reservationTime,
        partySize: input.partySize,
      }).catch((err) => console.error("Failed to send confirmation email", err));
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof NoAvailabilityError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error(err);
    Sentry.captureException(err);
    return NextResponse.json({ error: "Could not create reservation." }, { status: 500 });
  }
}
