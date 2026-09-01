"use client";

type Slot = { time: string; durationMinutes: number; servicePeriodName: string };

export function TimeSlotGrid({
  slots,
  selected,
  onSelect,
  loading,
}: {
  slots: Slot[];
  selected: string | null;
  onSelect: (time: string) => void;
  loading: boolean;
}) {
  if (loading)
    return (
      <p className="text-sm text-charcoal/50 flex items-center gap-2">
        <span className="inline-block h-3 w-3 rounded-full border-2 border-brass border-t-transparent animate-spin" />
        Checking availability…
      </p>
    );
  if (slots.length === 0)
    return (
      <p className="text-sm text-charcoal/50">
        No tables available for that date and party size — try another date, or{" "}
        <a href="/private-events" className="underline hover:text-brass">
          ask about the private room
        </a>
        .
      </p>
    );

  const grouped = slots.reduce<Record<string, Slot[]>>((acc, s) => {
    (acc[s.servicePeriodName] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([period, periodSlots]) => (
        <div key={period}>
          <p className="text-xs uppercase tracking-widest2 text-brass mb-3">{period}</p>
          <div className="flex flex-wrap gap-2">
            {periodSlots.map((s) => (
              <button
                key={s.time}
                type="button"
                onClick={() => onSelect(s.time)}
                className={`px-4 py-2 border text-sm transition-colors ${
                  selected === s.time
                    ? "bg-charcoal text-bone border-charcoal"
                    : "border-charcoal/20 hover:border-brass hover:text-brass"
                }`}
              >
                {formatTime(s.time)}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatTime(t: string): string {
  const [h = 0, m = 0] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}
