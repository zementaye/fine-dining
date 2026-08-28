import { getSetting } from "@/lib/db/queries/settings";
import { OverbookingBufferToggle } from "@/components/admin/OverbookingBufferToggle";

// /admin/settings — first admin-UI home for values in the `settings` table.
// Starts with the overbooking buffer (previously code-only); other tunables
// (deposit threshold, cancellation window, etc.) can follow the same pattern.
export default async function AdminSettingsPage() {
  const overbookingBufferPercent = Number((await getSetting("overbooking_buffer_percent")) ?? 0);

  return (
    <div>
      <h1 className="font-display text-3xl mb-8">Settings</h1>
      <OverbookingBufferToggle initialPercent={overbookingBufferPercent} />
    </div>
  );
}
