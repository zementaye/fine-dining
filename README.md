# Fine Dining Reservations — Build Status

This is a working scaffold built in the order the spec asked for: schema → booking
engine (with concurrency tests) → API routes → frontend → admin → deploy config.
It is **not** `npm install`-tested end-to-end (this environment has no network access
to npm/Neon/Stripe), so treat this as a strong, code-complete starting point that
needs one real install + migrate + smoke-test pass before it's production-live — not
as something already verified running.

## Hardening pass (idempotency, no-show enforcement, audit log, rate limiting)

On top of the original build, added:

- **Idempotency keys on reservation creation** — the guest-facing confirm form
  generates a UUID once per form mount and sends it with every submit attempt
  (including retries after a network error or a double-click). The booking
  engine checks for an existing reservation with that key both before and
  *inside* the serializable transaction, so a genuinely concurrent double
  submit — not just a sequential retry — still produces exactly one
  reservation. See `createReservation`'s `idempotencyKey` handling in
  `lib/booking-engine.ts` and the two new tests in
  `tests/booking-engine.concurrency.test.ts`.
- **No-show deposit escalation** — the guest profile already displayed a
  no-show count; it now does something with it. A guest with
  `no_show_deposit_threshold` (default 2) or more no-shows requires a flat
  one-guest deposit on their next booking regardless of party size, closing
  the gap between "we track this" and "we act on this."
- **Idempotent Stripe webhook handling** — Stripe explicitly does not
  guarantee exactly-once delivery. `processed_webhook_events` records each
  event id before acting on it (unique constraint does the real work), plus a
  belt-and-suspenders status check so a replayed `payment_intent.succeeded`
  can never re-send a confirmation email or double-process a deposit.
- **Admin activity log** — every status change, table reassignment,
  cancellation, and menu edit made by staff is now recorded (`lib/audit.ts`,
  `admin_activity_log` table) and viewable at `/admin/activity`. Fire-and-
  forget by design — a logging failure never blocks the actual action.
- **Rate limiting on public write endpoints** — `/api/reservations`,
  `/api/waitlist`, `/api/private-events`, and `/api/account/register` are now
  IP-rate-limited via a small Postgres-backed fixed-window limiter
  (`lib/rate-limit.ts`) rather than sitting wide open. No new infrastructure
  dependency (no Redis) — swap in Upstash if you outgrow this. Also fixed a
  latent bug while in there: registration used to let a duplicate email throw
  an unhandled DB error instead of a clean 400.

## Assumptions made (spec didn't pin these down)

- **Overlap semantics**: back-to-back bookings (one ends exactly when the next
  starts) are treated as non-conflicting — `[start, start+duration)` half-open
  intervals.
- **Table combination**: modeled as pairwise (`combinable_with` on each table);
  the booking engine checks direct pairs, not arbitrary N-table chains. Fine for
  most floor plans; extend `findFreeTableId` if you need 3+ table joins.
- **Deposit rule**: "large party or prepaid tasting event" → implemented the
  party-size threshold (configurable in `settings`, default 8 guests,
  $50/guest). The "prepaid tasting event" trigger (deposit tied to a specific
  menu rather than party size) isn't wired up — it's a one-line addition once
  you decide which menus require it.
- **Auth**: Credentials provider (email/password) for both guests and staff,
  since the spec didn't specify OAuth vs. magic links vs. password.
- **Waitlist claim flow**: fully implemented, including the token→entry
  resolver (`GET /api/waitlist/by-token/[token]`) and a claim page that shows
  the actual offered date/time/table. One deliberate design choice: staff
  pick a *specific* bookable time when they send the offer (added an
  `offered_time` column) rather than the guest picking from within their
  original fuzzy `requested_time_range` — simpler and avoids double-checking
  availability twice.
- **Stripe Elements UI**: `DepositForm` now mounts a real `<Elements>` +
  `<PaymentElement>` and calls `stripe.confirmPayment()`. The reservation
  itself still only flips to `confirmed` via the webhook (never client-side),
  and a small polling banner on the manage-reservation page smooths over the
  few seconds of lag between the redirect back and the webhook landing.

## Deploy in this order (per spec §"Deploy in This Order")

1. `neon projects create` (or console) → `main` + `dev` branches. Put URLs in `.env`.
2. `npm install`
3. `npm run db:generate && npm run db:migrate`
4. `npm run db:seed` (creates tables, service periods, admin user
   `admin@yourrestaurant.com` / `change-me-immediately` — **rotate this immediately**,
   a starter à la carte menu, and default settings)
5. `npm run test` — run the Vitest suite. The concurrency test in
   `tests/booking-engine.concurrency.test.ts` needs `DATABASE_URL_UNPOOLED` set to
   a real Postgres (a Neon `dev` branch is perfect) — it's skipped otherwise.
   **Do not ship without running this against a real database.**
6. Configure Stripe test mode + webhook endpoint (`/api/webhooks/stripe`), Resend
   API key + verified sending domain, Twilio (optional). Set
   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (client-side) alongside `STRIPE_SECRET_KEY`.
7. `vercel deploy`, connect Neon `main`, set all env vars from `.env.example`.
8. Vercel Cron is pre-configured in `vercel.json` (hourly reminders, 15-min
   waitlist expiry) — no manual setup needed once deployed.

## Status against "Before You Say You're Done"

- [x] **Two simultaneous reservation attempts for the same table/overlapping
      time never both succeed** — implemented via Postgres SERIALIZABLE
      transactions with retry-on-40001 (`lib/booking-engine.ts`), and covered by
      an integration test that fires genuinely concurrent requests
      (`tests/booking-engine.concurrency.test.ts`). **Caveat: I could not run
      this test in this environment (no DB/network access) — run it yourself
      against a real Postgres before trusting it.**
- [x] Guest can complete a full reservation flow including deposit — booking,
      deposit branching, and the Stripe `<PaymentElement>` checkout UI (with
      `confirmPayment()` + redirect handling) are all implemented end-to-end.
      Status still only flips to `confirmed` via the webhook, never client-side.
- [x] Host can view/manage the floor map, assign tables, advance statuses — all
      three are implemented (`/admin/floor`, drag-and-click assignment, status
      quick-actions in `/admin/reservations`), all routed through the same
      conflict-checked `reassignTable`.
- [x] Reminder emails/SMS at 24h/2h — hourly cron implemented with
      `reminded24h`/`reminded2h` tracking to avoid duplicate sends.
- [x] Dietary notes/allergens visible to staff at every relevant admin
      screen — surfaced on the dashboard, reservation list, floor map cards,
      and guest profile (flagged at the top, not buried).
- [x] Cancellation window enforced server-side — checked in
      `DELETE /api/reservations/[id]`, not just hidden in the UI; staff can
      always override.
- [x] Guest profile aggregates visit history and no-show count — implemented
      in `/admin/guests/[userId]`.
- [x] All money handling uses integer cents through Stripe, never stored
      raw — `depositRequiredCents`/`depositPaidCents` throughout, Stripe
      PaymentIntents own the actual card data.
- [x] Waitlist offer → claim → booking is a complete loop, including the
      token resolver page and a specific bookable time captured at offer time.
- [x] Menu items are fully CRUD-able per menu version, not just listed
      (`/admin/menus/[id]`).

## What's genuinely incomplete (being direct about it)

- **Not installed or run.** No `npm install`, `next build`, or `drizzle-kit
  generate` has been executed — this environment has no network access. There
  will almost certainly be small type errors or import fixes needed on first
  build (e.g. Drizzle's `neon-serverless` transaction typing can be finicky,
  and the new `@stripe/react-stripe-js` import should be double-checked
  against whatever Next/React versions you actually install). Budget a
  focused hour for first-boot debugging.
- **Marketing pages** (about/press/gallery/wine) are minimal placeholders that
  compile and are wired to real tables where relevant, but don't have the full
  bespoke art direction the brand brief calls for — that's a design/content
  pass, not a logic gap.
- **Wine list CMS** still shows data only (no add/edit form yet) — same
  pattern as the now-finished menu-item editor, just not built out. Copy
  `MenuItemEditor`'s shape if you need it before launch.
- **Playwright** has one happy-path spec (`tests/e2e/reservation-flow.spec.ts`)
  covering the core booking flow, not full coverage of admin flows, the
  deposit/Stripe checkout, or edge cases (cancellation window, waitlist claim).
- **Overbooking buffer** setting exists and is respected by the booking engine
  (host-assisted only, off by default) but there's no admin UI toggle for it
  yet — it's a `settings` row you'd set via `setSetting()` or a quick admin
  form.
- **Table combination** is still pairwise only (see Assumptions above).
- **Rate limit bucket cleanup** — `rate_limit_buckets` rows aren't pruned
  automatically. Add a daily cron (`DELETE WHERE window_start < now() -
  interval '1 day'`) once this is live; harmless but wasteful to skip
  indefinitely.
- **Sentry/error monitoring** — failures still just `console.error`.
  Straightforward to add, not done here.

## Files worth reading first

1. `lib/db/schema.ts` — every table from the spec.
2. `lib/booking-engine.ts` — the hard part; read the top comment first.
3. `tests/booking-engine.concurrency.test.ts` — proof of the double-booking guarantee.
4. `app/api/reservations/route.ts` and `app/api/admin/floor/assign/route.ts` — the
   two entry points that touch table assignment, both routed through the engine.
