import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { wineList } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth";
import { logAdminActivity } from "@/lib/audit";

const updateSchema = z.object({
  category: z.string().min(1).max(100).optional(),
  name: z.string().min(1).max(200).optional(),
  vintage: z.string().max(20).nullable().optional(),
  region: z.string().min(1).max(200).optional(),
  priceGlassCents: z.number().int().nullable().optional(),
  priceBottleCents: z.number().int().nullable().optional(),
});

type Params = { params: Promise<{ id: string }> };

// PATCH /api/admin/wine/[id] — edit a wine list entry (staff only).
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await requireRole(["host", "admin"]);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [row] = await db.update(wineList).set(parsed.data).where(eq(wineList.id, id)).returning();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logAdminActivity({
    actorUserId: (session.user as any)?.id,
    actorName: session.user?.name ?? "Unknown staff",
    action: "wine_edit",
    targetType: "wine_item",
    targetId: id,
    detail: { fields: Object.keys(parsed.data) },
  });

  return NextResponse.json(row);
}

// DELETE /api/admin/wine/[id] — remove a wine list entry (staff only).
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await requireRole(["host", "admin"]);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const existing = await db.query.wineList.findFirst({ where: eq(wineList.id, id) });
  await db.delete(wineList).where(eq(wineList.id, id));

  if (existing) {
    await logAdminActivity({
      actorUserId: (session.user as any)?.id,
      actorName: session.user?.name ?? "Unknown staff",
      action: "wine_delete",
      targetType: "wine_item",
      targetId: id,
      detail: { name: existing.name },
    });
  }

  return NextResponse.json({ ok: true });
}
