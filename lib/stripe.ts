import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

/**
 * Creates the PaymentIntent for a reservation deposit. Amount is always integer
 * cents — never a float. Takes a Stripe idempotency key so that a retried
 * request (network error, double-click, two tabs) can never create two
 * PaymentIntents for the same reservation — same protection as the
 * idempotencyKey on createReservation, just enforced by Stripe's API instead
 * of our own DB.
 */
export async function createDepositIntent(args: {
  reservationId: string;
  amountCents: number;
  guestEmail: string;
  idempotencyKey: string;
}) {
  return stripe.paymentIntents.create(
    {
      amount: args.amountCents,
      currency: "usd",
      receipt_email: args.guestEmail,
      metadata: { reservationId: args.reservationId },
      automatic_payment_methods: { enabled: true },
    },
    { idempotencyKey: args.idempotencyKey }
  );
}
