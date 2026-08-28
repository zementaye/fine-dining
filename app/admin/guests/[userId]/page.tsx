import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { users, reservations } from "@/lib/db/schema";

// Guest profile: visit history, total covers, average party size. vip_notes and
// internal_notes are staff-only (this whole route is staff-gated by the admin
// layout). Dietary restrictions are pulled to the top so any host sees them
// instantly, not buried in a history list.
export default async function GuestProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const guest = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!guest) notFound();

  const history = await db.query.reservations.findMany({
    where: eq(reservations.userId, userId),
    orderBy: (r, { desc }) => [desc(r.reservationDate)],
  });

  const completed = history.filter((r) => r.status === "completed");
  const totalCovers = completed.reduce((sum, r) => sum + r.partySize, 0);
  const avgPartySize = completed.length ? (totalCovers / completed.length).toFixed(1) : "—";
  const noShowCount = history.filter((r) => r.status === "no_show").length;

  const latestDietary = history.find((r) => r.dietaryNotes)?.dietaryNotes;
  const latestMobility = history.find((r) => r.mobilityNotes)?.mobilityNotes;

  return (
    <div>
      <h1 className="font-display text-3xl mb-2">{guest.name}</h1>
      <p className="text-charcoal/50 mb-6">{guest.email} · {guest.phone ?? "no phone on file"}</p>

      {(latestDietary || latestMobility) && (
        <div className="bg-red-50 border border-red-200 p-4 mb-8 text-sm">
          {latestDietary && <p><strong>Dietary:</strong> {latestDietary}</p>}
          {latestMobility && <p><strong>Accessibility:</strong> {latestMobility}</p>}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-8">
        <Stat label="Total Visits" value={completed.length} />
        <Stat label="Avg Party Size" value={avgPartySize} />
        <Stat label="No-Shows" value={noShowCount} />
      </div>

      {guest.vipNotes && (
        <div className="mb-8 border-l-2 border-brass pl-4">
          <p className="text-xs uppercase tracking-widest2 text-brass mb-1">VIP Notes (staff only)</p>
          <p className="text-sm">{guest.vipNotes}</p>
        </div>
      )}

      <h2 className="text-sm uppercase tracking-widest2 text-charcoal/50 mb-3">Visit History</h2>
      <table className="w-full text-sm">
        <thead className="text-left text-charcoal/50 border-b border-charcoal/10">
          <tr><th className="py-2">Date</th><th>Party</th><th>Status</th><th>Internal Notes</th></tr>
        </thead>
        <tbody>
          {history.map((r) => (
            <tr key={r.id} className="border-b border-charcoal/5">
              <td className="py-2">{r.reservationDate}</td>
              <td>{r.partySize}</td>
              <td className="capitalize">{r.status}</td>
              <td className="text-charcoal/50">{r.internalNotes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-charcoal/10 p-4">
      <p className="text-2xl font-display">{value}</p>
      <p className="text-xs uppercase tracking-widest2 text-charcoal/50 mt-1">{label}</p>
    </div>
  );
}
