import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { getSetting, setSetting } from "@/lib/db/queries/settings";
import { requireRole } from "@/lib/auth";
import { logAdminActivity } from "@/lib/audit";

const updateSchema = z.object({
  overbookingBufferPercent: z.number().int().min(0).max(100),
});

// GET /api/admin/settings/overbooking-buffer — current value (staff only).
export async function GET() {
  const session = await requireRole(["host", "admin"]);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const value = Number((await getSetting("overbooking_buffer_percent")) ?? 0);
  return NextResponse.json({ overbookingBufferPercent: value });
}

// PATCH /api/admin/settings/overbooking-buffer — update the host-assisted
// overbooking buffer. Was previously only settable by editing the `settings`
// row directly (or via db:seed); this is the first admin-UI path for it.
export async function PATCH(req: NextRequest) {
  const session = await requireRole(["host", "admin"]);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await setSetting("overbooking_buffer_percent", parsed.data.overbookingBufferPercent);

  const row = await db.query.settings.findFirst({ where: eq(settings.key, "overbooking_buffer_percent") });
  if (row) {
    await logAdminActivity({
      actorUserId: (session.user as any)?.id,
      actorName: session.user?.name ?? "Unknown staff",
      action: "settings_change",
      targetType: "setting",
      targetId: row.id,
      detail: { key: "overbooking_buffer_percent", value: parsed.data.overbookingBufferPercent },
    });
  }

  return NextResponse.json({ overbookingBufferPercent: parsed.data.overbookingBufferPercent });
}
