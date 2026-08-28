import { NextRequest, NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { menus } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// PATCH — activates this menu and deactivates any other menu of the same type
// (only one active version per type is shown publicly, per spec). Past versions
// are deactivated, never deleted — preserved for year-over-year reference.
export async function PATCH(_req: NextRequest, { params }: Params) {
  const session = await requireRole(["host", "admin"]);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const menu = await db.query.menus.findFirst({ where: eq(menus.id, id) });
  if (!menu) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.transaction(async (tx) => {
    await tx
      .update(menus)
      .set({ isActive: false })
      .where(and(eq(menus.type, menu.type), ne(menus.id, id)));
    await tx.update(menus).set({ isActive: true }).where(eq(menus.id, id));
  });

  return NextResponse.json({ ok: true });
}
