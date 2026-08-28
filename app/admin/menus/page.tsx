import { db } from "@/lib/db";
import { ToggleActiveMenu } from "@/components/admin/ToggleActiveMenu";

// Menu CMS: versioned menus (past seasons deactivated, not deleted). Toggle which
// menu of each type is publicly active. Full item-level CRUD is a straightforward
// extension of this list/detail pattern — scaffolded here at the menu-version level,
// which is the part with actual business logic (only one active per type).
export default async function AdminMenusPage() {
  const allMenus = await db.query.menus.findMany({
    orderBy: (m, { desc }) => [desc(m.validFrom)],
  });

  return (
    <div>
      <h1 className="font-display text-3xl mb-8">Menus</h1>
      <table className="w-full text-sm">
        <thead className="text-left text-charcoal/50 border-b border-charcoal/10">
          <tr><th className="py-2">Name</th><th>Type</th><th>Valid</th><th>Active</th></tr>
        </thead>
        <tbody>
          {allMenus.map((m) => (
            <tr key={m.id} className="border-b border-charcoal/5">
              <td className="py-2">
                <a href={`/admin/menus/${m.id}`} className="underline">{m.name}</a>
              </td>
              <td className="capitalize">{m.type.replace("_", " ")}</td>
              <td>{m.validFrom ?? "—"} to {m.validUntil ?? "—"}</td>
              <td><ToggleActiveMenu menuId={m.id} type={m.type} isActive={m.isActive} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
