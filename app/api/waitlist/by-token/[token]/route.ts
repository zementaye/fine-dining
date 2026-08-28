import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { waitlist } from "@/lib/db/schema";

type Params = { params: Promise<{ token: string }> };

// GET /api/waitlist/by-token/[token] — resolves a claim-link token to the
// waitlist entry (id, offered time/table, expiry) without exposing every
// field. Public but token-gated: the token itself is the credential
// (24-char nanoid, sent only via the guest's own email/SMS).
export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;

  const entry = await db.query.waitlist.findFirst({
    where: eq(waitlist.claimToken, token),
    with: { offeredTable: true },
  });

  if (!entry || entry.status !== "offered") {
    return NextResponse.json({ error: "This offer is invalid or has already been used." }, { status: 404 });
  }
  if (entry.offerExpiresAt && entry.offerExpiresAt < new Date()) {
    return NextResponse.json({ error: "This offer has expired." }, { status: 410 });
  }

  return NextResponse.json({
    waitlistId: entry.id,
    guestName: entry.guestName,
    partySize: entry.partySize,
    requestedDate: entry.requestedDate,
    offeredTime: entry.offeredTime,
    offerExpiresAt: entry.offerExpiresAt,
    tableLabel: entry.offeredTable?.label ?? null,
  });
}
