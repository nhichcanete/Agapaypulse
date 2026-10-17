# AgapayPulse

AgapayPulse is a school-project demonstration of a barangay health-center workflow: resident registration, queue pre-registration and arrival confirmation, medicine reservation/pickup, inventory, audit history, and role-specific workspaces.

> **Demonstration only.** This project is not intended for real clinical use. Do not enter real patient information or rely on it for diagnosis, treatment, pharmacy dispensing, or operational decisions.

The check-in demonstration calculates NEWS2 Scale 1 from the six required adult observations (respiratory rate, oxygen saturation, systolic pressure, pulse, consciousness/new confusion, and temperature), adding 2 points when supplemental oxygen is used. The aggregate bands and single-observation score-3 escalation follow the Royal College of Physicians' published NEWS2 chart. Diastolic pressure is not part of NEWS2; separately, systolic pressure of 180 mmHg or higher or diastolic pressure of 120 mmHg or higher raises the suggested queue priority to High for prompt in-person recheck. This follows the NICE definition of severe hypertension and does not by itself diagnose an emergency. The application is a school demo, not a validated clinical system or a remote triage service.

NEWS2 is designed for adult acute-care settings. This demo blocks known patients under 16 and pregnancy, uses Scale 1 only, and requires an applicability confirmation; it does not implement pediatric, pregnancy-specific, or prescribed oxygen Scale 2 pathways. A calculated score cannot replace in-person assessment or clinical judgement.

Sources:

- Royal College of Physicians, [National Early Warning Score (NEWS) 2](https://www.rcp.ac.uk/resources/national-early-warning-score-news-2/) — parameters, oxygen adjustment, scoring chart, and intended acute-care use.
- NICE, [Hypertension in adults: diagnosis and management](https://www.nice.org.uk/guidance/ng136/chapter/recommendations) — defines severe hypertension as clinic systolic pressure of 180 mmHg or higher or diastolic pressure of 120 mmHg or higher.
- Kostakis et al., [The performance of NEWS and NEWS2 in hospitalised patients with SARS-CoV-2](https://doi.org/10.1016/j.resuscitation.2020.10.039), *Resuscitation* 159 (2021), 150–157 — example of population-specific validation research; it does not validate this application for clinical use.

## Resident visit history

Staff finalize the visit note from the desk workflow; finalizing records a completion timestamp and completes the queue ticket in one transaction. Called patients remain assigned to their desk across sign-outs, refreshes, and date changes; they are not automatically changed to no-show due to elapsed time. Staff must finalize the visit or explicitly mark the ticket no-show before calling another patient at that desk. Residents can then open **Visit History** to see their own completed visit summary, assessment summary, and care plan. The staff-only objective section is not included in the resident response. Any structured medication orders appear separately from the narrative SOAP plan.

Medication order records in this school demo are not valid prescriptions or dispensing authorization. They should only be entered when separately authorized by a responsible prescriber. The history endpoint filters to the authenticated resident's patient record and finalized notes on completed visits.

## Resident directory

Staff, administrators, and pharmacists can open **Resident Directory** to browse registered resident accounts, search by resident name or today's queue ticket, and filter by verified or age-based priority, age group, today's queue status, and triage severity. The directory is paginated and only returns the minimum operational profile data needed for the view; email, phone number, PhilHealth number, address, and clinical notes are not included. Resident accounts remain listed even when they have no queue ticket today. Current queue details are limited to today's ticket.

Residents can submit a priority ID image from **Profile & Settings**. The image is stored on Laravel's private local disk and can only be viewed through the administrator-only **Priority ID Review** page/API. Approval verifies the resident's ID-based priority; rejection requires a note and allows resubmission. Residents cannot verify their own status by editing profile fields. Senior priority is assigned automatically from the resident's recorded date of birth. Queue urgency is separate and is calculated from submitted vital readings.

## Project structure

- `agapaypulse-frontend/` — React, Vite, Tailwind, and QR camera/scanner UI.
- `agapaypulse-api/` — Laravel 12 JSON API, Sanctum bearer-token auth, migrations, seeders, and feature tests.

## Run locally

Requirements: PHP 8.2+, Composer, Node.js 20.19+ (or 22.12+), npm, and MySQL.

1. Create/configure `agapaypulse-api/.env` from `.env.example`, set local MySQL credentials, then run:

   ```powershell
   cd agapaypulse-api
   composer install
   php artisan key:generate
   php artisan migrate
   php artisan db:seed
   php artisan serve
   ```

2. In another terminal, install/run the frontend:

   ```powershell
   cd agapaypulse-frontend
   Copy-Item .env.example .env
   npm ci
   npm run dev
   ```

   Open `http://localhost:5173`. The frontend uses the API at `http://localhost:8000/api` in local development.

## Demo accounts

All seeded accounts use the school-demo password `hello123`:

| Role | Email |
|---|---|
| Admin | `admin@agapaypulse.gov.ph` |
| Staff | `staff@agapaypulse.gov.ph` |
| Pharmacist | `pharmacist@agapaypulse.gov.ph` |
| Resident | `resident@gmail.com` |
| Resident | `ana@gmail.com` |

The database seeder updates/creates its sample records and sets these demo passwords. Only use it with a disposable demonstration database; do not seed a production or real-data database.

## Test and production build

```powershell
cd agapaypulse-api
php artisan test
```

```powershell
cd agapaypulse-frontend
npm run lint
npm run build
```

The frontend build output is `agapaypulse-frontend/dist`.

## School-project deployment

A simple deployment is a static frontend plus a PHP/Laravel API and MySQL database. Vercel can host the frontend using `agapaypulse-frontend/` as the project root; `vercel.json` provides SPA route fallback for direct links and QR deep links. Host the API on a PHP/Laravel-compatible service and use a managed MySQL database. The frontend and API may be on separate HTTPS origins.

### Frontend settings

- Set `VITE_API_BASE_URL` in the frontend host to the full deployed API URL ending in `/api`, e.g. `https://your-api.example/api`.
- Build command: `npm ci && npm run build`.
- Output directory: `dist`.
- Set this variable before every deployment build; Vite embeds it in the generated static files.

### API settings

Configure the API host's environment variables (do not commit `.env`):

- `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL=https://your-api.example`
- `APP_KEY` generated once with `php artisan key:generate --show`; keep it private and stable.
- `DB_CONNECTION=mysql` and the managed database host, port, database, username, and password.
- `CORS_ALLOWED_ORIGINS=https://your-frontend.example` (use the exact frontend origin, with no `/api` suffix).
- Ensure PHP 8.2+ and required Laravel extensions are enabled, and point the web document root to Laravel's `public/` directory.

Deploy migrations with `php artisan migrate --force`. Do not run `php artisan db:seed` on a persistent hosted database unless you deliberately want the demo data/passwords restored. Verify `/up`, sign-in, one workflow per role, audit events, and frontend deep links after deployment.

Priority ID images must remain on private, persistent storage. The default Laravel local disk stores these files under `storage/app/private`; never expose this directory through a public symlink. If the API host has an ephemeral filesystem, configure a private persistent volume or private object-storage disk and ensure it is backed up and access-controlled before accepting uploads.

For QR camera use, serve the frontend over HTTPS and allow camera permission in the browser. The entrance QR contains a daily signed code: staff display it in the queue console, the resident scans it inside the signed-in app, and then confirms arrival. A stable `APP_KEY` is required so the daily code can be validated.

Medicine pickup passes are scanned at the pharmacy to create or reopen one active Stream B ticket. Pharmacists call the next pickup from **Express Pickup Queue** and confirm release only when that ticket is being served. Checked-in pickups remain queued even if the original 24-hour pass window elapses; unqueued passes expire and release their reserved stock. The release updates inventory, completes the queue ticket, and records the scan, queue entry, call, and outcome in the admin Activity Log.

For a typical Laravel API deployment, install production dependencies with `composer install --no-dev --optimize-autoloader`, run migrations, then run `php artisan optimize`. Ensure `storage/` and `bootstrap/cache/` are writable by the PHP process. Do not expose Laravel's project root as the web document root; expose only `public/`.

## Suggested school presentation walkthrough

1. Sign in as a resident; register/check in to a queue and show the arrival confirmation.
2. Open **Medicine availability**, reserve an item, then show its pickup pass in **Claim Codes**.
3. Sign in as staff; display the entrance QR and show the desk/arrival workflow.
4. Sign in as pharmacist; scan/check in a pickup pass, open **Express Pickup Queue**, call the Stream B ticket, and confirm medicine release from the called pickup.
5. Sign in as admin; filter the Activity Log for the reservation to see pass scans, queue entry/call, any no-show, and the completed release with stock adjustment details.

## Current project limitations

- Demo passwords and sample people are intentionally included for school presentation convenience. Replace them before exposing the demo publicly.
- Role features model representative workflows, not every real-life clinical or administrative duty.
- External services such as SMS/email delivery, production backups, and a managed job worker are not configured.
