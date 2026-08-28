import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { menus } from "@/lib/db/schema";
import { MenuItemEditor } from "@/components/admin/MenuItemEditor";

// /admin/menus/[id] — full item-level CRUD for one menu version. Reachable
// from the menu list; this is the piece that was previously a documented gap.
export default async function MenuDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const menu = await db.query.menus.findFirst({
    where: eq(menus.id, id),
    with: {
      courses: { orderBy: (c, { asc }) => [asc(c.courseNumber)] },
      items: { orderBy: (i, { asc }) => [asc(i.displayOrder)] },
    },
  });
  if (!menu) notFound();

  return (
    <div>
      <h1 className="font-display text-3xl mb-1">{menu.name}</h1>
      <p className="text-charcoal/50 text-sm mb-8 capitalize">{menu.type.replace("_", " ")}</p>
      <MenuItemEditor menu={menu} />
    </div>
  );
}
