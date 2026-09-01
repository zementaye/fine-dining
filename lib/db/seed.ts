import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./index";
import {
  restaurantTables,
  servicePeriods,
  users,
  menus,
  menuCourses,
  menuItems,
  wineList,
  pressMentions,
  galleryImages,
  settings,
} from "./schema";

async function main() {
  const alreadySeeded = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, "admin@gursharestaurant.com"),
  });
  if (alreadySeeded) {
    console.log("Already seeded (admin user exists) — skipping to avoid duplicate rows.");
    console.log("To re-seed from scratch, truncate the tables first, then re-run this script.");
    return;
  }

  console.log("Seeding restaurant_tables...");
  const tables = await db
    .insert(restaurantTables)
    .values([
      { label: "T1", zone: "Main Dining", minPartySize: 1, maxPartySize: 2, isCombinable: false },
      { label: "T2", zone: "Main Dining", minPartySize: 1, maxPartySize: 2, isCombinable: false },
      { label: "T3", zone: "Main Dining", minPartySize: 2, maxPartySize: 4, isCombinable: true },
      { label: "T4", zone: "Main Dining", minPartySize: 2, maxPartySize: 4, isCombinable: true },
      { label: "T5", zone: "Main Dining", minPartySize: 4, maxPartySize: 6, isCombinable: false },
      { label: "Patio 1", zone: "Patio", minPartySize: 2, maxPartySize: 4, isCombinable: false },
      { label: "Patio 2", zone: "Patio", minPartySize: 2, maxPartySize: 4, isCombinable: false },
      { label: "Chef's Table", zone: "Private Room", minPartySize: 2, maxPartySize: 8, isCombinable: false },
      { label: "Bar 1", zone: "Bar", minPartySize: 1, maxPartySize: 2, isCombinable: false },
    ])
    .returning();

  // Wire T3 <-> T4 as combinable neighbors for larger walk-up parties.
  const t3 = tables.find((t) => t.label === "T3")!;
  const t4 = tables.find((t) => t.label === "T4")!;
  await db.update(restaurantTables).set({ combinableWith: [t4.id] }).where(eq(restaurantTables.id, t3.id));
  await db.update(restaurantTables).set({ combinableWith: [t3.id] }).where(eq(restaurantTables.id, t4.id));

  console.log("Seeding service_periods...");
  // Dinner Tue-Sun (1-6), closed Monday (0... using 1=Mon convention: 0=Sun here per JS getUTCDay)
  const dinnerDays = [2, 3, 4, 5, 6, 0]; // Tue-Sun
  await db.insert(servicePeriods).values(
    dinnerDays.map((d) => ({
      name: "Dinner",
      dayOfWeek: d,
      startTime: "17:30:00",
      endTime: "22:00:00",
      slotIntervalMinutes: 15,
      seatingDurationMinutes: 90,
    }))
  );
  await db.insert(servicePeriods).values([
    {
      name: "Weekend Brunch",
      dayOfWeek: 0,
      startTime: "10:00:00",
      endTime: "14:00:00",
      slotIntervalMinutes: 15,
      seatingDurationMinutes: 75,
    },
    {
      name: "Weekend Brunch",
      dayOfWeek: 6,
      startTime: "10:00:00",
      endTime: "14:00:00",
      slotIntervalMinutes: 15,
      seatingDurationMinutes: 75,
    },
  ]);

  console.log("Seeding admin user...");
  const passwordHash = await bcrypt.hash("change-me-immediately", 10);
  await db.insert(users).values({
    name: "Admin",
    email: "admin@gursharestaurant.com",
    passwordHash,
    role: "admin",
  });

  console.log("Seeding a la carte menu...");
  const [alaCarte] = await db
    .insert(menus)
    .values({ name: "A La Carte", type: "a_la_carte", isActive: true })
    .returning();
  if (!alaCarte) throw new Error("Failed to insert A La Carte menu");

  await db.insert(menuItems).values([
    {
      menuId: alaCarte.id,
      category: "Starters",
      name: "Sambusa",
      description: "Crisp pastry, spiced lentils, green chile, tamarind dip",
      priceCents: 1400,
      allergens: ["gluten"],
      displayOrder: 1,
    },
    {
      menuId: alaCarte.id,
      category: "Starters",
      name: "Gomen",
      description: "Braised collard greens, garlic, ginger, niter kibbeh",
      priceCents: 1200,
      allergens: ["dairy"],
      displayOrder: 2,
    },
    {
      menuId: alaCarte.id,
      category: "Starters",
      name: "Azifa",
      description: "Green lentil salad, mustard, jalapeño, lime",
      priceCents: 1200,
      allergens: [],
      displayOrder: 3,
    },
    {
      menuId: alaCarte.id,
      category: "Mains",
      name: "Doro Wat",
      description: "Slow-braised chicken, berbere, hard egg, injera",
      priceCents: 3200,
      allergens: ["eggs"],
      displayOrder: 1,
    },
    {
      menuId: alaCarte.id,
      category: "Mains",
      name: "Kitfo",
      description: "Hand-minced beef, mitmita, niter kibbeh, ayib, served warm or raw",
      priceCents: 3600,
      allergens: ["dairy"],
      displayOrder: 2,
    },
    {
      menuId: alaCarte.id,
      category: "Mains",
      name: "Awaze Tibs",
      description: "Flame-seared lamb, rosemary, onion, awaze pepper paste",
      priceCents: 3800,
      allergens: [],
      displayOrder: 3,
    },
    {
      menuId: alaCarte.id,
      category: "Mains",
      name: "Beyaynetu",
      description: "Vegetarian sampler — misir wot, shiro, gomen, atkilt, injera",
      priceCents: 2600,
      allergens: [],
      displayOrder: 4,
    },
    {
      menuId: alaCarte.id,
      category: "Desserts",
      name: "Ethiopian Coffee Tiramisu",
      description: "Buna-soaked ladyfingers, mascarpone, cocoa",
      priceCents: 1400,
      allergens: ["dairy", "gluten", "eggs"],
      displayOrder: 1,
    },
    {
      menuId: alaCarte.id,
      category: "Desserts",
      name: "Tej-Poached Pear",
      description: "Honey wine, cardamom, toasted teff crumble",
      priceCents: 1300,
      allergens: ["gluten"],
      displayOrder: 2,
    },
  ]);

  console.log("Seeding Gursha tasting menu...");
  const [tasting] = await db
    .insert(menus)
    .values({ name: "The Gursha Menu", type: "tasting", isActive: true, priceCents: 14500 })
    .returning();
  if (!tasting) throw new Error("Failed to insert The Gursha Menu");

  const courseDefs = [
    { number: 1, name: "Buna & Bread" },
    { number: 2, name: "Awaze Tibs" },
    { number: 3, name: "Doro Wat" },
    { number: 4, name: "Beyaynetu" },
    { number: 5, name: "Kitfo" },
    { number: 6, name: "Coffee Ceremony" },
  ];
  const courses = await db
    .insert(menuCourses)
    .values(courseDefs.map((c) => ({ menuId: tasting.id, courseNumber: c.number, name: c.name })))
    .returning();

  await db.insert(menuItems).values([
    {
      menuId: tasting.id,
      courseId: courses.find((c) => c.name === "Buna & Bread")!.id,
      name: "Himbasha & Whipped Kibbeh Butter",
      description: "House-baked spiced honey bread, cardamom, niter kibbeh butter",
    },
    {
      menuId: tasting.id,
      courseId: courses.find((c) => c.name === "Awaze Tibs")!.id,
      name: "Awaze Lamb Tibs",
      description: "Flame-seared lamb, rosemary, awaze pepper paste, fresh injera",
      winePairingNote: "House Tej, dry",
    },
    {
      menuId: tasting.id,
      courseId: courses.find((c) => c.name === "Doro Wat")!.id,
      name: "Doro Wat",
      description: "Chicken slow-braised in berbere, hard egg, forty days of onions",
      winePairingNote: "Malbec, Mendoza",
    },
    {
      menuId: tasting.id,
      courseId: courses.find((c) => c.name === "Beyaynetu")!.id,
      name: "Beyaynetu Sampler",
      description: "Misir wot, shiro, gomen, atkilt, timatim — the vegetarian tray",
    },
    {
      menuId: tasting.id,
      courseId: courses.find((c) => c.name === "Kitfo")!.id,
      name: "Kitfo",
      description: "Hand-minced beef, mitmita, ayib, niter kibbeh",
      winePairingNote: "Amber wine, Georgia",
    },
    {
      menuId: tasting.id,
      courseId: courses.find((c) => c.name === "Coffee Ceremony")!.id,
      name: "Buna Ceremony & Dabo Kolo",
      description: "Beans roasted tableside, jebena-brewed, spiced shortbread",
    },
  ]);

  console.log("Seeding wine & tej list...");
  await db.insert(wineList).values([
    { category: "Tej — House Honey Wine", name: "Traditional Tej", region: "House-brewed, gesho & wildflower honey", priceGlassCents: 1400, priceBottleCents: 5200 },
    { category: "Tej — House Honey Wine", name: "Orange Blossom Tej", region: "House-brewed, dry style", priceGlassCents: 1600, priceBottleCents: 5800 },
    { category: "By the Glass", name: "Txakoli", vintage: "2023", region: "Basque Country, Spain", priceGlassCents: 1500 },
    { category: "By the Glass", name: "Beaujolais Villages", vintage: "2022", region: "Beaujolais, France", priceGlassCents: 1600 },
    { category: "Red", name: "Malbec, Zuccardi", vintage: "2021", region: "Mendoza, Argentina", priceBottleCents: 6800 },
    { category: "Red", name: "Amber Wine, Pheasant's Tears", vintage: "2020", region: "Kakheti, Georgia", priceBottleCents: 7200 },
    { category: "White", name: "Assyrtiko, Gaia", vintage: "2022", region: "Santorini, Greece", priceBottleCents: 6200 },
    { category: "Sparkling", name: "Cremant de Loire, Langlois", region: "Loire Valley, France", priceBottleCents: 6800 },
  ]);

  console.log("Seeding press mentions...");
  await db.insert(pressMentions).values([
    { outlet: "Washington City Paper", headline: "The Best New Ethiopian Restaurant Is Reinventing the Feast", displayOrder: 1 },
    { outlet: "Eater DC", headline: "Gursha Brings Live-Fire Ethiopian Cooking to Shaw", displayOrder: 2 },
    { outlet: "The Washingtonian", headline: "Where to Eat Right Now: Gursha", displayOrder: 3 },
  ]);

  console.log("Seeding gallery...");
  await db.insert(galleryImages).values([
    { imageUrl: "https://placehold.co/900x1125/1b1917/eadfc7?text=The+Dining+Room", altText: "The Gursha dining room", caption: "The Dining Room", displayOrder: 1 },
    { imageUrl: "https://placehold.co/900x1125/1b1917/eadfc7?text=Doro+Wat", altText: "Doro Wat plated on injera", caption: "Doro Wat", displayOrder: 2 },
    { imageUrl: "https://placehold.co/900x1125/1b1917/eadfc7?text=Coffee+Ceremony", altText: "Tableside coffee ceremony", caption: "Coffee Ceremony", displayOrder: 3 },
    { imageUrl: "https://placehold.co/900x1125/1b1917/eadfc7?text=Kitfo", altText: "Kitfo course", caption: "Kitfo", displayOrder: 4 },
    { imageUrl: "https://placehold.co/900x1125/1b1917/eadfc7?text=The+Bar", altText: "The tej bar", caption: "The Tej Bar", displayOrder: 5 },
    { imageUrl: "https://placehold.co/900x1125/1b1917/eadfc7?text=Chef's+Table", altText: "The Chef's Table private room", caption: "Chef's Table", displayOrder: 6 },
  ]);

  console.log("Seeding default settings...");
  await db
    .insert(settings)
    .values([
      { key: "deposit_threshold_party_size", value: 8 },
      { key: "deposit_per_guest_cents", value: 5000 },
      { key: "cancellation_window_hours", value: 24 },
      { key: "overbooking_buffer_percent", value: 0 },
      { key: "waitlist_offer_expiry_minutes", value: 15 },
      { key: "no_show_deposit_threshold", value: 2 },
    ])
    .onConflictDoNothing({ target: settings.key });

  console.log("Seed complete. Admin login: admin@gursharestaurant.com / change-me-immediately");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
