import { db } from "@/lib/db";
import { FloorMap } from "@/components/admin/FloorMap";

// /admin/floor — visual table map by zone, click to assign, drag from the
// "unassigned" tray. All assignment mutations go through
// PATCH /api/admin/floor/assign, which uses the booking engine's conflict check.
export default async function FloorPage() {
  const tables = await db.query.restaurantTables.findMany({
    where: (t, { eq }) => eq(t.isActive, true),
  });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <h1 className="font-display text-3xl mb-8">Floor Map</h1>
      <FloorMap tables={tables} initialDate={today} />
    </div>
  );
}
