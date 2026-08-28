import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, reservations } from "@/lib/db/schema";

// POST /api/account/delete-data — guest data-deletion request (privacy compliance
// requirement). Anonymizes PII on past reservations rather than hard-deleting rows
// outright, so historical covers/analytics remain consistent; scrubs the user record.
export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;

  await db.transaction(async (tx) => {
    await tx
      .update(reservations)
      .set({
        guestName: "Deleted Guest",
        guestEmail: "deleted@example.com",
        guestPhone: null,
        dietaryNotes: null,
        mobilityNotes: null,
        internalNotes: null,
      })
      .where(eq(reservations.userId, userId));

    await tx
      .update(users)
      .set({ name: "Deleted Guest", email: `deleted-${userId}@example.com`, phone: null, vipNotes: null })
      .where(eq(users.id, userId));
  });

  return NextResponse.json({ ok: true });
}
