"use client";

import { useState } from "react";

type Row = {
  id: string;
  guestName: string;
  partySize: number;
  reservationTime: string;
  status: string;
  dietaryNotes: string | null;
  mobilityNotes: string | null;
  table: { label: string } | null;
};

const NEXT_STATUS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["seated", "no_show", "cancelled"],
  seated: ["completed"],
  completed: [],
  cancelled: [],
  no_show: [],
};

export function ReservationTable({ initialDate, initialRows }: { initialDate: string; initialRows: Row[] }) {
  const [date, setDate] = useState(initialDate);
  const [rows, setRows] = useState(initialRows);

  async function reload(newDate: string) {
    setDate(newDate);
    const res = await fetch(`/api/admin/reservations-by-date?date=${newDate}`);
    if (res.ok) setRows(await res.json());
  }

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/reservations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) reload(date);
  }

  return (
    <div>
      <input
        type="date"
        value={date}
        onChange={(e) => reload(e.target.value)}
        className="border border-charcoal/20 px-3 py-2 mb-6"
      />
      <table className="w-full text-sm">
        <thead className="text-left text-charcoal/50 border-b border-charcoal/10">
          <tr>
            <th className="py-2">Time</th>
            <th>Guest</th>
            <th>Party</th>
            <th>Table</th>
            <th>Status</th>
            <th>Notes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-charcoal/5">
              <td className="py-2">{r.reservationTime.slice(0, 5)}</td>
              <td>{r.guestName}</td>
              <td>{r.partySize}</td>
              <td>{r.table?.label ?? "—"}</td>
              <td className="capitalize">{r.status}</td>
              <td className="text-red-700">
                {r.dietaryNotes} {r.mobilityNotes && `· ${r.mobilityNotes}`}
              </td>
              <td className="space-x-2">
                {NEXT_STATUS[r.status]?.map((next) => (
                  <button
                    key={next}
                    onClick={() => updateStatus(r.id, next)}
                    className="text-xs underline capitalize"
                  >
                    {next.replace("_", " ")}
                  </button>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
