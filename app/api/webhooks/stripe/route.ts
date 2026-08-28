import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import * as Sentry from "@sentry/nextjs";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { reservations, processedWebhookEvents } from "@/lib/db/schema";
import { sendReservationConfirmationEmail } from "@/lib/email/send";

// Stripe requires the raw body for signature verification — do not JSON.parse before this.
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Stripe webhook signature verification failed", err);
    Sentry.captureException(err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Idempotency: Stripe redelivers events (network retries, manual resends from
  // the dashboard, etc.) and explicitly does not guarantee exactly-once
  // delivery. Record the event id up front; if we've already processed it,
  // skip straight to a 200 rather than double-confirming or double-emailing.
  // The insert's unique constraint on (source, event_id) is the actual guard —
  // this also protects against two webhook deliveries racing each other.
  try {
    await db.insert(processedWebhookEvents).values({ source: "stripe", eventId: event.id });
  } catch (err: any) {
    if (err?.code === "23505" /* unique_violation */) {
      return NextResponse.json({ received: true, duplicate: true });
    }
    throw err;
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as any;
    const reservationId = intent.metadata?.reservationId;
    if (reservationId) {
      const reservation = await db.query.reservations.findFirst({
        where: eq(reservations.id, reservationId),
      });
      // Guard on current status too, belt-and-suspenders alongside the event-id
      // check above: never re-send a confirmation for an already-confirmed booking.
      if (reservation && reservation.status !== "confirmed") {
        await db
          .update(reservations)
          .set({
            status: "confirmed",
            depositPaidCents: intent.amount_received,
            updatedAt: new Date(),
          })
          .where(eq(reservations.id, reservationId));

        await sendReservationConfirmationEmail({
          to: reservation.guestEmail,
          guestName: reservation.guestName,
          confirmationCode: reservation.confirmationCode,
          date: reservation.reservationDate,
          time: reservation.reservationTime,
          partySize: reservation.partySize,
        }).catch((err) => {
          console.error("Failed to send confirmation email", err);
          Sentry.captureException(err);
        });
      }
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object as any;
    const reservationId = intent.metadata?.reservationId;
    if (reservationId) {
      // Leave status as `pending` — guest can retry the deposit; we don't auto-cancel
      // on a single failed attempt (card declines, etc. are common and recoverable).
      console.warn(`Deposit payment failed for reservation ${reservationId}`);
    }
  }

  return NextResponse.json({ received: true });
}
