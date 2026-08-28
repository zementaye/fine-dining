import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { wineList } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth";

const createSchema = z.object({
  category: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  vintage: z.string().max(20).nullable().optional(),
  region: z.string().min(1).max(200),
  priceGlassCents: z.number().int().nullable().optional(),
  priceBottleCents: z.number().int().nullable().optional(),
});

// POST /api/admin/wine — add a wine to the list (staff only).
export async function POST(req: NextRequest) {
  const session = await requireRole(["host", "admin"]);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [row] = await db.insert(wineList).values(parsed.data).returning();
  return NextResponse.json(row, { status: 201 });
}
