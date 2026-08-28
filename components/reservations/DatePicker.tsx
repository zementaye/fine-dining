"use client";

function isoDaysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function DatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (date: string) => void;
}) {
  const today = isoDaysFromNow(0);
  const quickPicks = [
    { label: "Today", date: today },
    { label: "Tomorrow", date: isoDaysFromNow(1) },
    { label: "This Weekend", date: isoDaysFromNow((6 - new Date().getDay() + 7) % 7 || 7) },
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        {quickPicks.map((q) => (
          <button
            key={q.label}
            type="button"
            onClick={() => onChange(q.date)}
            className={`px-4 py-2 border text-xs uppercase tracking-widest2 transition-colors ${
              value === q.date
                ? "bg-charcoal text-bone border-charcoal"
                : "border-charcoal/20 hover:border-brass hover:text-brass"
            }`}
          >
            {q.label}
          </button>
        ))}
      </div>
      <input
        type="date"
        min={today}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field"
      />
    </div>
  );
}
