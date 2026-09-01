import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bone px-5 sm:px-8 text-center">
      <div className="max-w-md">
        <p className="divider-mark mb-6 text-xs uppercase tracking-widest2">Gursha</p>
        <p className="font-display text-7xl mb-4">404</p>
        <h1 className="font-display text-2xl mb-4">This table isn't set.</h1>
        <p className="text-charcoal/60 mb-10">
          The page you're looking for doesn't exist, or may have moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="btn-outline">
            Back to Home
          </Link>
          <Link
            href="/reservations"
            className="bg-charcoal text-bone px-6 py-3 text-sm tracking-widest2 uppercase hover:bg-berbere transition-colors"
          >
            Reserve a Table
          </Link>
        </div>
      </div>
    </div>
  );
}
