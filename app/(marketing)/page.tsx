import Link from "next/link";
import { db } from "@/lib/db";

// Homepage: full-bleed hero, one-line philosophy, chef teaser, press strip.
// Typography, a warm dark palette, and a woven-tray texture carry the design —
// deliberately no stock-photo banners standing in for real photography.
export default async function HomePage() {
  const press = await db.query.pressMentions.findMany({
    where: (p, { eq }) => eq(p.isActive, true),
    orderBy: (p, { asc }) => [asc(p.displayOrder)],
    limit: 6,
  });

  return (
    <div>
      <section className="relative h-[92vh] flex items-end bg-charcoal text-bone overflow-hidden">
        <div className="absolute inset-0 bg-mesob text-brass/[0.07]" />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/60 to-charcoal/20" />
        <div className="relative z-10 px-8 pb-20 max-w-3xl">
          <p className="uppercase tracking-widest2 text-brass text-sm mb-4">
            Est. — Shaw, Washington D.C.
          </p>
          <h1 className="font-display text-6xl md:text-7xl leading-tight mb-6">
            Cooking that gathers everyone around one plate.
          </h1>
          <p className="text-bone/70 max-w-xl mb-8 leading-relaxed">
            A modern Ethiopian dining room built around live fire, a house berbere
            spice program, and injera baked to order — served the traditional way:
            family-style, by hand, from a single tray.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/reservations"
              className="inline-block bg-brass text-charcoal px-8 py-3 tracking-widest2 uppercase text-sm hover:bg-bone transition-colors"
            >
              Reserve a Table
            </Link>
            <Link
              href="/menu"
              className="inline-block border border-bone/40 px-8 py-3 tracking-widest2 uppercase text-sm hover:border-bone transition-colors"
            >
              View Menu
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-8 py-24 text-center">
        <p className="divider-mark mb-6 text-xs uppercase tracking-widest2">Gursha</p>
        <h2 className="font-display text-3xl mb-6">
          A gesture, not just a dish
        </h2>
        <p className="text-charcoal/80 leading-relaxed">
          In Ethiopia, a <em>gursha</em> is a hand-fed bite offered to someone at the
          table — a small, wordless act of hospitality. It's the idea our whole
          room is built around: one tray of injera, a half-dozen stews sharing
          the same plate, and a table where reaching in is the point. Chef Selam
          Tesfaye brings that tradition to Shaw with market-driven produce, a
          spice program milled in-house, and a coffee ceremony to close the meal.
        </p>
        <Link href="/about" className="nav-link inline-block mt-6">
          Read the Full Story →
        </Link>
      </section>

      <section className="bg-charcoal text-bone px-8 py-20">
        <div className="max-w-5xl mx-auto grid sm:grid-cols-3 gap-10 text-center">
          <div>
            <p className="font-display text-2xl mb-3">Live-Fire Kitchen</p>
            <p className="text-bone/60 text-sm leading-relaxed">
              Tibs and kitfo finished over an open flame, spiced with berbere and
              mitmita ground fresh every morning.
            </p>
          </div>
          <div>
            <p className="font-display text-2xl mb-3">House Injera</p>
            <p className="text-bone/60 text-sm leading-relaxed">
              Teff fermented for three days and baked to order on a traditional
              mitad, ten minutes before it reaches your table.
            </p>
          </div>
          <div>
            <p className="font-display text-2xl mb-3">Coffee Ceremony</p>
            <p className="text-bone/60 text-sm leading-relaxed">
              Every dinner closes with buna — beans roasted tableside, brewed in
              a jebena, poured three rounds deep.
            </p>
          </div>
        </div>
      </section>

      {press.length > 0 && (
        <section className="px-8 py-16 border-t border-charcoal/10">
          <p className="text-center uppercase tracking-widest2 text-sm text-charcoal/50 mb-8">
            As Featured In
          </p>
          <div className="flex flex-wrap justify-center gap-10 opacity-70">
            {press.map((p) => (
              <span key={p.id} className="font-display text-xl">{p.outlet}</span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
