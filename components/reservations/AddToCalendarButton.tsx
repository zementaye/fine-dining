"use client";

export function AddToCalendarButton({
  reservation,
}: {
  reservation: {
    guestName: string;
    reservationDate: string;
    reservationTime: string;
    durationMinutes: number;
    confirmationCode: string;
  };
}) {
  function download() {
    const start = new Date(`${reservation.reservationDate}T${reservation.reservationTime}`);
    const end = new Date(start.getTime() + reservation.durationMinutes * 60000);
    const fmt = (d: Date) => (d.toISOString().replace(/[-:]/g, "").split(".")[0] ?? "") + "Z";

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      `UID:${reservation.confirmationCode}@restaurant`,
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:Reservation at Gursha`,
      `DESCRIPTION:Confirmation code ${reservation.confirmationCode}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "reservation.ics";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={download}
      className="border border-charcoal/20 px-6 py-3 text-sm tracking-widest2 uppercase hover:border-brass hover:text-brass transition-colors"
    >
      Add to Calendar
    </button>
  );
}
