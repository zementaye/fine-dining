import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { reservations, privateEventInquiries } from "@/lib/db/schema";

// Admin dashboard: today's reservation count/covers, VIP flags, pending inquiries.
export default async function AdminDashboard() {
  const today = new Date().toISOString().slice(0, 10);

  const todaysReservations = await db.query.reservations.findMany({
    where: and(eq(reservations.reservationDate, today)),
    with: { table: true, user: true },
    orderBy: (r, { asc }) => [asc(r.reservationTime)],
  });

  const totalCovers = todaysReservations.reduce((sum, r) => sum + r.partySize, 0);
  const vipToday = todaysReservations.filter((r) => r.user?.vipNotes);

  const pendingInquiries = await db.query.privateEventInquiries.findMany({
    where: eq(privateEventInquiries.status, "new"),
  });

  return (
    <div>
      <h1 className="font-display text-3xl mb-8">Today's Floor</h1>
      <div className="grid grid-cols-3 gap-4 mb-10">
        <StatCard label="Reservations" value={todaysReservations.length} />
        <StatCard label="Total Covers" value={totalCovers} />
        <StatCard label="Pending Inquiries" value={pendingInquiries.length} />
      </div>

      {vipToday.length > 0 && (
        <div className="mb-10">
          <h2 className="text-sm uppercase tracking-widest2 text-charcoal/50 mb-3">
            VIP / Notable Guests Today
          </h2>
          <ul className="space-y-2">
            {vipToday.map((r) => (
              <li key={r.id} className="text-sm border-b border-charcoal/10 pb-2">
                {r.guestName} — {r.reservationTime.slice(0, 5)} — party of {r.partySize}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h2 className="text-sm uppercase tracking-widest2 text-charcoal/50 mb-3">Reservation List</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-charcoal/50 border-b border-charcoal/10">
            <tr>
              <th className="py-2">Time</th>
              <th>Guest</th>
              <th>Party</th>
              <th>Table</th>
              <th>Status</th>
              <th>Dietary / Allergens</th>
            </tr>
          </thead>
          <tbody>
            {todaysReservations.map((r) => (
              <tr key={r.id} className="border-b border-charcoal/5">
                <td className="py-2">{r.reservationTime.slice(0, 5)}</td>
                <td>{r.guestName}</td>
                <td>{r.partySize}</td>
                <td>{r.table?.label ?? "—"}</td>
                <td className="capitalize">{r.status}</td>
                <td className="text-red-700 font-medium">{r.dietaryNotes ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-charcoal/10 p-6">
      <p className="text-3xl font-display">{value}</p>
      <p className="text-xs uppercase tracking-widest2 text-charcoal/50 mt-1">{label}</p>
    </div>
  );
}
