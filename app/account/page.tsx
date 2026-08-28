import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { reservations } from "@/lib/db/schema";

// /account — guest's upcoming/past reservations and preferences.
export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as any).id as string;
  const rows = await db.query.reservations.findMany({
    where: eq(reservations.userId, userId),
    orderBy: (r, { desc }) => [desc(r.reservationDate)],
  });

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = rows.filter((r) => r.reservationDate >= today && r.status !== "cancelled");
  const past = rows.filter((r) => r.reservationDate < today || r.status === "cancelled");

  return (
    <div className="max-w-xl mx-auto px-8 py-20">
      <h1 className="font-display text-3xl mb-10">My Reservations</h1>

      <h2 className="text-sm uppercase tracking-widest2 text-charcoal/50 mb-3">Upcoming</h2>
      <ReservationList rows={upcoming} empty="No upcoming reservations." />

      <h2 className="text-sm uppercase tracking-widest2 text-charcoal/50 mt-10 mb-3">Past</h2>
      <ReservationList rows={past} empty="No past reservations yet." />
    </div>
  );
}

function ReservationList({ rows, empty }: { rows: any[]; empty: string }) {
  if (rows.length === 0) return <p className="text-sm text-charcoal/40">{empty}</p>;
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.id} className="border-b border-charcoal/10 pb-2 text-sm flex justify-between">
          <span>{r.reservationDate} · {r.reservationTime.slice(0, 5)} · party {r.partySize}</span>
          <a href={`/reservations/${r.confirmationCode}`} className="underline">View</a>
        </li>
      ))}
    </ul>
  );
}
