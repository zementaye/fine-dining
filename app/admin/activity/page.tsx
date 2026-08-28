import { db } from "@/lib/db";

const ACTION_LABEL: Record<string, string> = {
  status_change: "Status changed",
  table_reassign: "Table reassigned",
  cancel: "Cancelled",
  menu_edit: "Menu item edited",
  menu_item_delete: "Menu item deleted",
};

// /admin/activity — audit trail of staff actions. Read-only, newest first.
// Not filtered by target type in this scaffold; add query params if the list
// grows unwieldy for a busy multi-host operation.
export default async function AdminActivityPage() {
  const entries = await db.query.adminActivityLog.findMany({
    orderBy: (a, { desc }) => [desc(a.createdAt)],
    limit: 200,
  });

  return (
    <div>
      <h1 className="font-display text-3xl mb-8">Activity Log</h1>
      <table className="w-full text-sm">
        <thead className="text-left text-charcoal/50 border-b border-charcoal/10">
          <tr>
            <th className="py-2">When</th>
            <th>Staff</th>
            <th>Action</th>
            <th>Target</th>
            <th>Detail</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-b border-charcoal/5">
              <td className="py-2 whitespace-nowrap">
                {new Date(e.createdAt).toLocaleString()}
              </td>
              <td>{e.actorName}</td>
              <td>{ACTION_LABEL[e.action] ?? e.action}</td>
              <td className="text-charcoal/50">
                {e.targetType} · {e.targetId.slice(0, 8)}
              </td>
              <td className="text-charcoal/50 max-w-xs truncate">
                {e.detail ? JSON.stringify(e.detail) : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {entries.length === 0 && (
        <p className="text-charcoal/40 text-sm mt-6">No activity recorded yet.</p>
      )}
    </div>
  );
}
