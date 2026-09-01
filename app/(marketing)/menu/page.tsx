import type { Metadata } from "next";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Menu | Gursha",
  description:
    "The Gursha tasting menu and à la carte — doro wat, kitfo, awaze tibs, and a vegetarian beyaynetu sampler, served family-style on fresh-baked injera.",
};

// Menu page: active a la carte + tasting menu. Prices are de-emphasized (discreet
// luxury) — shown small, not the visual focus. Allergen info sits behind a details
// disclosure per item rather than cluttering the layout. Wine pairing notes show
// per course on tasting-menu items.
export default async function MenuPage() {
  const activeMenus = await db.query.menus.findMany({
    where: (m, { eq }) => eq(m.isActive, true),
    with: { courses: { orderBy: (c, { asc }) => [asc(c.courseNumber)] }, items: true },
  });

  const alaCarte = activeMenus.find((m) => m.type === "a_la_carte");
  const tasting = activeMenus.find((m) => m.type === "tasting");

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 py-20">
      <p className="divider-mark mb-4 text-xs uppercase tracking-widest2">Gursha</p>
      <h1 className="font-display text-4xl text-center mb-4">Menu</h1>
      <p className="text-center text-charcoal/50 text-sm mb-16 max-w-md mx-auto">
        Dishes are served family-style on injera, meant for the table to share —
        pull up a piece and dig in.
      </p>

      {tasting && (
        <section className="mb-20">
          <h2 className="font-display text-2xl text-center mb-2">{tasting.name}</h2>
          {tasting.priceCents != null && (
            <p className="text-center text-sm text-charcoal/50 mb-10">
              ${(tasting.priceCents / 100).toFixed(0)} per guest · min. 2 guests
            </p>
          )}
          {tasting.courses.map((course) => {
            const items = tasting.items.filter((i) => i.courseId === course.id);
            return (
              <div key={course.id} className="mb-8 text-center">
                <p className="text-xs uppercase tracking-widest2 text-brass mb-2">
                  Course {course.courseNumber} — {course.name}
                </p>
                {items.map((item) => (
                  <div key={item.id} className="mb-1">
                    <p className="font-display text-lg">{item.name}</p>
                    <p className="text-sm text-charcoal/60">{item.description}</p>
                    {item.winePairingNote && (
                      <p className="text-xs text-brass mt-1">Paired: {item.winePairingNote}</p>
                    )}
                    {item.allergens.length > 0 && (
                      <details className="text-xs text-charcoal/40 mt-1 inline-block">
                        <summary className="cursor-pointer">Allergen info</summary>
                        {item.allergens.join(", ")}
                      </details>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </section>
      )}

      {alaCarte && (
        <section>
          <h2 className="font-display text-2xl text-center mb-10">{alaCarte.name}</h2>
          {["Starters", "Mains", "Desserts"].map((category) => {
            const items = alaCarte.items.filter((i) => i.category === category);
            if (items.length === 0) return null;
            return (
              <div key={category} className="mb-10">
                <p className="text-xs uppercase tracking-widest2 text-brass mb-4 text-center">
                  {category}
                </p>
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between items-baseline mb-3 gap-4">
                    <div>
                      <p className="font-display text-lg">{item.name}</p>
                      <p className="text-sm text-charcoal/60">{item.description}</p>
                      {item.allergens.length > 0 && (
                        <details className="text-xs text-charcoal/40 mt-1">
                          <summary className="cursor-pointer">Allergen info</summary>
                          {item.allergens.join(", ")}
                        </details>
                      )}
                    </div>
                    {item.priceCents != null && (
                      <span className="text-sm text-charcoal/50 whitespace-nowrap">
                        ${(item.priceCents / 100).toFixed(0)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
