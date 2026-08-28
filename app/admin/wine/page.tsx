import { db } from "@/lib/db";
import { WineItemEditor } from "@/components/admin/WineItemEditor";

// Wine list CMS — same admin-editable pattern as menus (see
// /admin/menus/[id] + MenuItemEditor). Full CRUD via WineItemEditor.
export default async function AdminWinePage() {
  const wines = await db.query.wineList.findMany({ orderBy: (w, { asc }) => [asc(w.category)] });
  return (
    <div>
      <h1 className="font-display text-3xl mb-8">Wine List</h1>
      <WineItemEditor wines={wines} />
    </div>
  );
}
