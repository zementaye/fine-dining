"use client";

export function PartySizeSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-pressed={value === n}
          className={`w-11 h-11 rounded-full border text-sm transition-colors ${
            value === n
              ? "bg-charcoal text-bone border-charcoal"
              : "border-charcoal/20 hover:border-brass hover:text-brass"
          }`}
        >
          {n}
        </button>
      ))}
      <span className="w-full text-xs text-charcoal/40 mt-1">
        Planning a party of 9 or more? Consider our{" "}
        <a href="/private-events" className="underline hover:text-brass">
          private dining room
        </a>
        .
      </span>
    </div>
  );
}
