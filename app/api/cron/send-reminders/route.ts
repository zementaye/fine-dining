import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { reservations } from "@/lib/db/schema";
import { sendReminderEmail, sendReminderSms } from "@/lib/email/send";

function authorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

// GET /api/cron/send-reminders — Vercel Cron, runs hourly. Finds reservations
// ~24h and ~2h out that haven't been reminded yet and sends email/SMS.
export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  let sent24h = 0;
  let sent2h = 0;

  for (const { field, hoursOut, label } of [
    { field: "reminded24h" as const, hoursOut: 24, label: "24h" as const },
    { field: "reminded2h" as const, hoursOut: 2, label: "2h" as const },
  ]) {
    // Window: reservations landing within this cron's hourly tick, `hoursOut` from now.
    const windowStart = new Date(now.getTime() + (hoursOut - 0.5) * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + (hoursOut + 0.5) * 60 * 60 * 1000);

    const candidates = await db.query.reservations.findMany({
      where: and(eq(reservations.status, "confirmed"), eq(reservations[field], false)),
    });

    for (const r of candidates) {
      const when = new Date(`${r.reservationDate}T${r.reservationTime}`);
      if (when < windowStart || when > windowEnd) continue;

      await sendReminderEmail({
        to: r.guestEmail,
        guestName: r.guestName,
        date: r.reservationDate,
        time: r.reservationTime,
        partySize: r.partySize,
        label,
      }).catch((err) => console.error("Reminder email failed", r.id, err));

      if (r.guestPhone) {
        await sendReminderSms({ to: r.guestPhone, date: r.reservationDate, time: r.reservationTime }).catch(
          (err) => console.error("Reminder SMS failed", r.id, err)
        );
      }

      await db.update(reservations).set({ [field]: true }).where(eq(reservations.id, r.id));
      label === "24h" ? sent24h++ : sent2h++;
    }
  }

  return NextResponse.json({ sent24h, sent2h });
}
