import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { reservations } from "@/lib/db/schema";
import { notFound } from "next/navigation";
import { CancelButton } from "@/components/reservations/CancelButton";
import { AddToCalendarButton } from "@/components/reservations/AddToCalendarButton";
import { PaymentPendingBanner } from "@/components/reservations/PaymentPendingBanner";

// /reservations/[confirmationCode] — guest views and can cancel (subject to the
// cancellation window, enforced server-side in DELETE /api/reservations/[id]).
export default async function ManageReservationPage({
  params,
}: {
  params: Promise<{ confirmationCode: string }>;
}) {
  const { confirmationCode } = await params;
  const reservation = await db.query.reservations.findFirst({
    where: eq(reservations.confirmationCode, confirmationCode.toUpperCase()),
    with: { table: true },
  });

  if (!reservation) notFound();

  const isCancellable = !["cancelled", "completed", "no_show"].includes(reservation.status);

  return (
    <div className="max-w-xl mx-auto px-8 py-20">
      <p className="divider-mark mb-4 text-xs uppercase tracking-widest2">Gursha</p>
      <h1 className="font-display text-4xl text-center mb-2">Your Reservation</h1>
      <p className="text-center text-charcoal/50 mb-10">Confirmation {reservation.confirmationCode}</p>

      <PaymentPendingBanner status={reservation.status} />

      <div className="card p-8 space-y-3 mb-8">
        <Row label="Status" value={reservation.status} />
        <Row
          label="Date"
          value={new Date(`${reservation.reservationDate}T00:00:00`).toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        />
        <Row label="Time" value={reservation.reservationTime.slice(0, 5)} />
        <Row label="Party size" value={String(reservation.partySize)} />
        {reservation.occasion && <Row label="Occasion" value={reservation.occasion} />}
      </div>

      <div className="flex flex-wrap gap-4">
        <AddToCalendarButton reservation={reservation} />
        {isCancellable && <CancelButton reservationId={reservation.id} />}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-charcoal/50 uppercase tracking-widest2 text-xs">{label}</span>
      <span className="capitalize">{value}</span>
    </div>
  );
}
