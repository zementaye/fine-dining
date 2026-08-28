import { db } from "@/lib/db";

export default async function AdminPrivateEventsPage() {
  const inquiries = await db.query.privateEventInquiries.findMany({
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  return (
    <div>
      <h1 className="font-display text-3xl mb-8">Private Event Inquiries</h1>
      <table className="w-full text-sm">
        <thead className="text-left text-charcoal/50 border-b border-charcoal/10">
          <tr><th className="py-2">Contact</th><th>Type</th><th>Date</th><th>Party</th><th>Status</th></tr>
        </thead>
        <tbody>
          {inquiries.map((i) => (
            <tr key={i.id} className="border-b border-charcoal/5">
              <td className="py-2">{i.contactName} · {i.contactEmail}</td>
              <td>{i.eventType}</td>
              <td>{i.preferredDate}</td>
              <td>{i.partySize}</td>
              <td className="capitalize">{i.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
