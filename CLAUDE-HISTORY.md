# Gursha Project — Update History

Log of every zip delivered by Claude, newest first. See `CLAUDE-RULES.md`
for the naming convention and PowerShell workflow.

---

### 2026-08-28 — `gursha-fix-render-build.zip`

Render's build failed: `error: unknown option '--turbopack'` on `next build`.
This project pins Next.js 15.1.0, and production-build Turbopack support
wasn't added until a later 15.x release — only `next dev --turbopack` works
at this version. Changed the `build` script to plain `next build` (left
`dev` untouched, since dev-mode Turbopack has long been supported).

---

### 2026-08-28 — `gursha-add-gitignore.zip`

Root cause found for the repeated push failures: the project never had a
`.gitignore`. `git add -A` had been silently committing `node_modules` (146MB+,
tripping GitHub's 100MB file limit) and, more seriously, the real `.env` file
containing live Neon credentials — into local commits. No push had actually
reached GitHub before this was caught (all prior pushes were rejected for
other reasons first), so no secrets were exposed. Added a proper `.gitignore`
and instructed wiping local git history entirely and starting a single clean
commit, since the poisoned history couldn't be pushed as-is regardless.

---

### 2026-08-27 — `gursha-fix-seed-idempotency.zip`

The first `db:seed` fix (`.onConflictDoNothing()` on settings only) wasn't
enough — re-running seed still hit a duplicate-key error on `users.email`,
since most other tables (menu items, wine list, press, gallery) have no
natural unique constraint to conflict on and would have silently duplicated
rows if the script had gotten past `users`. Replaced the narrow fix with an
early-exit guard at the top of `seed.ts`: if the admin user already exists,
the script logs a message and exits without touching any table. This makes
re-running `db:seed` always safe, full stop.

Also resolved a `git push` rejection on `fine-dining` (same "fetch first"
pattern as the earlier `casual-dining` incident — the GitHub repo had a
commit, most likely an auto-created README, that the local clone didn't).

---

### 2026-08-27 — `gursha-fix-seed-and-migrate.zip`

Fixed two scaffold bugs surfaced during the real Neon deploy:

- `db:migrate` failed (`Can't find meta/_journal.json`) — the `drizzle/`
  migration folder was never actually populated with generated migration
  files, going back to the original scaffold. Added a `db:push` script
  (`drizzle-kit push`) as the supported way to sync schema going forward;
  documented in `CLAUDE-RULES.md`.
- `db:seed` failed on the last step (`settings` table, duplicate key) because
  the insert wasn't idempotent. Added `.onConflictDoNothing()` so re-running
  seed is always safe. Everything else in the seed (tables, service periods,
  admin user, both menus, wine/tej list, press, gallery) had already
  succeeded and is live in Neon — no data was lost.

---

### 2026-08-23 — `gursha-deploy-fine-dining-repo.zip`

Corrected the project's home repo. The Gursha docs had accidentally been
pushed to `casual-dining` (a separate, unrelated app) in the previous step.
Cleaned that repo back to its original state (`git reset --hard` to the
pre-merge commit `8280ca3`, force-pushed) and pointed `CLAUDE-RULES.md`'s
`$RepoUrl` at the correct repo: `github.com/zementaye/fine-dining`. This zip
also carries the full Gursha app for the first push into that repo.

---

### 2026-08-23 — `gursha-add-repo-url.zip`

Docs-only update. Filled in the real repo (`github.com/zementaye/casual-dining`)
in `CLAUDE-RULES.md`'s PowerShell `$RepoUrl`, and added the standing rule that
every future delivery is zipped — even a single changed file — so the
unzip-and-push workflow stays identical regardless of update size.

---

### 2026-08-23 — `gursha-fine-dining.zip`
*(delivered before the naming convention below was adopted — future zips
follow the `gursha-<reason>.zip` pattern)*

Full guest-site + admin dashboard redesign, rebranding the scaffold from a
generic "Restaurant Name" fine-dining app into **Gursha**, a modern Ethiopian
restaurant in Shaw, Washington D.C.

- Loaded real Cormorant Garamond + Inter fonts via `next/font`; extended the
  Tailwind palette with a `berbere` red accent alongside the existing
  charcoal/bone/brass tokens
- Rewrote nav, footer, and homepage with Ethiopian branding and copy (the
  "gursha" hand-feeding tradition as the core idea)
- Rebuilt the menu page with a real tasting menu ("The Gursha Menu") and à la
  carte (doro wat, kitfo, tibs, shiro, etc.)
- Wired the Wine page to the `wineList` table with a house tej (honey wine)
  program; wired Press and Gallery pages to their DB tables (previously
  static stubs)
- Wrote chef bio (About) and updated Private Events copy/branding
- Restyled the reservation flow: step indicators, quick date chips, a live
  summary sidebar; underlying booking/deposit/cancel logic unchanged
- Rebranded the admin dashboard shell (dark sidebar, "Floor Office"); other
  admin pages inherited the new theme automatically via shared color tokens
- Updated `seed.ts` with Ethiopian menu/wine/press/gallery data, and email
  templates with Gursha branding
- Could not run `npm install` / `next build` in this environment (no network
  access) — bracket/JSX balance was hand-verified across all edited files,
  but a local build check is recommended before deploying
