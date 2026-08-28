"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PartySizeSelector } from "@/components/reservations/PartySizeSelector";
import { DatePicker } from "@/components/reservations/DatePicker";
import { TimeSlotGrid } from "@/components/reservations/TimeSlotGrid";

type Slot = { time: string; durationMinutes: number; servicePeriodName: string };

function formatTime(t: string | null): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

// Step 1 of the reservation flow: party size -> date -> real-time available time slots.
export default function ReservationsPage() {
  const router = useRouter();
  const [partySize, setPartySize] = useState(2);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!date) return;
    setLoading(true);
    setSelectedTime(null);
    fetch(`/api/availability?date=${date}&partySize=${partySize}`)
      .then((r) => r.json())
      .then((data) => setSlots(data.slots ?? []))
      .finally(() => setLoading(false));
  }, [date, partySize]);

  function continueToDetails() {
    if (!date || !selectedTime) return;
    const params = new URLSearchParams({ date, time: selectedTime, partySize: String(partySize) });
    router.push(`/reservations/confirm?${params.toString()}`);
  }

  const formattedDate = date
    ? new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="max-w-4xl mx-auto px-8 py-20 grid md:grid-cols-[1fr_280px] gap-16">
      <div>
        <p className="divider-mark mb-4 text-xs uppercase tracking-widest2">Gursha</p>
        <h1 className="font-display text-4xl mb-2">Reserve a Table</h1>
        <p className="text-charcoal/50 text-sm mb-12">
          Dinner Tuesday – Sunday. Parties are served family-style — come hungry.
        </p>

        <div className="mb-12">
          <p className="flex items-center gap-2 text-xs uppercase tracking-widest2 text-charcoal/50 mb-3">
            <StepDot active /> Party Size
          </p>
          <PartySizeSelector value={partySize} onChange={setPartySize} />
        </div>

        <div className="mb-12">
          <p className="flex items-center gap-2 text-xs uppercase tracking-widest2 text-charcoal/50 mb-3">
            <StepDot active /> Date
          </p>
          <DatePicker value={date} onChange={setDate} />
        </div>

        {date && (
          <div className="mb-12">
            <p className="flex items-center gap-2 text-xs uppercase tracking-widest2 text-charcoal/50 mb-3">
              <StepDot active={!!selectedTime} /> Time
            </p>
            <TimeSlotGrid slots={slots} selected={selectedTime} onSelect={setSelectedTime} loading={loading} />
          </div>
        )}

        <button
          type="button"
          disabled={!selectedTime}
          onClick={continueToDetails}
          className="btn-primary"
        >
          Continue
        </button>
      </div>

      <aside className="hidden md:block">
        <div className="card sticky top-10 p-6">
          <p className="eyebrow mb-4">Your Reservation</p>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-charcoal/50">Party</dt>
              <dd>{partySize} {partySize === 1 ? "guest" : "guests"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-charcoal/50">Date</dt>
              <dd className="text-right">{formattedDate ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-charcoal/50">Time</dt>
              <dd>{formatTime(selectedTime) || "—"}</dd>
            </div>
          </dl>
          <hr className="border-charcoal/10 my-6" />
          <p className="text-xs text-charcoal/40 leading-relaxed">
            Parties of 8 or more require a deposit to hold the table. Tables are
            held for 15 minutes past the reservation time.
          </p>
        </div>
      </aside>
    </div>
  );
}

function StepDot({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-block h-1.5 w-1.5 rounded-full ${active ? "bg-brass" : "bg-charcoal/20"}`}
    />
  );
}
