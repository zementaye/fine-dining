"use client";

import { useEffect, useState } from "react";

type Table = {
  id: string;
  label: string;
  zone: string;
  minPartySize: number;
  maxPartySize: number;
};

type Reservation = {
  id: string;
  guestName: string;
  partySize: number;
  reservationTime: string;
  status: string;
  tableId: string | null;
  dietaryNotes: string | null;
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 border-yellow-400",
  confirmed: "bg-blue-50 border-blue-300",
  seated: "bg-green-100 border-green-500",
  completed: "bg-charcoal/5 border-charcoal/20",
  cancelled: "bg-charcoal/5 border-charcoal/10 opacity-40",
  no_show: "bg-red-50 border-red-300",
};

export function FloorMap({ tables, initialDate }: { tables: Table[]; initialDate: string }) {
  const [date, setDate] = useState(initialDate);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/admin/reservations-by-date?date=${date}`);
    if (res.ok) setReservations(await res.json());
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const byTable = new Map(reservations.filter((r) => r.tableId).map((r) => [r.tableId, r]));
  const unassigned = reservations.filter((r) => !r.tableId && r.status !== "cancelled");
  const zones = Array.from(new Set(tables.map((t) => t.zone)));

  async function assign(reservationId: string, tableId: string) {
    const res = await fetch("/api/admin/floor/assign", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reservationId, tableId }),
    });
    if (res.ok) load();
    else {
      const data = await res.json();
      alert(data.error ?? "Could not assign table.");
    }
  }

  return (
    <div>
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="border border-charcoal/20 px-3 py-2 mb-6"
      />

      {unassigned.length > 0 && (
        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest2 text-charcoal/50 mb-2">Unassigned</p>
          <div className="flex flex-wrap gap-2">
            {unassigned.map((r) => (
              <div
                key={r.id}
                draggable
                onDragStart={() => setDragId(r.id)}
                className="border border-charcoal/30 px-3 py-2 text-xs cursor-move bg-white"
              >
                {r.reservationTime.slice(0, 5)} · {r.guestName} · party {r.partySize}
                {r.dietaryNotes && <span className="text-red-700 ml-1">⚠</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {zones.map((zone) => (
        <div key={zone} className="mb-8">
          <p className="text-xs uppercase tracking-widest2 text-charcoal/50 mb-3">{zone}</p>
          <div className="grid grid-cols-4 gap-3">
            {tables
              .filter((t) => t.zone === zone)
              .map((table) => {
                const r = byTable.get(table.id);
                return (
                  <div
                    key={table.id}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => dragId && assign(dragId, table.id)}
                    className={`border-2 rounded p-3 text-xs min-h-[70px] ${
                      r ? STATUS_COLOR[r.status] : "border-charcoal/15 bg-white"
                    }`}
                  >
                    <p className="font-medium mb-1">
                      {table.label} <span className="text-charcoal/40">({table.minPartySize}-{table.maxPartySize})</span>
                    </p>
                    {r ? (
                      <>
                        <p>{r.guestName}</p>
                        <p className="text-charcoal/50">
                          {r.reservationTime.slice(0, 5)} · party {r.partySize}
                        </p>
                        {r.dietaryNotes && <p className="text-red-700">⚠ {r.dietaryNotes}</p>}
                      </>
                    ) : (
                      <p className="text-charcoal/30">Open</p>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}
