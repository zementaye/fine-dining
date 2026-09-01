import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { z } from "zod";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = await checkRateLimit(`register:${ip}`, { windowSeconds: 300, max: 5 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Please wait a few minutes and try again." }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.email, parsed.data.email) });
  if (existing) {
    // Same generic message either way — don't leak which emails are registered.
    return NextResponse.json({ error: "Could not create account." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const [row] = await db
    .insert(users)
    .values({ name: parsed.data.name, email: parsed.data.email, passwordHash, role: "guest" })
    .returning({ id: users.id });

  if (!row) {
    return NextResponse.json({ error: "Could not create account." }, { status: 500 });
  }

  return NextResponse.json({ id: row.id }, { status: 201 });
}
