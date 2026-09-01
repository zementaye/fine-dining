/**
 * Booking engine — the core of the system.
 *
 * Every write that touches (table_id + reservation_date + reservation_time) goes
 * through `createReservation` or `reassignTable` below. Nothing else is allowed to
 * INSERT/UPDATE a reservation's table assignment. That's the whole ballgame for
 * preventing double-bookings.
 *
 * Strategy: Postgres SERIALIZABLE transactions, not manual locking.
 *   - Each attempt opens a transaction at ISOLATION LEVEL SERIALIZABLE.
 *   - Inside it: read existing reservations for the candidate table(s) on that date
 *     that overlap the requested [start, start+duration) window, and if none, insert.
 *   - If two concurrent transactions race for the same table+window, Postgres detects
 *     the read/write conflict at COMMIT time and aborts one with SQLSTATE 40001
 *     ("could not serialize access due to concurrent update"). We catch that,
 *     back off briefly, and retry the whole transaction (including the availability
 *     re-check) from scratch — never just retry the insert.
 *
 * This is check-then-insert made atomic by the database, not by application-level
 * locking, which is what the spec calls for ("SELECT...FOR UPDATE row locking" is
 * the alternative it names — we use SERIALIZABLE instead because the availability
 * check spans multiple candidate tables and a time-range overlap, which is awkward
 * to express as a single row lock; SERIALIZABLE gives the same atomicity guarantee
 * with simpler code).
 */

import { and, eq } from "drizzle-orm";
import { dbPool } from "./db/pool";
import { reservations, restaurantTables } from "./db/schema";
import { customAlphabet } from "nanoid";
import { getSetting } from "./db/queries/settings";

const nanoid = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6); // no ambiguous chars

const MAX_SERIALIZATION_RETRIES = 5;
const RETRY_BASE_DELAY_MS = 40;

export class NoAvailabilityError extends Error {
  constructor() {
    super("No table is available for that party size and time.");
    this.name = "NoAvailabilityError";
  }
}

function isSerializationFailure(err: unknown): boolean {
  // Neon/postgres driver surfaces the Postgres error code on `.code`
  return !!err && typeof err === "object" && (err as any).code === "40001";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type TimeWindow = { start: string; durationMinutes: number };

/** Inclusive-exclusive overlap of two [start, start+duration) windows expressed as "HH:MM:SS". */
export function windowsOverlap(a: TimeWindow, b: TimeWindow): boolean {
  const toMin = (t: string) => {
    const [h = 0, m = 0] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const aStart = toMin(a.start);
  const aEnd = aStart + a.durationMinutes;
  const bStart = toMin(b.start);
  const bEnd = bStart + b.durationMinutes;
  return aStart < bEnd && bStart < aEnd;
}

const ACTIVE_STATUSES = ["pending", "confirmed", "seated"] as const;

export type CreateReservationInput = {
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  partySize: number;
  reservationDate: string; // YYYY-MM-DD
  reservationTime: string; // HH:MM:SS
  durationMinutes: number;
  occasion?: string;
  dietaryNotes?: string;
  seatingPreference?: string;
  mobilityNotes?: string;
  userId?: string;
  source?: "website" | "phone" | "walk_in";
  internalNotes?: string;
  /** Client-generated key; a repeat call with the same key returns the original reservation instead of creating a duplicate. */
  idempotencyKey?: string;
  /** Host-assisted bookings may opt into the configured overbooking buffer; public flow never does. */
  allowOverbookingBuffer?: boolean;
  /** Optional explicit table pick (host manual assignment); still re-validated for conflicts. */
  preferredTableId?: string;
};

export type CreateReservationResult = {
  reservationId: string;
  confirmationCode: string;
  tableId: string | null;
  status: "pending" | "confirmed";
  depositRequiredCents: number;
  /** True if this call returned a pre-existing reservation matched by idempotencyKey, not a new one. */
  wasIdempotentReplay?: boolean;
};

/**
 * Find tables whose capacity fits partySize (or table-combinations, for larger parties)
 * and that have no ACTIVE-status overlapping reservation in the requested window.
 * Must be called from inside the serializable transaction to be race-safe.
 */
async function findFreeTableId(
  tx: typeof dbPool,
  args: { date: string; time: string; durationMinutes: number; partySize: number }
): Promise<string | null> {
  const candidateTables = await tx.query.restaurantTables.findMany({
    where: and(eq(restaurantTables.isActive, true)),
  });

  // Single tables that fit on their own, largest-fit-first isn't required but is a
  // reasonable default so small parties don't eat a big table unnecessarily.
  const singleFits = candidateTables
    .filter((t) => args.partySize >= t.minPartySize && args.partySize <= t.maxPartySize)
    .sort((a, b) => a.maxPartySize - b.maxPartySize);

  for (const table of singleFits) {
    const conflict = await hasConflict(tx, table.id, args);
    if (!conflict) return table.id;
  }

  // Combinable pairs for parties too large for any single table.
  const combinable = candidateTables.filter((t) => t.isCombinable && t.combinableWith.length > 0);
  for (const table of combinable) {
    for (const partnerId of table.combinableWith) {
      const partner = candidateTables.find((t) => t.id === partnerId);
      if (!partner) continue;
      const combinedMax = table.maxPartySize + partner.maxPartySize;
      if (args.partySize > combinedMax) continue;
      const [c1, c2] = await Promise.all([
        hasConflict(tx, table.id, args),
        hasConflict(tx, partner.id, args),
      ]);
      if (!c1 && !c2) return table.id; // primary table id represents the combined seating
    }
  }

  return null;
}

async function hasConflict(
  tx: typeof dbPool,
  tableId: string,
  args: { date: string; time: string; durationMinutes: number }
): Promise<boolean> {
  const existing = await tx.query.reservations.findMany({
    where: and(eq(reservations.tableId, tableId), eq(reservations.reservationDate, args.date)),
    columns: { reservationTime: true, durationMinutes: true, status: true },
  });
  const requested = { start: args.time, durationMinutes: args.durationMinutes };
  return existing.some(
    (r) =>
      (ACTIVE_STATUSES as readonly string[]).includes(r.status) &&
      windowsOverlap({ start: r.reservationTime, durationMinutes: r.durationMinutes }, requested)
  );
}

export async function createReservation(
  input: CreateReservationInput
): Promise<CreateReservationResult> {
  // Idempotency check happens outside the transaction, before any locking work —
  // cheap early exit for the common "guest double-clicked" case. A second check
  // happens inside the transaction too (see below), to close the race where two
  // requests with the same key arrive genuinely concurrently.
  if (input.idempotencyKey) {
    const existing = await findByIdempotencyKey(dbPool, input.idempotencyKey);
    if (existing) return { ...toResult(existing), wasIdempotentReplay: true };
  }

  const depositThresholdPartySize = Number(
    (await getSetting("deposit_threshold_party_size")) ?? 8
  );
  const depositPerGuestCents = Number((await getSetting("deposit_per_guest_cents")) ?? 5000);
  const noShowDepositThreshold = Number((await getSetting("no_show_deposit_threshold")) ?? 2);

  let depositRequiredCents =
    input.partySize >= depositThresholdPartySize ? input.partySize * depositPerGuestCents : 0;

  // Guests with a history of no-shows lose the "no deposit for small parties"
  // default — this is the enforcement half of the no-show tracking the guest
  // profile already displays. Escalates even a party-of-2 to a deposit once
  // they've crossed the threshold, rather than just showing a stat nobody acts on.
  if (depositRequiredCents === 0) {
    const noShowCount = await countNoShows(dbPool, input.guestEmail);
    if (noShowCount >= noShowDepositThreshold) {
      depositRequiredCents = depositPerGuestCents; // flat one-guest deposit, not scaled by party size
    }
  }

  const result = await withSerializableRetryTx(async (tx) => {
    // Re-check inside the transaction: closes the race where two identical
    // requests (same idempotency key) reach the DB genuinely concurrently.
    if (input.idempotencyKey) {
      const existing = await findByIdempotencyKey(tx, input.idempotencyKey);
      if (existing) return { ...toResult(existing), wasIdempotentReplay: true };
    }

    let tableId: string | null = null;

    if (input.preferredTableId) {
      const conflict = await hasConflict(tx, input.preferredTableId, {
        date: input.reservationDate,
        time: input.reservationTime,
        durationMinutes: input.durationMinutes,
      });
      if (conflict) throw new NoAvailabilityError();
      tableId = input.preferredTableId;
    } else {
      tableId = await findFreeTableId(tx, {
        date: input.reservationDate,
        time: input.reservationTime,
        durationMinutes: input.durationMinutes,
        partySize: input.partySize,
      });
      if (!tableId && !input.allowOverbookingBuffer) {
        throw new NoAvailabilityError();
      }
      // allowOverbookingBuffer (host-assisted only): permits tableId to remain null,
      // i.e. an unassigned-but-accepted booking the host will manually seat later.
    }

    const confirmationCode = nanoid();
    const status = depositRequiredCents > 0 ? "pending" : "confirmed";

    const [row] = await tx
      .insert(reservations)
      .values({
        confirmationCode,
        idempotencyKey: input.idempotencyKey,
        userId: input.userId,
        guestName: input.guestName,
        guestEmail: input.guestEmail,
        guestPhone: input.guestPhone,
        partySize: input.partySize,
        reservationDate: input.reservationDate,
        reservationTime: input.reservationTime,
        durationMinutes: input.durationMinutes,
        tableId,
        status,
        occasion: input.occasion,
        dietaryNotes: input.dietaryNotes,
        seatingPreference: input.seatingPreference,
        mobilityNotes: input.mobilityNotes,
        depositRequiredCents,
        internalNotes: input.internalNotes,
        source: input.source ?? "website",
      })
      .returning();

    if (!row) throw new Error("Failed to create reservation");

    return { ...toResult(row), wasIdempotentReplay: false };
  });

  return result;
}

function toResult(row: typeof reservations.$inferSelect): CreateReservationResult {
  return {
    reservationId: row.id,
    confirmationCode: row.confirmationCode,
    tableId: row.tableId,
    status: row.status as "pending" | "confirmed",
    depositRequiredCents: row.depositRequiredCents,
  };
}

async function findByIdempotencyKey(tx: typeof dbPool, key: string) {
  return tx.query.reservations.findFirst({ where: eq(reservations.idempotencyKey, key) });
}

/** Count of this guest's past no-show reservations, by email. Used to escalate the deposit requirement. */
async function countNoShows(tx: typeof dbPool, guestEmail: string): Promise<number> {
  const rows = await tx.query.reservations.findMany({
    where: and(eq(reservations.guestEmail, guestEmail), eq(reservations.status, "no_show")),
    columns: { id: true },
  });
  return rows.length;
}

/** Host reassigns/seats a table for an existing (possibly unassigned) reservation. Same conflict check, no bypass. */
export async function reassignTable(reservationId: string, newTableId: string): Promise<void> {
  await withSerializableRetryTx(async (tx) => {
    const existing = await tx.query.reservations.findFirst({
      where: eq(reservations.id, reservationId),
    });
    if (!existing) throw new Error("Reservation not found");

    const conflict = await hasConflict(tx, newTableId, {
      date: existing.reservationDate,
      time: existing.reservationTime,
      durationMinutes: existing.durationMinutes,
    });
    if (conflict) throw new NoAvailabilityError();

    await tx
      .update(reservations)
      .set({ tableId: newTableId, updatedAt: new Date() })
      .where(eq(reservations.id, reservationId));
  });
}

/**
 * Real transaction wrapper used by the functions above. (Split from `withSerializableRetry`
 * so the callback gets the live `tx` handle rather than a detached `dbPool` reference.)
 */
async function withSerializableRetryTx<T>(
  fn: (tx: Parameters<Parameters<typeof dbPool.transaction>[0]>[0]) => Promise<T>
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < MAX_SERIALIZATION_RETRIES; attempt++) {
    try {
      return await dbPool.transaction(async (tx) => fn(tx), {
        isolationLevel: "serializable",
      });
    } catch (err) {
      lastErr = err;
      if (isSerializationFailure(err)) {
        await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt + Math.random() * 20);
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

/**
 * Availability search for the public API: for a given date + party size, return the
 * bookable time slots (derived from service_periods' slot_interval_minutes) along with
 * whether at least one table is free at each slot. Read-only — does not need the
 * serializable transaction, a plain snapshot read is fine since it's advisory only;
 * the actual booking attempt re-checks for real inside createReservation.
 */
export async function getAvailableSlots(args: {
  date: string;
  partySize: number;
  dayOfWeek: number;
}): Promise<{ time: string; durationMinutes: number; servicePeriodName: string }[]> {
  const { db } = await import("./db");
  const { servicePeriods } = await import("./db/schema");

  const periods = await db.query.servicePeriods.findMany({
    where: eq(servicePeriods.dayOfWeek, args.dayOfWeek),
  });

  const allTables = await db.query.restaurantTables.findMany({
    where: eq(restaurantTables.isActive, true),
  });
  const maxCapacity = Math.max(
    0,
    ...allTables.map((t) => t.maxPartySize),
    ...allTables
      .filter((t) => t.isCombinable)
      .map((t) => t.maxPartySize + Math.max(0, ...allTables.map((x) => x.maxPartySize)))
  );
  if (args.partySize > maxCapacity) return [];

  const existingReservations = await db.query.reservations.findMany({
    where: eq(reservations.reservationDate, args.date),
    columns: { tableId: true, reservationTime: true, durationMinutes: true, status: true },
  });

  const slots: { time: string; durationMinutes: number; servicePeriodName: string }[] = [];

  for (const period of periods) {
    const [startH = 0, startM = 0] = period.startTime.split(":").map(Number);
    const [endH = 0, endM = 0] = period.endTime.split(":").map(Number);
    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;

    for (let t = startMin; t + period.seatingDurationMinutes <= endMin; t += period.slotIntervalMinutes) {
      const hh = String(Math.floor(t / 60)).padStart(2, "0");
      const mm = String(t % 60).padStart(2, "0");
      const timeStr = `${hh}:${mm}:00`;
      const requested = { start: timeStr, durationMinutes: period.seatingDurationMinutes };

      const someTableFree = allTables
        .filter((tbl) => args.partySize >= tbl.minPartySize && args.partySize <= tbl.maxPartySize)
        .some((tbl) => {
          const conflicts = existingReservations.filter(
            (r) =>
              r.tableId === tbl.id &&
              (ACTIVE_STATUSES as readonly string[]).includes(r.status) &&
              windowsOverlap(
                { start: r.reservationTime, durationMinutes: r.durationMinutes },
                requested
              )
          );
          return conflicts.length === 0;
        });

      if (someTableFree) {
        slots.push({
          time: timeStr,
          durationMinutes: period.seatingDurationMinutes,
          servicePeriodName: period.name,
        });
      }
    }
  }

  return slots;
}
