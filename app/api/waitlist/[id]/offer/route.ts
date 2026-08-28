import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { waitlist } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth";
import { getSetting } from "@/lib/db/queries/settings";
import { sendReminderSms } from "@/lib/email/send";
import { Resend } from "resend";
import { z } from "zod";

const resend = new Resend(process.env.RESEND_API_KEY);

const offerSchema = z.object({
  tableId: z.string().uuid(),
  // The specific bookable slot being offered (not the guest's fuzzy requested
  // range) — this is what actually gets booked when they claim it.
  time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
});

type Params = { params: Promise<{ id: string }> };

// POST /api/waitlist/[id]/offer — staff offers a freed-up slot. Sends a
// time-limited claim link (email/SMS) and sets offerExpiresAt so the hourly
// expire-waitlist cron can auto-expire it if unclaimed.
export async function POST(req: NextRequest, { params }: Params) {
  const session = await requireRole(["host", "admin"]);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const parsed = offerSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { tableId, time } = parsed.data;

  const entry = await db.query.waitlist.findFirst({ where: eq(waitlist.id, id) });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const expiryMinutes = Number((await getSetting("waitlist_offer_expiry_minutes")) ?? 15);
  const claimToken = nanoid(24);
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  await db
    .update(waitlist)
    .set({
      status: "offered",
      offeredTableId: tableId,
      offeredTime: time,
      claimToken,
      offerExpiresAt: expiresAt,
    })
    .where(eq(waitlist.id, id));

  const claimUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/waitlist/claim/${claimToken}`;

  await resend.emails.send({
    from: "reservations@gursharestaurant.com",
    to: entry.guestEmail,
    subject: "A table just opened up",
    text: `A table is available at ${time.slice(0, 5)} on ${entry.requestedDate}. Claim it within ${expiryMinutes} minutes: ${claimUrl}`,
  });
  if (entry.guestPhone) {
    await sendReminderSms({ to: entry.guestPhone, date: entry.requestedDate, time }).catch(() => {});
  }

  return NextResponse.json({ ok: true, expiresAt });
}
