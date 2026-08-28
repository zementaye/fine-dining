"use client";

import { useEffect, useState } from "react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe-client";

/**
 * Full Stripe deposit checkout. Two-step:
 *  1. On mount, POST /api/reservations/[id]/deposit to create the PaymentIntent
 *     and get back a clientSecret (this is the backend piece that was already done).
 *  2. Wrap <PaymentElement> in <Elements> using that clientSecret, and on submit
 *     call stripe.confirmPayment(). Actual `status: confirmed` only happens once
 *     the webhook (/api/webhooks/stripe) receives payment_intent.succeeded — this
 *     form's job is just to collect and confirm the payment, not to flip status.
 */
export function DepositForm({
  reservationId,
  confirmationCode,
}: {
  reservationId: string;
  confirmationCode: string;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/reservations/${reservationId}/deposit`, { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setClientSecret(data.clientSecret);
      })
      .catch(() => setError("Could not start payment. Please try again."));
  }, [reservationId]);

  if (error) return <p className="text-red-700 text-sm">{error}</p>;
  if (!clientSecret) return <p className="text-sm text-charcoal/50">Preparing secure payment…</p>;

  return (
    <Elements
      stripe={getStripe()}
      options={{
        clientSecret,
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: "#1b1917",
            colorBackground: "#ffffff",
            fontFamily: "Inter, sans-serif",
            borderRadius: "0px",
          },
        },
      }}
    >
      <CheckoutInner confirmationCode={confirmationCode} />
    </Elements>
  );
}

function CheckoutInner({ confirmationCode }: { confirmationCode: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Stripe redirects here after redirect-based payment methods (e.g. bank
        // debits); card payments usually resolve without leaving the page.
        return_url: `${window.location.origin}/reservations/${confirmationCode}?justBooked=1`,
      },
    });

    // confirmPayment only returns if there was an immediate error (e.g. card
    // declined) — on success it navigates to return_url, so code after this
    // point only runs in the failure case.
    if (confirmError) {
      setError(confirmError.message ?? "Payment failed. Please check your card details and try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-4">
      <p className="text-sm text-charcoal/60">
        A deposit is required to hold this table. Complete payment below to confirm your
        reservation (code {confirmationCode}).
      </p>
      <PaymentElement />
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={!stripe || submitting} className="btn-primary">
        {submitting ? "Processing…" : "Pay Deposit"}
      </button>
    </form>
  );
}
