"use client";

import { useState } from "react";
import Link from "next/link";

const NAV_LINKS = [
  { href: "/menu", label: "Menu" },
  { href: "/wine", label: "Wine & Tej" },
  { href: "/about", label: "Chef" },
  { href: "/gallery", label: "Gallery" },
  { href: "/private-events", label: "Private Events" },
  { href: "/press", label: "Press" },
];

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <div className="hidden sm:flex items-center justify-between px-5 sm:px-8 py-2 bg-charcoal text-bone/70 text-xs tracking-widest2 uppercase">
        <p>Dinner Tue–Sun, from 5:30pm · Shaw, Washington D.C.</p>
        <a href="tel:+12025550148" className="hover:text-bone transition-colors">
          (202) 555-0148
        </a>
      </div>

      <header className="flex items-center justify-between px-5 sm:px-8 py-5 sm:py-6 border-b border-charcoal/10">
        <Link href="/" className="font-display text-2xl sm:text-3xl tracking-wide leading-none" onClick={() => setMenuOpen(false)}>
          Gursha
          <span className="block font-body text-[10px] tracking-widest2 uppercase text-charcoal/50 mt-1">
            Ethiopian Table
          </span>
        </Link>

        <nav className="hidden md:flex gap-8">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="nav-link">{l.label}</Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/reservations"
            className="hidden sm:inline-block border border-charcoal px-5 py-2 text-sm tracking-widest2 uppercase hover:bg-charcoal hover:text-bone transition-colors"
          >
            Reserve
          </Link>

          {/* Mobile hamburger — only shown below md, where the nav above is hidden */}
          <button
            type="button"
            className="md:hidden flex flex-col justify-center gap-1.5 w-11 h-11 items-center"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className={`block h-px w-6 bg-charcoal transition-transform ${menuOpen ? "translate-y-[7px] rotate-45" : ""}`} />
            <span className={`block h-px w-6 bg-charcoal transition-opacity ${menuOpen ? "opacity-0" : ""}`} />
            <span className={`block h-px w-6 bg-charcoal transition-transform ${menuOpen ? "-translate-y-[7px] -rotate-45" : ""}`} />
          </button>
        </div>
      </header>

      {/* Mobile menu panel */}
      {menuOpen && (
        <div className="md:hidden border-b border-charcoal/10 bg-bone px-5 py-6 flex flex-col gap-1">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="py-3 text-base tracking-wide border-b border-charcoal/5 last:border-none"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/reservations"
            onClick={() => setMenuOpen(false)}
            className="mt-4 text-center bg-charcoal text-bone py-3 tracking-widest2 uppercase text-sm"
          >
            Reserve
          </Link>
          <a href="tel:+12025550148" className="mt-4 text-sm text-charcoal/60">
            (202) 555-0148
          </a>
        </div>
      )}

      <main className="flex-1">{children}</main>

      <footer className="px-5 sm:px-8 py-14 border-t border-charcoal/10 bg-charcoal text-bone/70">
        <div className="max-w-5xl mx-auto grid gap-10 sm:grid-cols-4 text-sm">
          <div>
            <p className="font-display text-2xl text-bone mb-3">Gursha</p>
            <p>1809 Ninth Street NW</p>
            <p>Shaw, Washington, D.C.</p>
            <a href="tel:+12025550148" className="block mt-2 hover:text-bone transition-colors">
              (202) 555-0148
            </a>
            <a href="mailto:hello@gursharestaurant.com" className="block hover:text-bone transition-colors">
              hello@gursharestaurant.com
            </a>
          </div>
          <div>
            <p className="eyebrow mb-3">Hours</p>
            <p>Tuesday – Sunday</p>
            <p>Dinner 5:30pm – 10:00pm</p>
            <p>Saturday &amp; Sunday Brunch 10am – 2pm</p>
            <p className="mt-2">Closed Mondays</p>
          </div>
          <div>
            <p className="eyebrow mb-3">Explore</p>
            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map((l) => (
                <Link key={l.href} href={l.href} className="hover:text-bone transition-colors w-fit">
                  {l.label}
                </Link>
              ))}
              <Link href="/reservations" className="hover:text-bone transition-colors w-fit">
                Reservations
              </Link>
            </nav>
          </div>
          <div>
            <p className="eyebrow mb-3">Follow</p>
            <p>Instagram · @gursha.dc</p>
            <p className="mt-2">Reservations required, walk-ins welcome at the bar.</p>
          </div>
        </div>
        <div className="max-w-5xl mx-auto mt-10 pt-6 border-t border-bone/10 flex flex-col sm:flex-row sm:justify-between gap-2 text-xs text-bone/40">
          <p className="italic">"Buna dabo naw" — coffee is our bread.</p>
          <p>&copy; {new Date().getFullYear()} Gursha. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
