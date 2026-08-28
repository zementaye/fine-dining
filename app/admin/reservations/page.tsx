import { db } from "@/lib/db";
import { ReservationTable } from "@/components/admin/ReservationTable";

// Reservation list/calendar. Day view with quick actions (confirm/seat/complete/
// no-show/cancel) and manual booking entry for phone reservations — that entry
// point posts to the same /api/reservations create path as the public flow, so it
// runs through the identical availability-check function, no bypass.
export default async function AdminReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const day = date ?? new Date().toISOString().slice(0, 10);

  const rows = await db.query.reservations.findMany({
    where: (r, { eq }) => eq(r.reservationDate, day),
    with: { table: true },
    orderBy: (r, { asc }) => [asc(r.reservationTime)],
  });

  return (
    <div>
      <h1 className="font-display text-3xl mb-8">Reservations</h1>
      <ReservationTable initialDate={day} initialRows={rows} />
    </div>
  );
}
