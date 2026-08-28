import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { dbPool } from "../lib/db/pool";
import { restaurantTables, servicePeriods, reservations } from "../lib/db/schema";
import { createReservation, NoAvailabilityError } from "../lib/booking-engine";

// This suite talks to a real Postgres database (a Neon `dev` branch is ideal —
// see "Deploy in This Order" step 1). It's skipped automatically if no DB is
// configured so `vitest run` still passes in environments without one, but it
// MUST be run (with a real DB) before shipping — this is the test the spec
// calls "non-negotiable."
const hasDb = !!process.env.DATABASE_URL_UNPOOLED;
const d = hasDb ? describe : describe.skip;

d("booking engine concurrency (integration)", () => {
  let tableId: string;
  const testDate = "2099-06-15"; // far-future date so it never collides with real data
  const testTime = "19:00:00";

  beforeAll(async () => {
    const [table] = await dbPool
      .insert(restaurantTables)
      .values({
        label: "TEST-CONCURRENCY",
        zone: "Main Dining",
        minPartySize: 1,
        maxPartySize: 4,
        isCombinable: false,
        isActive: true,
      })
      .returning();
    tableId = table.id;
  });

  afterAll(async () => {
    await dbPool.delete(reservations).where(eq(reservations.tableId, tableId));
    await dbPool.delete(restaurantTables).where(eq(restaurantTables.id, tableId));
  });

  beforeEach(async () => {
    await dbPool.delete(reservations).where(eq(reservations.tableId, tableId));
  });

  it("never lets two simultaneous requests double-book the same table + overlapping time", async () => {
    const attempt = () =>
      createReservation({
        guestName: "Concurrency Test",
        guestEmail: "test@example.com",
        partySize: 2,
        reservationDate: testDate,
        reservationTime: testTime,
        durationMinutes: 90,
        preferredTableId: tableId,
      }).then(
        (r) => ({ ok: true as const, r }),
        (e) => ({ ok: false as const, e })
      );

    // Fire genuinely concurrently.
    const [a, b] = await Promise.all([attempt(), attempt()]);

    const successes = [a, b].filter((x) => x.ok);
    const failures = [a, b].filter((x) => !x.ok);

    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);
    expect((failures[0] as any).e).toBeInstanceOf(NoAvailabilityError);

    // Confirm the DB actually only has one row for that table/time.
    const rows = await dbPool.query.reservations.findMany({
      where: eq(reservations.tableId, tableId),
    });
    expect(rows.length).toBe(1);
  });

  it("allows a second reservation on the same table once the first is outside the window", async () => {
    const first = await createReservation({
      guestName: "Guest A",
      guestEmail: "a@example.com",
      partySize: 2,
      reservationDate: testDate,
      reservationTime: "18:00:00",
      durationMinutes: 90, // 18:00-19:30
      preferredTableId: tableId,
    });
    expect(first.status).toBe("confirmed");

    const second = await createReservation({
      guestName: "Guest B",
      guestEmail: "b@example.com",
      partySize: 2,
      reservationDate: testDate,
      reservationTime: "19:30:00", // starts exactly when the first ends
      durationMinutes: 90,
      preferredTableId: tableId,
    });
    expect(second.status).toBe("confirmed");
  });

  it("rejects a booking that requires a deposit as pending, not confirmed", async () => {
    const [bigTable] = await dbPool
      .insert(restaurantTables)
      .values({
        label: "TEST-BIG",
        zone: "Private Room",
        minPartySize: 1,
        maxPartySize: 12,
        isCombinable: false,
        isActive: true,
      })
      .returning();

    try {
      const res = await createReservation({
        guestName: "Big Party",
        guestEmail: "big@example.com",
        partySize: 10, // above the default deposit threshold of 8
        reservationDate: testDate,
        reservationTime: "20:00:00",
        durationMinutes: 90,
        preferredTableId: bigTable.id,
      });
      expect(res.status).toBe("pending");
      expect(res.depositRequiredCents).toBeGreaterThan(0);
    } finally {
      await dbPool.delete(reservations).where(eq(reservations.tableId, bigTable.id));
      await dbPool.delete(restaurantTables).where(eq(restaurantTables.id, bigTable.id));
    }
  });

  it("idempotency key: two concurrent requests with the same key produce exactly one reservation", async () => {
    const key = `test-idempotency-${Date.now()}`;
    const attempt = () =>
      createReservation({
        guestName: "Double Click Guest",
        guestEmail: "doubleclick@example.com",
        partySize: 2,
        reservationDate: testDate,
        reservationTime: testTime,
        durationMinutes: 90,
        preferredTableId: tableId,
        idempotencyKey: key,
      });

    const [a, b] = await Promise.all([attempt(), attempt()]);

    // Both calls succeed (no error) — the second is a replay of the first, not a conflict.
    expect(a.reservationId).toBe(b.reservationId);
    expect(a.confirmationCode).toBe(b.confirmationCode);
    expect([a.wasIdempotentReplay, b.wasIdempotentReplay].filter(Boolean).length).toBe(1);

    const rows = await dbPool.query.reservations.findMany({
      where: eq(reservations.tableId, tableId),
    });
    expect(rows.length).toBe(1);
  });

  it("a repeat call after the first has fully committed also returns the same reservation", async () => {
    const key = `test-idempotency-sequential-${Date.now()}`;
    const first = await createReservation({
      guestName: "Sequential Guest",
      guestEmail: "sequential@example.com",
      partySize: 2,
      reservationDate: testDate,
      reservationTime: testTime,
      durationMinutes: 90,
      preferredTableId: tableId,
      idempotencyKey: key,
    });

    const second = await createReservation({
      guestName: "Sequential Guest",
      guestEmail: "sequential@example.com",
      partySize: 2,
      reservationDate: testDate,
      reservationTime: testTime,
      durationMinutes: 90,
      preferredTableId: tableId,
      idempotencyKey: key,
    });

    expect(second.reservationId).toBe(first.reservationId);
    expect(second.wasIdempotentReplay).toBe(true);
  });

  it("escalates a small party to a deposit once the guest has enough no-shows", async () => {
    const guestEmail = `noshow-${Date.now()}@example.com`;

    // Simulate 2 prior no-shows directly (bypassing the booking engine — these
    // just need to exist as historical rows, not go through availability checks).
    await dbPool.insert(reservations).values([
      {
        confirmationCode: "NOSHOW1",
        guestName: "Repeat No-Show",
        guestEmail,
        partySize: 2,
        reservationDate: "2099-01-01",
        reservationTime: "18:00:00",
        durationMinutes: 90,
        status: "no_show",
      },
      {
        confirmationCode: "NOSHOW2",
        guestName: "Repeat No-Show",
        guestEmail,
        partySize: 2,
        reservationDate: "2099-01-08",
        reservationTime: "18:00:00",
        durationMinutes: 90,
        status: "no_show",
      },
    ]);

    try {
      const res = await createReservation({
        guestName: "Repeat No-Show",
        guestEmail,
        partySize: 2, // well under the normal deposit threshold of 8
        reservationDate: testDate,
        reservationTime: testTime,
        durationMinutes: 90,
        preferredTableId: tableId,
      });
      expect(res.status).toBe("pending");
      expect(res.depositRequiredCents).toBeGreaterThan(0);
    } finally {
      await dbPool.delete(reservations).where(eq(reservations.guestEmail, guestEmail));
    }
  });
});
