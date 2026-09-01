import { NextRequest, NextResponse } from "next/server";
import { privateEventInquirySchema } from "@/lib/validations";
import { db } from "@/lib/db";
import { privateEventInquiries } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth";
import { sendPrivateEventAdminNotification } from "@/lib/email/send";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// POST /api/private-events — public inquiry form submission (no self-serve booking)
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = await checkRateLimit(`private-events:${ip}`, { windowSeconds: 60, max: 3 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }

  const body = await req.json();
  const parsed = privateEventInquirySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const [row] = await db.insert(privateEventInquiries).values(parsed.data).returning();
  if (!row) {
    return NextResponse.json({ error: "Could not save inquiry." }, { status: 500 });
  }

  await sendPrivateEventAdminNotification(row).catch((err) =>
    console.error("Failed to notify admin of private event inquiry", err)
  );

  return NextResponse.json(row, { status: 201 });
}

// GET /api/private-events — staff-only inquiry inbox
export async function GET() {
  const session = await requireRole(["host", "admin"]);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await db.query.privateEventInquiries.findMany({
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });
  return NextResponse.json(rows);
}
