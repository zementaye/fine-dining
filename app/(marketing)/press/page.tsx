import type { Metadata } from "next";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Press | Gursha",
  description: "News and reviews covering Gursha, a modern Ethiopian restaurant in Shaw, Washington D.C.",
};

export default async function PressPage() {
  const press = await db.query.pressMentions.findMany({
    where: (p, { eq }) => eq(p.isActive, true),
    orderBy: (p, { asc }) => [asc(p.displayOrder)],
  });

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 py-20">
      <p className="divider-mark mb-4 text-xs uppercase tracking-widest2">Gursha</p>
      <h1 className="font-display text-4xl text-center mb-16">Press</h1>

      {press.length === 0 && (
        <p className="text-center text-charcoal/40 text-sm">Nothing to show yet.</p>
      )}

      <div className="space-y-10">
        {press.map((p) => (
          <article key={p.id} className="border-b border-charcoal/10 pb-8">
            <p className="eyebrow mb-2">
              {p.outlet}
              {p.publishedDate && (
                <span className="text-charcoal/40 normal-case tracking-normal">
                  {" "}
                  · {new Date(`${p.publishedDate}T00:00:00`).toLocaleDateString(undefined, {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              )}
            </p>
            <h2 className="font-display text-2xl mb-2">{p.headline}</h2>
            {p.url && (
              <a href={p.url} target="_blank" rel="noreferrer" className="nav-link">
                Read the piece →
              </a>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
