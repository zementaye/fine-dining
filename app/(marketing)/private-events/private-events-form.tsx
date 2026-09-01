"use client";

import { useState } from "react";

// Private events form: inquiry only — no self-serve booking. Submits to
// /api/private-events, which stores it and emails the admin.
export function PrivateEventsForm() {
  const [form, setForm] = useState({
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    eventType: "Gursha Feast — Chef's Table",
    preferredDate: "",
    partySize: 10,
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/private-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        setError("Something went wrong — please try again or call us directly at (202) 555-0148.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Could not reach the server — check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto px-5 sm:px-8 py-24 text-center">
        <p className="divider-mark mb-4 text-xs uppercase tracking-widest2">Thank You</p>
        <h1 className="font-display text-3xl mb-4">Inquiry Received</h1>
        <p className="text-charcoal/70">
          We've received your inquiry and will be in touch within one business day.
          For anything urgent, call us directly at{" "}
          <a href="tel:+12025550148" className="underline hover:text-brass">
            (202) 555-0148
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-5 sm:px-8 py-20">
      <p className="divider-mark mb-4 text-xs uppercase tracking-widest2">Gursha</p>
      <h1 className="font-display text-4xl text-center mb-4">Private Events</h1>
      <p className="text-center text-charcoal/50 text-sm mb-12">
        From an intimate Chef's Table gursha feast to a full buyout of the dining
        room, tell us what you're planning and we'll build the menu around it.
      </p>
      <form onSubmit={handleSubmit} className="space-y-5">
        <input required placeholder="Name" className="field"
          value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
        <input required type="email" placeholder="Email" className="field"
          value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
        <input placeholder="Phone" className="field"
          value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
        <select className="field"
          value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value })}>
          <option>Gursha Feast — Chef's Table</option>
          <option>Full Buyout</option>
          <option>Corporate</option>
        </select>
        <input required type="date" className="field"
          value={form.preferredDate} onChange={(e) => setForm({ ...form, preferredDate: e.target.value })} />
        <input required type="number" min={1} placeholder="Party size" className="field"
          value={form.partySize} onChange={(e) => setForm({ ...form, partySize: Number(e.target.value) })} />
        <textarea placeholder="Tell us about your event" rows={4} className="field"
          value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
        {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Sending…" : "Submit Inquiry"}
        </button>
      </form>
    </div>
  );
}
