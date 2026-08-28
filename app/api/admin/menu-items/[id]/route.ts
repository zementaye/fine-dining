import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { menuItems } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth";
import { logAdminActivity } from "@/lib/audit";

const updateSchema = z.object({
  courseId: z.string().uuid().nullable().optional(),
  category: z.string().nullable().optional(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(1000).optional(),
  priceCents: z.number().int().nullable().optional(),
  allergens: z.array(z.string()).optional(),
  winePairingNote: z.string().nullable().optional(),
});

type Params = { params: Promise<{ id: string }> };

// PATCH /api/admin/menu-items/[id] — edit an item (staff only).
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await requireRole(["host", "admin"]);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [row] = await db.update(menuItems).set(parsed.data).where(eq(menuItems.id, id)).returning();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logAdminActivity({
    actorUserId: (session.user as any)?.id,
    actorName: session.user?.name ?? "Unknown staff",
    action: "menu_edit",
    targetType: "menu_item",
    targetId: id,
    detail: { fields: Object.keys(parsed.data) },
  });

  return NextResponse.json(row);
}

// DELETE /api/admin/menu-items/[id] — remove an item (staff only).
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await requireRole(["host", "admin"]);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const existing = await db.query.menuItems.findFirst({ where: eq(menuItems.id, id) });
  await db.delete(menuItems).where(eq(menuItems.id, id));

  if (existing) {
    await logAdminActivity({
      actorUserId: (session.user as any)?.id,
      actorName: session.user?.name ?? "Unknown staff",
      action: "menu_item_delete",
      targetType: "menu_item",
      targetId: id,
      detail: { name: existing.name },
    });
  }

  return NextResponse.json({ ok: true });
}
