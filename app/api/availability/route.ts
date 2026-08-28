import { NextRequest, NextResponse } from "next/server";
import { availabilityQuerySchema } from "@/lib/validations";
import { getAvailableSlots } from "@/lib/booking-engine";

// GET /api/availability?date=YYYY-MM-DD&partySize=4
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const parsed = availabilityQuerySchema.safeParse({
    date: searchParams.get("date"),
    partySize: searchParams.get("partySize"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { date, partySize } = parsed.data;
  const dayOfWeek = new Date(`${date}T00:00:00Z`).getUTCDay();

  const slots = await getAvailableSlots({ date, partySize, dayOfWeek });
  return NextResponse.json({ date, partySize, slots });
}
