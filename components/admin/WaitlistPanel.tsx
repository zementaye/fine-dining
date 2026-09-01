"use client";

import { useState } from "react";

type Entry = {
  id: string;
  guestName: string;
  guestEmail: string;
  partySize: number;
  requestedDate: string;
  requestedTimeRange: string;
};
type Table = { id: string; label: string; maxPartySize: number };

export function WaitlistPanel({ entries, tables }: { entries: Entry[]; tables: Table[] }) {
  const [offeringId, setOfferingId] = useState<string | null>(null);
  const [tableId, setTableId] = useState("");
  const [time, setTime] = useState("");
  const [sending, setSending] = useState(false);

  async function offer(entryId: string) {
    if (!tableId || !time) return;
    setSending(true);
    const res = await fetch(`/api/waitlist/${entryId}/offer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableId, time: `${time}:00` }),
    });
    setSending(false);
    if (res.ok) {
      setOfferingId(null);
      setTableId("");
      setTime("");
    }
  }

  return (
    <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead className="text-left text-charcoal/50 border-b border-charcoal/10">
        <tr><th className="py-2">Guest</th><th>Party</th><th>Requested</th><th>Offer</th></tr>
      </thead>
      <tbody>
        {entries.map((e) => (
          <tr key={e.id} className="border-b border-charcoal/5">
            <td className="py-2">{e.guestName}</td>
            <td>{e.partySize}</td>
            <td>{e.requestedDate} · {e.requestedTimeRange}</td>
            <td>
              {offeringId === e.id ? (
                <div className="flex gap-2 items-center">
                  <select value={tableId} onChange={(ev) => setTableId(ev.target.value)} className="border px-2 py-1 text-xs">
                    <option value="">Table…</option>
                    {tables.filter((t) => t.maxPartySize >= e.partySize).map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                  <input type="time" value={time} onChange={(ev) => setTime(ev.target.value)} className="border px-2 py-1 text-xs" />
                  <button
                    onClick={() => offer(e.id)}
                    disabled={!tableId || !time || sending}
                    className="text-xs underline disabled:opacity-40"
                  >
                    Send offer
                  </button>
                </div>
              ) : (
                <button onClick={() => setOfferingId(e.id)} className="text-xs underline">Offer a table</button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
