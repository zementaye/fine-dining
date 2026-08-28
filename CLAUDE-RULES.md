# Gursha Project — Working Rules

These are the standing rules for how Claude delivers updates on this project
and how the person applies them locally. Keep this file and
`CLAUDE-HISTORY.md` together; update both whenever a new zip is delivered.

---

## 1. PowerShell workflow (unzip → install → configure → push)

Edit the `CONFIG` block at the top each time before running.

```powershell
# ========================================================
# GURSHA PROJECT — Unzip → Install → Configure → Push
# Edit the CONFIG block each time you get a new zip from Claude.
# ========================================================

# ---- CONFIG (edit every time) ----
$ZipPath     = "$HOME\Downloads\<zip-name>.zip"             # path to the zip Claude just gave you
$ProjectRoot = "$HOME\Projects"                              # where all your projects live
$FolderName  = "fine-dining"                                  # top-level folder inside the zip
$RepoUrl     = "https://github.com/zementaye/fine-dining.git"    # Gursha's actual repo — NOT casual-dining
$CommitMsg   = "<describe this update>"                          # describe THIS update

# ---- 1. Unzip (overwrites the folder if it already exists) ----
New-Item -ItemType Directory -Force -Path $ProjectRoot | Out-Null
Expand-Archive -Path $ZipPath -DestinationPath $ProjectRoot -Force
$Dest = Join-Path $ProjectRoot $FolderName
Set-Location $Dest

# ---- 2. Install dependencies ----
npm install

# ---- 3. Environment file (first time only — fill in real secrets after) ----
if (!(Test-Path ".env") -and (Test-Path ".env.example")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env — fill in DATABASE_URL, STRIPE keys, RESEND_API_KEY, etc. before running." -ForegroundColor Yellow
}

# ---- 4. Database (only if DATABASE_URL is set in .env) ----
# npm run db:migrate
# npm run db:seed

# ---- 5. Run locally to sanity-check before pushing ----
# npm run dev
# then visit http://localhost:3000

# ---- 6. Git init (first time only) ----
if (!(Test-Path ".git")) {
    git init
    git branch -M main
    git remote add origin $RepoUrl
}

# ---- 7. Commit & push ----
git add -A
git commit -m $CommitMsg
git push -u origin main
```

---

## 2. Zip naming convention

Every zip Claude delivers must follow:

```
<project>-<update-reason>.zip
```

- `<project>` — stays constant (e.g. `gursha`)
- `<update-reason>` — short, specific to that update (e.g. `initial-rebrand`,
  `fix-reservation-flow`, `add-admin-nav`)
- **No two zips in this project ever share the same filename.** If the reason
  repeats (e.g. two rounds of nav fixes), append `-2`, `-3`, etc.

Examples:
- `gursha-initial-rebrand.zip`
- `gursha-fix-reservation-flow.zip`
- `gursha-add-admin-nav-2.zip`

## 3. Always zip, even for one file

Every update Claude delivers — whether it's the whole project or a single
changed file — is packaged as a zip. Never a bare file. This keeps the
unzip → push PowerShell workflow identical every time, regardless of how
small the change was.

Repo: https://github.com/zementaye/fine-dining

**Never push Gursha files to `github.com/zementaye/casual-dining`** — that's
a separate, unrelated app (waitlist/to-go orders/host board/analytics). The
two projects were briefly and accidentally merged in that repo on 2026-08-23;
see the history log below for the cleanup.

## 4. Database: use `db:push`, not `db:migrate`

This project's `drizzle/` migration folder was never populated with real
migration files (a scaffold gap from day one) — `db:migrate` will fail with
"Can't find meta/_journal.json". Use this instead whenever the schema
changes:

```powershell
npm run db:push
```

This syncs `lib/db/schema.ts` straight to whatever's in `DATABASE_URL_UNPOOLED`
— safe to re-run any time, it only applies what's actually changed.

## 6. `.gitignore` is non-negotiable

This scaffold shipped without a `.gitignore`, which let `node_modules` and a
real `.env` (with live secrets) get committed locally before anyone noticed.
A `.gitignore` excluding at minimum `node_modules`, `.next`, and `.env*` must
exist and be committed *before* the first `git add -A` on any fresh checkout.

## 7. History logging

Every time Claude delivers a zip, it must add an entry to
`CLAUDE-HISTORY.md` in the same turn, with: date, zip filename, and a short
description of what changed and why. No delivered zip should go unlogged.
