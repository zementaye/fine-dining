import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  date,
  time,
  timestamp,
  pgEnum,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ---------- Enums ----------
export const reservationStatusEnum = pgEnum("reservation_status", [
  "pending",
  "confirmed",
  "seated",
  "completed",
  "cancelled",
  "no_show",
]);

export const reservationSourceEnum = pgEnum("reservation_source", [
  "website",
  "phone",
  "walk_in",
]);

export const waitlistStatusEnum = pgEnum("waitlist_status", [
  "waiting",
  "offered",
  "booked",
  "expired",
]);

export const userRoleEnum = pgEnum("user_role", ["guest", "host", "admin"]);

export const menuTypeEnum = pgEnum("menu_type", ["a_la_carte", "tasting"]);

export const inquiryStatusEnum = pgEnum("inquiry_status", [
  "new",
  "contacted",
  "booked",
  "declined",
]);

// ---------- 3.1 restaurant_tables ----------
export const restaurantTables = pgTable("restaurant_tables", {
  id: uuid("id").primaryKey().defaultRandom(),
  label: text("label").notNull(), // "T12", "Chef's Table", "Patio 3"
  zone: text("zone").notNull(), // "Main Dining" | "Patio" | "Private Room" | "Bar"
  minPartySize: integer("min_party_size").notNull(),
  maxPartySize: integer("max_party_size").notNull(),
  isCombinable: boolean("is_combinable").notNull().default(false),
  // ids of adjacent tables this one can be combined with
  combinableWith: uuid("combinable_with").array().notNull().default(sql`'{}'::uuid[]`),
  isActive: boolean("is_active").notNull().default(true),
});

// ---------- 3.2 service_periods ----------
export const servicePeriods = pgTable("service_periods", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(), // "Lunch", "Dinner", "Weekend Brunch"
  dayOfWeek: integer("day_of_week").notNull(), // 0-6 (0 = Sunday)
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  slotIntervalMinutes: integer("slot_interval_minutes").notNull().default(15),
  seatingDurationMinutes: integer("seating_duration_minutes").notNull().default(90),
});

// ---------- 3.5 users (guest + staff accounts) ----------
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  passwordHash: text("password_hash"),
  role: userRoleEnum("role").notNull().default("guest"),
  vipNotes: text("vip_notes"), // admin-visible only
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  emailIdx: uniqueIndex("users_email_idx").on(t.email),
}));

// ---------- 3.3 reservations (the heart of the system) ----------
export const reservations = pgTable("reservations", {
  id: uuid("id").primaryKey().defaultRandom(),
  confirmationCode: text("confirmation_code").notNull(),
  // Client-generated key (one per booking attempt in the browser) so a double
  // click or a retried request never creates two reservations. Nullable because
  // staff-entered phone/walk-in bookings don't go through the same client flow.
  idempotencyKey: text("idempotency_key"),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  guestName: text("guest_name").notNull(),
  guestEmail: text("guest_email").notNull(),
  guestPhone: text("guest_phone"),
  partySize: integer("party_size").notNull(),
  reservationDate: date("reservation_date").notNull(),
  reservationTime: time("reservation_time").notNull(),
  durationMinutes: integer("duration_minutes").notNull(), // copied from service_periods at booking time
  tableId: uuid("table_id").references(() => restaurantTables.id, { onDelete: "set null" }),
  status: reservationStatusEnum("status").notNull().default("pending"),
  occasion: text("occasion"),
  dietaryNotes: text("dietary_notes"), // visible to kitchen — safety-critical, never hide behind admin-only UI
  seatingPreference: text("seating_preference"),
  mobilityNotes: text("mobility_notes"), // accessibility: wheelchair access etc., host prepares seating in advance
  depositRequiredCents: integer("deposit_required_cents").notNull().default(0),
  depositPaidCents: integer("deposit_paid_cents").notNull().default(0),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  internalNotes: text("internal_notes"), // staff-only
  source: reservationSourceEnum("source").notNull().default("website"),
  // reminder tracking for the hourly cron
  reminded24h: boolean("reminded_24h").notNull().default(false),
  reminded2h: boolean("reminded_2h").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  confirmationCodeIdx: uniqueIndex("reservations_confirmation_code_idx").on(t.confirmationCode),
  // Partial-unique-in-spirit: enforced in application code (see booking-engine)
  // rather than a DB constraint, since idempotencyKey is nullable and Postgres
  // unique indexes on nullable columns allow multiple NULLs anyway (which is
  // what we want — only non-null keys need to collide-check).
  idempotencyKeyIdx: index("reservations_idempotency_key_idx").on(t.idempotencyKey),
  // The index the booking engine's overlap check leans on: one table, one date, ordered by time.
  tableDateTimeIdx: index("reservations_table_date_time_idx").on(
    t.tableId,
    t.reservationDate,
    t.reservationTime
  ),
  guestEmailIdx: index("reservations_guest_email_idx").on(t.guestEmail),
}));

// ---------- 3.4 waitlist ----------
export const waitlist = pgTable("waitlist", {
  id: uuid("id").primaryKey().defaultRandom(),
  guestName: text("guest_name").notNull(),
  guestEmail: text("guest_email").notNull(),
  guestPhone: text("guest_phone"),
  partySize: integer("party_size").notNull(),
  requestedDate: date("requested_date").notNull(),
  requestedTimeRange: text("requested_time_range").notNull(), // "6:30-8:00pm"
  status: waitlistStatusEnum("status").notNull().default("waiting"),
  // set when an "offer" goes out; the claim link is valid until this expires (~15 min)
  offerExpiresAt: timestamp("offer_expires_at", { withTimezone: true }),
  offeredTableId: uuid("offered_table_id").references(() => restaurantTables.id, {
    onDelete: "set null",
  }),
  offeredTime: time("offered_time"), // the specific bookable slot offered, set alongside offeredTableId
  claimToken: text("claim_token"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- 3.6 menus ----------
export const menus = pgTable("menus", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(), // "Autumn Tasting Menu", "A la Carte"
  type: menuTypeEnum("type").notNull(),
  isActive: boolean("is_active").notNull().default(false), // only one active per type shown publicly
  validFrom: date("valid_from"),
  validUntil: date("valid_until"),
  priceCents: integer("price_cents"), // fixed tasting menu price
});

// ---------- 3.7 menu_courses ----------
export const menuCourses = pgTable("menu_courses", {
  id: uuid("id").primaryKey().defaultRandom(),
  menuId: uuid("menu_id").notNull().references(() => menus.id, { onDelete: "cascade" }),
  courseNumber: integer("course_number").notNull(),
  name: text("name").notNull(),
});

// ---------- 3.8 menu_items ----------
export const menuItems = pgTable("menu_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  menuId: uuid("menu_id").references(() => menus.id, { onDelete: "cascade" }),
  courseId: uuid("course_id").references(() => menuCourses.id, { onDelete: "cascade" }),
  category: text("category"), // "Starters", "Mains", "Desserts"
  name: text("name").notNull(),
  description: text("description").notNull(),
  priceCents: integer("price_cents"), // null for tasting-menu inclusions
  allergens: text("allergens").array().notNull().default(sql`'{}'::text[]`),
  winePairingNote: text("wine_pairing_note"),
  displayOrder: integer("display_order").notNull().default(0),
});

// ---------- 3.9 wine_list ----------
export const wineList = pgTable("wine_list", {
  id: uuid("id").primaryKey().defaultRandom(),
  category: text("category").notNull(), // "Champagne", "Red - Burgundy", "By the Glass"
  name: text("name").notNull(),
  vintage: text("vintage"),
  region: text("region").notNull(),
  priceGlassCents: integer("price_glass_cents"),
  priceBottleCents: integer("price_bottle_cents"),
});

// ---------- 3.10 private_event_inquiries ----------
export const privateEventInquiries = pgTable("private_event_inquiries", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone"),
  eventType: text("event_type").notNull(), // "Chef's Table", "Full Buyout", "Corporate"
  preferredDate: date("preferred_date").notNull(),
  partySize: integer("party_size").notNull(),
  message: text("message"),
  status: inquiryStatusEnum("status").notNull().default("new"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- 3.11 light CMS tables ----------
export const pressMentions = pgTable("press_mentions", {
  id: uuid("id").primaryKey().defaultRandom(),
  outlet: text("outlet").notNull(),
  headline: text("headline").notNull(),
  url: text("url"),
  logoUrl: text("logo_url"),
  publishedDate: date("published_date"),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

export const galleryImages = pgTable("gallery_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  imageUrl: text("image_url").notNull(),
  altText: text("alt_text").notNull(),
  caption: text("caption"),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

// ---------- settings (single-row config table for admin-tunable values) ----------
// Referenced throughout §7 (deposit thresholds, cancellation window, overbooking buffer).
export const settings = pgTable("settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull(),
  value: jsonb("value").notNull(),
}, (t) => ({
  keyIdx: uniqueIndex("settings_key_idx").on(t.key),
}));

// ---------- processed_webhook_events ----------
// Stripe (and any future webhook source) can and will redeliver events — the
// same payment_intent.succeeded can arrive twice. Recording the event id here
// before acting on it makes webhook handling idempotent: a replay is detected
// and skipped rather than double-processing (e.g. double-sending a
// confirmation email, or worse, double-crediting a deposit).
export const processedWebhookEvents = pgTable("processed_webhook_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  source: text("source").notNull(), // "stripe"
  eventId: text("event_id").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  sourceEventIdx: uniqueIndex("processed_webhook_events_source_event_idx").on(t.source, t.eventId),
}));

// ---------- admin_activity_log ----------
// Audit trail for staff actions that change guest-facing state (status changes,
// table reassignment, cancellations). Not user-facing; read via /admin/activity.
export const adminActivityLog = pgTable("admin_activity_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  actorName: text("actor_name").notNull(), // denormalized snapshot in case the user is later deleted
  action: text("action").notNull(), // "status_change" | "table_reassign" | "cancel" | "menu_edit" | ...
  targetType: text("target_type").notNull(), // "reservation" | "menu_item" | "waitlist" | ...
  targetId: uuid("target_id").notNull(),
  detail: jsonb("detail"), // free-form: { from: "pending", to: "confirmed" } etc.
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  targetIdx: index("admin_activity_log_target_idx").on(t.targetType, t.targetId),
  createdAtIdx: index("admin_activity_log_created_at_idx").on(t.createdAt),
}));

// ---------- rate_limit_buckets ----------
// Backs lib/rate-limit.ts. One row per (key, fixed time window) — e.g.
// key = "reservations:1.2.3.4", windowStart = the current minute, truncated.
// Old rows aren't cleaned up automatically here; add a cron or a periodic
// `DELETE WHERE window_start < now() - interval '1 day'` once this is live.
export const rateLimitBuckets = pgTable("rate_limit_buckets", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  count: integer("count").notNull().default(0),
}, (t) => ({
  keyWindowIdx: uniqueIndex("rate_limit_buckets_key_window_idx").on(t.key, t.windowStart),
}));

// ---------- relations ----------
export const reservationsRelations = relations(reservations, ({ one }) => ({
  table: one(restaurantTables, {
    fields: [reservations.tableId],
    references: [restaurantTables.id],
  }),
  user: one(users, { fields: [reservations.userId], references: [users.id] }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  reservations: many(reservations),
}));

export const menusRelations = relations(menus, ({ many }) => ({
  courses: many(menuCourses),
  items: many(menuItems),
}));

export const menuCoursesRelations = relations(menuCourses, ({ one, many }) => ({
  menu: one(menus, { fields: [menuCourses.menuId], references: [menus.id] }),
  items: many(menuItems),
}));

export const waitlistRelations = relations(waitlist, ({ one }) => ({
  offeredTable: one(restaurantTables, {
    fields: [waitlist.offeredTableId],
    references: [restaurantTables.id],
  }),
}));
