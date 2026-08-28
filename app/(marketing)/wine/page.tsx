import { db } from "@/lib/db";

// Wine & Tej page: pulls from the same `wine_list` table the admin editor
// writes to (see /admin/wine + WineItemEditor), grouped by category —
// house tej (honey wine) flights first, then the by-the-glass and bottle list.
export default async function WinePage() {
  const wines = await db.query.wineList.findMany({
    orderBy: (w, { asc }) => [asc(w.category), asc(w.name)],
  });

  const categories = Array.from(new Set(wines.map((w) => w.category)));

  return (
    <div className="max-w-3xl mx-auto px-8 py-20">
      <p className="divider-mark mb-4 text-xs uppercase tracking-widest2">Gursha</p>
      <h1 className="font-display text-4xl text-center mb-4">Wine &amp; Tej</h1>
      <p className="text-center text-charcoal/50 text-sm mb-16 max-w-md mx-auto">
        Our list opens with tej — Ethiopia's honey wine, brewed in-house with
        gesho and orange blossom — then moves into a small, natural-leaning
        wine list chosen to stand up to berbere and smoke.
      </p>

      {categories.length === 0 && (
        <p className="text-center text-charcoal/40 text-sm">
          The list is being finalized — check back shortly, or ask your server.
        </p>
      )}

      {categories.map((category) => {
        const items = wines.filter((w) => w.category === category);
        return (
          <section key={category} className="mb-14">
            <p className="text-xs uppercase tracking-widest2 text-brass mb-6 text-center">
              {category}
            </p>
            <div className="space-y-4">
              {items.map((w) => (
                <div key={w.id} className="flex justify-between items-baseline gap-4">
                  <div>
                    <p className="font-display text-lg">
                      {w.name} {w.vintage && <span className="text-charcoal/50">· {w.vintage}</span>}
                    </p>
                    <p className="text-sm text-charcoal/60">{w.region}</p>
                  </div>
                  <div className="text-right text-sm text-charcoal/50 whitespace-nowrap">
                    {w.priceGlassCents != null && (
                      <p>${(w.priceGlassCents / 100).toFixed(0)} gl.</p>
                    )}
                    {w.priceBottleCents != null && (
                      <p>${(w.priceBottleCents / 100).toFixed(0)} btl.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
