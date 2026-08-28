export default async function AboutPage() {
  return (
    <div>
      <section className="max-w-3xl mx-auto px-8 py-20">
        <p className="divider-mark mb-4 text-xs uppercase tracking-widest2">Gursha</p>
        <h1 className="font-display text-4xl text-center mb-10">The Chef</h1>

        <div className="space-y-6 text-charcoal/80 leading-relaxed">
          <p>
            Chef Selam Tesfaye grew up in Addis Ababa in a kitchen run by her
            grandmother, where Sunday lunch meant a shared tray, a dozen hands,
            and a pot of Doro Wat that had been simmering since dawn. She trained
            in professional kitchens in Rome and New York before returning to
            the food she was raised on — and opened Gursha in 2019 to cook it
            without compromise.
          </p>
          <p>
            The kitchen mills its own berbere and mitmita weekly, ferments teff
            for injera on a three-day cycle, and sources meat and produce from
            growers within a day's drive of Washington, D.C. Nothing on the menu
            is simplified for an unfamiliar palate — the goal is the real thing,
            served the way it's served at home: family-style, on one tray, meant
            to be eaten with your hands.
          </p>
          <p>
            "Gursha isn't really about the food," Chef Tesfaye says. "It's about
            the moment you reach across the table and feed the person next to
            you. Everything we cook is in service of that moment."
          </p>
        </div>
      </section>

      <section className="bg-charcoal text-bone px-8 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl mb-6">Sourcing &amp; Craft</h2>
          <div className="grid sm:grid-cols-3 gap-10 text-sm text-bone/70 leading-relaxed mt-10">
            <div>
              <p className="font-display text-xl text-bone mb-2">Spice</p>
              <p>Berbere and mitmita milled in-house every week from whole, toasted chiles.</p>
            </div>
            <div>
              <p className="font-display text-xl text-bone mb-2">Grain</p>
              <p>Teff fermented three days for injera, baked to order on a traditional mitad.</p>
            </div>
            <div>
              <p className="font-display text-xl text-bone mb-2">Coffee</p>
              <p>Green beans roasted tableside for the closing coffee ceremony, jebena-brewed.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
