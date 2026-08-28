"use client";

import { use, useEffect, useRef, useState } from "react";

type Offer = {
  waitlistId: string;
  guestName: string;
  partySize: number;
  requestedDate: string;
  offeredTime: string | null;
  offerExpiresAt: string | null;
  tableLabel: string | null;
};

// Landing page for the time-limited claim link sent from a waitlist offer
// (see app/api/waitlist/[id]/offer/route.ts). Resolves the token to the
// waitlist entry via GET /api/waitlist/by-token/[token], shows what's on
// offer, and on confirm calls POST /api/waitlist/[id]/claim — which runs the
// booking through the same conflict-checked engine as every other path.
export default function ClaimPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "claiming" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  // Generated once per mount, reused across retries (network error, double
  // click) — same idempotency pattern as the main booking confirm form.
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());

  useEffect(() => {
    fetch(`/api/waitlist/by-token/${token}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) setLoadError(data.error);
        else setOffer(data);
      })
      .catch(() => setLoadError("Something went wrong loading this offer."));
  }, [token]);

  async function claim() {
    if (!offer) return;
    setStatus("claiming");
    const res = await fetch(`/api/waitlist/${offer.waitlistId}/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, idempotencyKey: idempotencyKeyRef.current }),
    });
    const data = await res.json();
    if (res.ok) {
      setStatus("done");
      setMessage(`Booked! Confirmation code ${data.confirmationCode}.`);
    } else {
      setStatus("error");
      setMessage(data.error ?? "Could not complete the booking.");
    }
  }

  if (loadError) {
    return (
      <div className="max-w-lg mx-auto px-8 py-24 text-center">
        <h1 className="font-display text-3xl mb-4">This Offer Isn't Available</h1>
        <p className="text-charcoal/60">{loadError}</p>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="max-w-lg mx-auto px-8 py-24 text-center">
        <p className="text-charcoal/50 text-sm">Loading your offer…</p>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="max-w-lg mx-auto px-8 py-24 text-center">
        <h1 className="font-display text-3xl mb-4">You're Booked</h1>
        <p className="text-charcoal/70">{message}</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-8 py-24 text-center">
      <h1 className="font-display text-3xl mb-4">A Table Is Available</h1>
      <p className="text-charcoal/70 mb-2">
        {offer.requestedDate} · {offer.offeredTime?.slice(0, 5)} · Party of {offer.partySize}
      </p>
      {offer.tableLabel && <p className="text-charcoal/50 text-sm mb-6">Table: {offer.tableLabel}</p>}
      {offer.offerExpiresAt && (
        <p className="text-xs text-brass mb-8">
          This offer expires at {new Date(offer.offerExpiresAt).toLocaleTimeString()}.
        </p>
      )}

      {status === "error" && <p className="text-sm text-red-700 mb-4">{message}</p>}

      <button
        onClick={claim}
        disabled={status === "claiming"}
        className="bg-charcoal text-bone px-8 py-3 tracking-widest2 uppercase text-sm disabled:opacity-40"
      >
        {status === "claiming" ? "Booking…" : "Claim This Table"}
      </button>
    </div>
  );
}
