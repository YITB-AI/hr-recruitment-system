# HR Recruitment & Employee Documentation System

Enterprise HR recruitment/ATS + employee documentation platform. Next.js (App Router) + TypeScript + MongoDB/Mongoose, styled with Tailwind v4 and shadcn/ui.

Current state: app shell (sidebar, topbar, command palette), Dashboard, and a minimal Applicants list + Applicant Details page (with the Quick Actions "Send" flow) are built and wired to a real MongoDB Atlas database. Auth is mocked pending a dedicated Auth step. The full module roadmap (Jobs, Interviews, Employees, Documents, etc.) is built incrementally, one module at a time.

## Prerequisites

- **Node.js 20+** (this project was built and tested on Node 26). `npm` ships with Node — no separate install needed.
- A **MongoDB Atlas** cluster (or any MongoDB 6+ instance) and its connection string.
- Windows/macOS/Linux — no OS-specific requirements beyond Node itself.

> **Windows + nvm4w users:** if `npm`/`npx` fail with `EPERM: operation not permitted, lstat 'C:\Users\Administrator\AppData'`, your machine's `nvm4w` install has `NVM_HOME` pointing at another user's profile your account can't read. Workaround: use a Node install that isn't behind that symlink (e.g. `C:\Program Files\nodejs` if present) by prepending it to `PATH` for your session:
> ```powershell
> $env:PATH = "C:\Program Files\nodejs;" + $env:PATH
> ```
> Long-term fix is correcting the machine's `NVM_HOME` environment variable (requires admin) — out of scope for this project.

## Setup from scratch

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env.local
# then edit .env.local — see "Database configuration" below

# 3. Seed demo data (safe — see note below)
npm run seed

# 4. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it redirects to `/dashboard`.

## Database configuration

1. In MongoDB Atlas, get your cluster's connection string (Atlas UI → Connect → Drivers).
2. Set it in `.env.local` as `MONGODB_URI`, with the **database name inserted into the path** (Atlas's copy-paste string omits it):

   ```env
   MONGODB_URI="mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<db-name>?retryWrites=true&w=majority&appName=Cluster0"
   ```

   This project currently points at database **`hr_master_db`**.

3. No further setup needed — `server/db/connect.ts` connects lazily on first use (via Mongoose) and caches the connection across hot reloads in dev.

### Important: the `jobs` collection is owned by your n8n pipeline

`hr_master_db` already has an existing, actively-written `jobs` collection coming from your n8n workflows (custom `job_id` strings, flat `city`/`state`/`country`/`zip` fields, string-typed `status`/`type`, and `createdAt`/`updatedAt` stored as ISO **strings**, not native dates). The app's `Job` Mongoose model (`models/Job.ts`) was built to match that real shape exactly — it **reads** from `jobs` but nothing in this codebase deletes or bulk-writes to it.

`npm run seed` is safe to run repeatedly: it never touches `jobs`. It only resets and repopulates the collections the app itself owns (`users`, `applicants`, `interviews`, `activity_logs`), and it errors out loudly if no job documents exist yet (since seeded applicants need a real `jobId` to reference).

If you ever need an isolated sandbox instead of the shared `hr_master_db`, point `MONGODB_URI` at a different database name on the same cluster (e.g. `hr_master_db_dev`) — Atlas creates it on first write, no manual provisioning needed.

### n8n Cloud webhooks (Applicant "Send" actions)

The Applicant Details page's Quick Actions panel has two buttons that call out to n8n: **Send Email** and **Send SMS**. Each posts to its own Next.js API route, which forwards a small JSON payload (applicant name/email/phone, job title, status) to your n8n Cloud webhook and relays whatever n8n returns back to the UI.

Set these in `.env.local`:

```env
N8N_WEBHOOK_SEND_EMAIL="https://<your-n8n-instance>.app.n8n.cloud/webhook/send-email"
N8N_WEBHOOK_SEND_SMS="https://<your-n8n-instance>.app.n8n.cloud/webhook/send-sms"

# optional, only if you've configured Header Auth on the webhook trigger node
N8N_WEBHOOK_AUTH_HEADER_NAME=
N8N_WEBHOOK_AUTH_HEADER_VALUE=
```

Until these are set, clicking Send Email/Send SMS returns a clear error instead of failing silently. **Shortlist** and **Reject Applicant** do *not* call n8n — they're plain status updates written directly to MongoDB (Server Actions), since they're not communications.

## Running locally

| Command | What it does |
|---|---|
| `npm run dev` | Starts the dev server on `:3000` (Turbopack) |
| `npm run build` | Production build (type-checks + compiles) |
| `npm run start` | Runs the production build |
| `npm run lint` | ESLint |
| `npm run seed` | Resets/repopulates `users`, `applicants`, `interviews`, `activity_logs` with demo data referencing whatever real job(s) already exist |

## Work completed this session

### What was configured
- `.env.local` created with the real `MONGODB_URI` (Atlas, `hr_master_db`) — gitignored, never committed.
- `next.config.ts` — set `turbopack.root` to silence a false-positive "multiple lockfiles" warning caused by a stray `package-lock.json` in the parent home directory.

### Issue found and fixed: `jobs` schema mismatch
Before seeding anything, a read-only inspection of `hr_master_db` found it already contained one **real** job document from the n8n pipeline — with a completely different shape than the `Job` model originally designed from the reference screenshots (custom `job_id` strings vs. Mongo `_id`; flat `city`/`state`/`country`/`zip` vs. a single `location` string; free-text capitalized `status`/`type` vs. lowercase enums; `createdAt`/`updatedAt` stored as ISO **strings**, not dates).

Running the original seed script would have **deleted that real job** and replaced it with fake ones, and the Dashboard's "Total Jobs" query would have silently returned 0 for real data (status `"Open"` doesn't match a query for lowercase `"open"`). Work paused for confirmation before touching anything, then:

- Rewrote `models/Job.ts` to match the real n8n shape exactly (`job_id`, flat address fields, free-text `status`/`type`, string timestamps, `timestamps: false` so Mongoose never overwrites n8n's own values).
- Rewrote `server/repositories/job.repository.ts`: `countActive()` → `countTotal()` (no status filter, since the real status vocabulary isn't fully known yet), and date-range queries now use `$expr`/`$toDate` to correctly compare the string-typed `createdAt` against real `Date` boundaries.
- Updated `features/dashboard/services/dashboard.service.ts` to call `countTotal()`.
- Rewrote `scripts/seed.ts` to **never** create/delete `Job` documents — it now fetches existing real jobs read-only and has seeded applicants/interviews reference them, and throws a clear error if no jobs exist yet instead of silently doing nothing useful.

### Verification performed
- `npx tsc --noEmit` and `npx eslint .` — both clean.
- `npm run build` — production build succeeds.
- Ran `npm run seed` against the real `hr_master_db`, then started the real dev server against it and fetched `/dashboard`: confirmed **200 OK**, correct live counts (1 real job, 40 seeded applicants, 6 shortlisted, 2 hired), correct 6-slice status breakdown, real job title flowing into the Upcoming Interviews list, and no empty-state fallbacks incorrectly showing. Dev server was stopped afterward — nothing was left running.

### Files touched this turn
- Added: `.env.local` (not committed).
- Rewrote: `models/Job.ts`, `server/repositories/job.repository.ts`, `scripts/seed.ts`.
- Edited: `features/dashboard/services/dashboard.service.ts` (one line), `next.config.ts` (turbopack root).

### A note on the credential
The Atlas connection string was pasted in plain text in the conversation used to build this project. It's stored only in the gitignored `.env.local` on this machine — but since it also now lives in that chat history, consider rotating that database user's password if the transcript could be seen by anyone who shouldn't have DB access.

## Database schema

### `jobs` — owned by n8n, read-only from this app

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Mongo default primary key |
| `job_id` | String | n8n's own identifier, e.g. `job_20260629150700_H8XUNROWNU09UKV8`. Treated as a stable external key. |
| `title` | String | Job title |
| `description` | String | Full job description (long text) |
| `department` | String | Often empty string in practice |
| `city` / `state` / `country` / `zip` | String | Flat address fields (no nested object) |
| `status` | String | Free text, capitalized (observed: `"Open"`) |
| `type` | String | Free text (observed: `"Full Time"`) |
| `original_open_date` | String | Date-only, `YYYY-MM-DD` |
| `note` | String \| null | |
| `createdAt` / `updatedAt` | String | **ISO 8601 strings** with `+00:00` offset — not BSON dates |

No foreign keys point *into* `jobs` from n8n's side. The app's `applicants` and `interviews` collections below reference it via `jobId` (ObjectId → `jobs._id`).

### `users` — app-owned

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | PK |
| `name` | String | required |
| `email` | String | required, unique, lowercase |
| `passwordHash` | String | bcrypt hash; required (placeholder until NextAuth wiring) |
| `role` | String enum | `admin` \| `recruiter` \| `hr` \| `interviewer` |
| `title` | String | display title, e.g. "Super Admin" |
| `avatarUrl` | String | optional |
| `createdAt` / `updatedAt` | Date | Mongoose-managed |

### `applicants` — app-owned

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | PK |
| `name`, `email`, `phone` | String | |
| `jobId` | ObjectId | **FK → `jobs._id`** |
| `status` | String enum | `new` \| `screening` \| `shortlisted` \| `interview` \| `offer` \| `hired` \| `rejected` \| `incomplete` |
| `source` | String enum | `website` \| `linkedin` \| `referral` \| `job_board` \| `other` |
| `location` | String | |
| `resumeUrl`, `linkedinUrl`, `githubUrl`, `portfolioUrl` | String | optional |
| `skills` | String[] | |
| `experienceYears` | Number | |
| `currentPosition` | String | |
| `tags` | String[] | |
| `appliedAt` | Date | |
| `createdAt` / `updatedAt` | Date | Mongoose-managed; status-change trends approximate "reached this status" via `updatedAt` |

Indexes: `{status:1, createdAt:-1}`, text index on `name`/`email`/`skills`.

### `interviews` — app-owned

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | PK |
| `applicantId` | ObjectId | **FK → `applicants._id`** |
| `jobId` | ObjectId | **FK → `jobs._id`** |
| `interviewerIds` | ObjectId[] | **FK → `users._id`** (multiple) |
| `type` | String enum | `technical` \| `hr` \| `managerial` \| `final` |
| `status` | String enum | `scheduled` \| `completed` \| `cancelled` \| `rescheduled` |
| `scheduledAt` | Date | |
| `durationMinutes` | Number | default 60 |
| `meetingLink`, `notes`, `feedback` | String | optional |
| `createdAt` / `updatedAt` | Date | Mongoose-managed |

Indexes: `{status:1, scheduledAt:1}`.

### `employees` — app-owned (model exists, not yet used by any built page)

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | PK |
| `applicantId` | ObjectId | FK → `applicants._id`, nullable (direct hires) |
| `name`, `email`, `phone` | String | |
| `department`, `designation` | String | |
| `managerId` | ObjectId | FK → `employees._id` (self-referential), nullable |
| `joiningDate` | Date | |
| `employmentType` | String | free text |
| `employmentStatus` | String enum | `active` \| `on_leave` \| `terminated` |
| `salary` | Number | |
| `createdAt` / `updatedAt` | Date | Mongoose-managed |

### `activity_logs` (Mongoose collection `activitylogs`) — app-owned

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | PK |
| `actorId` | ObjectId | FK → `users._id`, optional (system actions) |
| `actorName` | String | denormalized for display without a populate |
| `action` | String | e.g. `applicant.created`, `interview.scheduled` |
| `entityType` | String enum | `job` \| `applicant` \| `interview` \| `employee` \| `document` |
| `entityId` | ObjectId | polymorphic FK — points at whichever collection `entityType` names |
| `message` | String | human-readable feed text |
| `createdAt` / `updatedAt` | Date | Mongoose-managed |

Indexes: `{createdAt:-1}`.

### Entity relationships

```
jobs (n8n-owned) ─┬──< applicants.jobId
                   └──< interviews.jobId

applicants ────────┬──< interviews.applicantId
                    └──< employees.applicantId (nullable)

users ──────────────┬──< interviews.interviewerIds (many-to-many)
                     └──< activity_logs.actorId

employees ─────────── < employees.managerId (self-referential)

activity_logs.entityId → polymorphic, resolved via entityType
```

### Seed data (`npm run seed`)

Populates, referencing whichever real job(s) already exist in `jobs`:
- 1 admin user ("Ahsan Ali", role `admin`, password `ChangeMe123!` — dev-only, change before any real auth goes live)
- 40 applicants across all 8 statuses (10 new, 8 screening, 6 shortlisted, 5 interview, 2 offer, 2 hired, 4 rejected, 3 incomplete), spread over the last ~20 days
- 5 upcoming scheduled interviews for the "interview"-status applicants
- 5 activity log entries covering applicant creation, interview scheduling, document generation, hire, and rejection

Collections `document_templates`, `documents`, `notifications`, `settings`, and `resume_analysis` mentioned in the original architecture don't have models yet — they'll be added alongside the Documents/Notifications/AI-Analysis steps.
