import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { waitlist, restaurantTables } from "@/lib/db/schema";
import { WaitlistPanel } from "@/components/admin/WaitlistPanel";

export default async function AdminWaitlistPage() {
  const entries = await db.query.waitlist.findMany({
    where: eq(waitlist.status, "waiting"),
    orderBy: (w, { asc }) => [asc(w.createdAt)],
  });
  const tables = await db.query.restaurantTables.findMany({
    where: eq(restaurantTables.isActive, true),
  });

  return (
    <div>
      <h1 className="font-display text-3xl mb-8">Waitlist</h1>
      <WaitlistPanel entries={entries} tables={tables} />
    </div>
  );
}
