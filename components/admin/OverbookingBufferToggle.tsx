"use client";

import { useState } from "react";

/**
 * Host-assisted bookings may opt into this buffer (see
 * `allowOverbookingBuffer` in lib/booking-engine.ts) — the public booking
 * flow never does, regardless of this setting. 0% is effectively "off."
 */
export function OverbookingBufferToggle({ initialPercent }: { initialPercent: number }) {
  const [percent, setPercent] = useState(initialPercent);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enabled = percent > 0;

  async function save(next: number) {
    setSaving(true);
    setSaved(false);
    setError(null);

    const res = await fetch("/api/admin/settings/overbooking-buffer", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ overbookingBufferPercent: next }),
    });
    const data = await res.json();

    setSaving(false);
    if (res.ok) {
      setPercent(data.overbookingBufferPercent);
      setSaved(true);
    } else {
      setError(data.error?.message ?? data.error ?? "Could not save.");
    }
  }

  return (
    <div className="border border-charcoal/20 p-6 max-w-lg">
      <p className="text-xs uppercase tracking-widest2 text-charcoal/50 mb-1">
        Overbooking Buffer
      </p>
      <p className="text-sm text-charcoal/60 mb-4">
        Lets hosts intentionally overbook by this percentage when manually
        seating a party. Public online bookings never use this buffer.
      </p>

      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => save(enabled ? 0 : 10)}
          disabled={saving}
          className={`px-4 py-2 text-xs tracking-widest2 uppercase disabled:opacity-40 ${
            enabled ? "bg-charcoal text-bone" : "border border-charcoal/20"
          }`}
        >
          {enabled ? "Enabled" : "Disabled"}
        </button>
        <span className="text-sm text-charcoal/50">
          {enabled ? `${percent}% buffer` : "Currently off"}
        </span>
      </div>

      {enabled && (
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={1}
            max={100}
            className="w-24 border border-charcoal/20 px-3 py-2 text-sm"
            value={percent}
            onChange={(e) => setPercent(Number(e.target.value))}
          />
          <button
            onClick={() => save(percent)}
            disabled={saving || percent < 1}
            className="text-xs underline disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      )}

      {saved && <p className="text-xs text-charcoal/50 mt-3">Saved.</p>}
      {error && <p className="text-xs text-red-700 mt-3">{error}</p>}
    </div>
  );
}
