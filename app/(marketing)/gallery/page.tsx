import type { Metadata } from "next";
import Image from "next/image";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Gallery | Gursha",
  description: "A look inside Gursha's dining room, kitchen, and coffee ceremony in Shaw, Washington D.C.",
};

export default async function GalleryPage() {
  const images = await db.query.galleryImages.findMany({
    where: (g, { eq }) => eq(g.isActive, true),
    orderBy: (g, { asc }) => [asc(g.displayOrder)],
  });

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 py-20">
      <p className="divider-mark mb-4 text-xs uppercase tracking-widest2">Gursha</p>
      <h1 className="font-display text-4xl text-center mb-16">Gallery</h1>

      {images.length === 0 && (
        <p className="text-center text-charcoal/40 text-sm">
          Photos are on their way — check back soon.
        </p>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        {images.map((img, i) => (
          <figure key={img.id} className="group relative overflow-hidden bg-charcoal aspect-[4/5]">
            <Image
              src={img.imageUrl}
              alt={img.altText}
              fill
              sizes="(max-width: 640px) 100vw, 33vw"
              // Next.js auto-optimizes/compresses (resizes, serves WebP/AVIF) —
              // the first few images load eagerly since they're above the fold.
              priority={i < 3}
              className="object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
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
