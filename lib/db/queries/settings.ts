import { eq } from "drizzle-orm";
import { db } from "../index";
import { settings } from "../schema";

const DEFAULTS: Record<string, unknown> = {
  deposit_threshold_party_size: 8,
  deposit_per_guest_cents: 5000,
  cancellation_window_hours: 24,
  overbooking_buffer_percent: 0, // off by default; host-assisted bookings only, per spec
  waitlist_offer_expiry_minutes: 15,
  no_show_deposit_threshold: 2, // guests with >= this many no-shows require a deposit regardless of party size
};

export async function getSetting(key: string): Promise<unknown> {
  const row = await db.query.settings.findFirst({ where: eq(settings.key, key) });
  if (row) return row.value;
  return DEFAULTS[key];
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db
    .insert(settings)
    .values({ key, value: value as any })
    .onConflictDoUpdate({ target: settings.key, set: { value: value as any } });
}
