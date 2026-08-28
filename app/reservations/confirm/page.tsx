"use client";

import { useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

// Step 2 (+3 inline): guest details, then — if the created reservation requires a
// deposit — a Stripe payment step, then redirect to the confirmation screen.
function ConfirmForm() {
  const params = useSearchParams();
  const router = useRouter();
  const date = params.get("date")!;
  const time = params.get("time")!;
  const partySize = Number(params.get("partySize"));

  const [form, setForm] = useState({
    guestName: "",
    guestEmail: "",
    guestPhone: "",
    occasion: "",
    dietaryNotes: "",
    seatingPreference: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generated once per mount of this form and reused for every submit attempt
  // (including a retry after a network error or a double click) — the server
  // treats repeat requests with the same key as the same booking, so this can
  // never create two reservations no matter how many times the guest clicks.
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        partySize,
        reservationDate: date,
        reservationTime: time,
        idempotencyKey: idempotencyKeyRef.current,
      }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error?.message ?? data.error ?? "Something went wrong. Please try again.");
      return;
    }

    if (data.status === "pending" && data.depositRequiredCents > 0) {
      router.push(`/reservations/deposit?reservationId=${data.reservationId}&code=${data.confirmationCode}`);
    } else {
      router.push(`/reservations/${data.confirmationCode}?justBooked=1`);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-8 py-20">
      <p className="divider-mark mb-4 text-xs uppercase tracking-widest2">Gursha</p>
      <h1 className="font-display text-4xl text-center mb-2">Your Details</h1>
      <p className="text-center text-charcoal/60 mb-10">
        {new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}{" "}
        · {time.slice(0, 5)} · Party of {partySize}
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <input required placeholder="Full name" className="field"
          value={form.guestName} onChange={(e) => setForm({ ...form, guestName: e.target.value })} />
        <input required type="email" placeholder="Email" className="field"
          value={form.guestEmail} onChange={(e) => setForm({ ...form, guestEmail: e.target.value })} />
        <input placeholder="Phone" className="field"
          value={form.guestPhone} onChange={(e) => setForm({ ...form, guestPhone: e.target.value })} />
        <input placeholder="Occasion (optional)" className="field"
          value={form.occasion} onChange={(e) => setForm({ ...form, occasion: e.target.value })} />
        <textarea placeholder="Dietary notes / allergies" className="field"
          value={form.dietaryNotes} onChange={(e) => setForm({ ...form, dietaryNotes: e.target.value })} />
        <input placeholder="Seating preference (optional)" className="field"
          value={form.seatingPreference} onChange={(e) => setForm({ ...form, seatingPreference: e.target.value })} />

        {error && <p className="text-sm text-red-700">{error}</p>}

        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Booking…" : "Confirm Reservation"}
        </button>
      </form>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmForm />
    </Suspense>
  );
}
