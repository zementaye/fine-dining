import Link from "next/link";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="hidden sm:flex items-center justify-between px-8 py-2 bg-charcoal text-bone/70 text-xs tracking-widest2 uppercase">
        <p>Dinner Tue–Sun, from 5:30pm · Shaw, Washington D.C.</p>
        <p>(202) 555-0148</p>
      </div>
      <header className="flex items-center justify-between px-8 py-6 border-b border-charcoal/10">
        <Link href="/" className="font-display text-3xl tracking-wide leading-none">
          Gursha
          <span className="block font-body text-[10px] tracking-widest2 uppercase text-charcoal/50 mt-1">
            Ethiopian Table
          </span>
        </Link>
        <nav className="hidden md:flex gap-8">
          <Link href="/menu" className="nav-link">Menu</Link>
          <Link href="/wine" className="nav-link">Wine &amp; Tej</Link>
          <Link href="/about" className="nav-link">Chef</Link>
          <Link href="/gallery" className="nav-link">Gallery</Link>
          <Link href="/private-events" className="nav-link">Private Events</Link>
          <Link href="/press" className="nav-link">Press</Link>
        </nav>
        <Link
          href="/reservations"
          className="border border-charcoal px-5 py-2 text-sm tracking-widest2 uppercase hover:bg-charcoal hover:text-bone transition-colors"
        >
          Reserve
        </Link>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="px-8 py-14 border-t border-charcoal/10 bg-charcoal text-bone/70">
        <div className="max-w-5xl mx-auto grid gap-10 sm:grid-cols-3 text-sm">
          <div>
            <p className="font-display text-2xl text-bone mb-3">Gursha</p>
            <p>1809 Ninth Street NW</p>
            <p>Shaw, Washington, D.C.</p>
            <p className="mt-2">(202) 555-0148</p>
            <p>hello@gursharestaurant.com</p>
          </div>
          <div>
            <p className="eyebrow mb-3">Hours</p>
            <p>Tuesday – Sunday</p>
            <p>Dinner 5:30pm – 10:00pm</p>
            <p>Saturday &amp; Sunday Brunch 10am – 2pm</p>
            <p className="mt-2">Closed Mondays</p>
          </div>
          <div>
            <p className="eyebrow mb-3">Follow</p>
            <p>Instagram · @gursha.dc</p>
            <p>Reservations required, walk-ins welcome at the bar.</p>
          </div>
        </div>
        <p className="max-w-5xl mx-auto mt-10 pt-6 border-t border-bone/10 text-xs text-bone/40 italic">
          "Buna dabo naw" — coffee is our bread.
        </p>
      </footer>
    </div>
  );
}
