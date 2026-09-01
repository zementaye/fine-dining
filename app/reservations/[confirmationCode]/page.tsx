import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { reservations } from "@/lib/db/schema";
import { notFound } from "next/navigation";
import { CancelButton } from "@/components/reservations/CancelButton";
import { AddToCalendarButton } from "@/components/reservations/AddToCalendarButton";
import { PaymentPendingBanner } from "@/components/reservations/PaymentPendingBanner";

export const metadata: Metadata = {
  title: "Your Reservation | Gursha",
  robots: { index: false, follow: false },
};

// /reservations/[confirmationCode] — guest views and can cancel (subject to the
// cancellation window, enforced server-side in DELETE /api/reservations/[id]).
export default async function ManageReservationPage({
  params,
  searchParams,
}: {
  params: Promise<{ confirmationCode: string }>;
  searchParams: Promise<{ justBooked?: string }>;
}) {
  const { confirmationCode } = await params;
  const { justBooked } = await searchParams;
  const reservation = await db.query.reservations.findFirst({
    where: eq(reservations.confirmationCode, confirmationCode.toUpperCase()),
    with: { table: true },
  });

  if (!reservation) notFound();

  const isCancellable = !["cancelled", "completed", "no_show"].includes(reservation.status);

  return (
    <div className="max-w-xl mx-auto px-5 sm:px-8 py-20">
      <p className="divider-mark mb-4 text-xs uppercase tracking-widest2">Gursha</p>
      <h1 className="font-display text-4xl text-center mb-2">Your Reservation</h1>
      <p className="text-center text-charcoal/50 mb-6">Confirmation {reservation.confirmationCode}</p>

      {justBooked === "1" && (
        <p
          role="status"
          className="text-center text-sm bg-brass/10 border border-brass/30 text-brass px-4 py-3 mb-6"
        >
          Reservation confirmed — a confirmation email is on its way.
        </p>
      )}

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
