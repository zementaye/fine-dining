import { db } from "@/lib/db";

export default async function GalleryPage() {
  const images = await db.query.galleryImages.findMany({
    where: (g, { eq }) => eq(g.isActive, true),
    orderBy: (g, { asc }) => [asc(g.displayOrder)],
  });

  return (
    <div className="max-w-5xl mx-auto px-8 py-20">
      <p className="divider-mark mb-4 text-xs uppercase tracking-widest2">Gursha</p>
      <h1 className="font-display text-4xl text-center mb-16">Gallery</h1>

      {images.length === 0 && (
        <p className="text-center text-charcoal/40 text-sm">
          Photos are on their way — check back soon.
        </p>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        {images.map((img) => (
          <figure key={img.id} className="group relative overflow-hidden bg-charcoal aspect-[4/5]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.imageUrl}
              alt={img.altText}
              className="h-full w-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
            />
            {img.caption && (
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-charcoal/90 to-transparent text-bone text-xs tracking-widest2 uppercase px-4 py-3">
                {img.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </div>
  );
}
