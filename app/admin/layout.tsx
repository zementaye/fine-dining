import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/floor", label: "Floor Map" },
  { href: "/admin/reservations", label: "Reservations" },
  { href: "/admin/waitlist", label: "Waitlist" },
  { href: "/admin/menus", label: "Menus" },
  { href: "/admin/wine", label: "Wine & Tej" },
  { href: "/admin/private-events", label: "Private Events" },
  { href: "/admin/activity", label: "Activity Log" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session || (role !== "host" && role !== "admin")) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex bg-bone-100">
      <aside className="w-60 bg-charcoal text-bone/80 p-6 flex flex-col">
        <p className="font-display text-2xl text-bone mb-1">Gursha</p>
        <p className="text-xs uppercase tracking-widest2 text-bone/40 mb-8">Floor Office</p>
        <nav className="flex flex-col gap-1 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-2 rounded hover:bg-bone/10 hover:text-bone transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-8 text-xs text-bone/30">
          Signed in as {session.user?.name ?? session.user?.email}
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
