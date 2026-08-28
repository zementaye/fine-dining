import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { menuItems } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth";

const createSchema = z.object({
  menuId: z.string().uuid(),
  courseId: z.string().uuid().nullable().optional(),
  category: z.string().nullable().optional(),
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  priceCents: z.number().int().nullable().optional(),
  allergens: z.array(z.string()).default([]),
  winePairingNote: z.string().nullable().optional(),
});

// POST /api/admin/menu-items — create a menu item (staff only).
export async function POST(req: NextRequest) {
  const session = await requireRole(["host", "admin"]);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [row] = await db.insert(menuItems).values(parsed.data).returning();
  return NextResponse.json(row, { status: 201 });
}
