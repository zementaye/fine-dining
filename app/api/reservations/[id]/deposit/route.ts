import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import * as Sentry from "@sentry/nextjs";
import { db } from "@/lib/db";
import { reservations } from "@/lib/db/schema";
import { createDepositIntent, stripe } from "@/lib/stripe";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

type Params = { params: Promise<{ id: string }> };

// POST /api/reservations/[id]/deposit — creates a Stripe PaymentIntent for the
// reservation's deposit. The reservation stays `pending` until the webhook confirms
// payment succeeded (see /api/webhooks/stripe). We never flip to `confirmed` here.
//
// Rate-limited per IP (same pattern as /api/reservations) since this is a public,
// unauthenticated write endpoint. Idempotent per reservation: a page reload, a
// double-click on "Pay Deposit," or a retry after a network blip reuses the same
// Stripe PaymentIntent instead of minting a new one every time — both via a
// deterministic Stripe idempotency key on create, and by checking for and reusing
// an already-open intent first.
export async function POST(req: NextRequest, { params }: Params) {
  const ip = getClientIp(req);
  const { allowed } = await checkRateLimit(`deposit:${ip}`, { windowSeconds: 60, max: 10 });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a moment and try again." },
      { status: 429 }
    );
  }

  const { id } = await params;
  const reservation = await db.query.reservations.findFirst({ where: eq(reservations.id, id) });
  if (!reservation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (reservation.depositRequiredCents <= 0) {
    return NextResponse.json({ error: "No deposit required for this reservation." }, { status: 400 });
  }
  if (reservation.status === "confirmed") {
    return NextResponse.json({ error: "Already confirmed." }, { status: 400 });
  }

  // Reuse an existing intent if one is already open for this reservation rather
  // than minting a new one on every retry/reload — a stale or already-consumed
  // intent falls through to creating a fresh one below.
  if (reservation.stripePaymentIntentId) {
    const existing = await stripe.paymentIntents.retrieve(reservation.stripePaymentIntentId).catch(() => null);
    if (existing && (existing.status === "requires_payment_method" || existing.status === "requires_confirmation")) {
      return NextResponse.json({ clientSecret: existing.client_secret });
    }
  }

  try {
    const intent = await createDepositIntent({
      reservationId: reservation.id,
      amountCents: reservation.depositRequiredCents,
      guestEmail: reservation.guestEmail,
      // Deterministic per reservation: concurrent double-submits before the DB
      // write below lands still collapse to a single Stripe PaymentIntent.
      idempotencyKey: `deposit-intent:${reservation.id}`,
    });

    await db
      .update(reservations)
      .set({ stripePaymentIntentId: intent.id, updatedAt: new Date() })
      .where(eq(reservations.id, id));

    return NextResponse.json({ clientSecret: intent.client_secret });
  } catch (err) {
    console.error("Failed to create deposit PaymentIntent", err);
    Sentry.captureException(err);
    return NextResponse.json({ error: "Could not start payment. Please try again." }, { status: 500 });
  }
}
