# HR Recruitment & Employee Documentation System

A multi-tenant HR/ATS platform covering the full recruitment-to-employment lifecycle: job postings, applicant tracking, AI-assisted resume analysis and phone screening, interview scheduling with calendar sync, employee records, and document generation (offer letters, confirmation letters, etc.) with company letterheads.

Built with Next.js 16 (App Router, Server Actions), TypeScript (strict), Mongoose 9 on MongoDB Atlas, and Tailwind v4 + shadcn/ui. Deployed on Vercel.

## Architecture

Each feature follows the same layering: **repository** (`server/repositories/*.repository.ts`, tenant-scoped Mongoose queries) → **service** (`features/*/services/*.service.ts`, business logic + permission checks) → **Server Action** (`actions/*.ts`, input validation + the thin bridge to client components) → **UI** (`features/*/components/*.tsx`). Shared cross-cutting concerns live in `lib/` (auth, encryption, rate limiting, PDF/DOCX generation, webhooks).

Every tenant-owned collection is scoped by `companyId` at the repository layer — see `SECURITY_STANDARDS.md` for the full multi-tenancy and security requirements this project is held to.

## Key features

- **Recruitment**: job postings (with multi-platform promotion to LinkedIn/Indeed/Facebook/X), applicant pipeline with kanban/table views, AI resume analysis, AI-driven phone screening with configurable questions and outcome-driven interview scheduling, bulk document generation.
- **Employees**: records, departments, employee types, bulk CSV/XLSX import, document generation with letterhead support.
- **Documents**: template-driven `.docx` generation with conditional/repeating sections, image fields, calculated (salary) fields, and PDF preview conversion (Puppeteer + headless Chromium).
- **Calendar**: Google Calendar and Outlook/Microsoft Graph integration for interview scheduling with conflict detection.
- **Company Configuration**: per-company n8n webhook URLs, email/SMTP settings, and social-media credentials, encrypted at rest.
- **Notifications & Activity Log**: real-time in-app notifications and a full audit trail of sensitive actions.

## Security

- Session-based auth (bcrypt password hashing, httpOnly/secure/sameSite cookies, idle + absolute session timeout, account lockout after repeated failed attempts).
- Optional TOTP-based MFA, enforced for the `admin` role; Cloudflare Turnstile CAPTCHA on login.
- MongoDB-backed rate limiting on the login action and both public inbound webhook routes.
- Role-based access control (`admin`/`hr`/`recruiter`/`interviewer`) enforced server-side on every mutation.
- AES-256-GCM field-level encryption for third-party credentials (n8n/SMTP/OAuth/calendar tokens) and TOTP secrets.
- Full audit logging of authentication events, MFA changes, document downloads/exports, and administrative actions.

See `SECURITY_STANDARDS.md` for the complete set of requirements this project is designed against.

## Prerequisites

- **Node.js 20+** (built and tested on Node 26).
- A **MongoDB Atlas** cluster (or any MongoDB 6+ instance).
- A **Vercel Blob** store (for template/document/letterhead file storage — serverless functions have no persistent disk).

> **Windows + nvm4w users:** if `npm`/`npx` fail with `EPERM: operation not permitted, lstat 'C:\Users\Administrator\AppData'`, your machine's `nvm4w` install has `NVM_HOME` pointing at another user's profile your account can't read. Workaround: prepend a working Node install to `PATH` for your session, e.g. `$env:PATH = "C:\Program Files\nodejs;" + $env:PATH`. Long-term fix requires admin access to correct `NVM_HOME`.

## Setup from scratch

```bash
npm install
cp .env.example .env.local
# edit .env.local — MONGODB_URI and BLOB_READ_WRITE_TOKEN are required to run at all;
# everything else in .env.example is optional and degrades gracefully when unset
# (see that file's own comments for what each integration needs and how to get it)

npm run seed          # optional demo data
npm run create:company -- --name "Acme Inc" --slug acme --admin-name "Jane Doe" --admin-email jane@acme.test
npm run dev
```

`create:company` prints a temporary admin password — the first login is forced through a password-change flow.

## Environment variables

`.env.example` is the authoritative reference — every variable is documented there with what it's for and, where applicable, exactly how to obtain it (Google Cloud/Azure AD/Cloudflare/etc.). Only `MONGODB_URI` and `BLOB_READ_WRITE_TOKEN` are required to run the app at all; every other integration (n8n webhooks, calendar OAuth, CAPTCHA, field encryption) is optional and the relevant feature simply stays inactive until configured.

## Available scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on `:3000` (Turbopack) |
| `npm run build` | Production build (type-checks + compiles) |
| `npm run start` | Runs the production build |
| `npm run lint` | ESLint |
| `npm run seed` | Populates demo data for local development |
| `npm run create:company` | Provisions a new tenant company + its first admin user |
| `npm run create:demo-applicant` | Creates a single synthetic applicant for testing |
| `npm run migrate:tenancy` | One-time historical migration script (dry-run by default) |

## Deploying to Vercel

- Framework preset, install command, and build command are all auto-detected.
- Set every variable you're using from `.env.example` under Project Settings → Environment Variables.
- **MongoDB Atlas → Network Access**: allow `0.0.0.0/0` (or use the official Vercel–Atlas integration) — Vercel's serverless functions have no static outbound IP.
- Enable **Vercel Blob** storage on the project (Storage tab) to auto-provision `BLOB_READ_WRITE_TOKEN`.
- PDF generation uses `@sparticuz/chromium`, a prebuilt headless-Chromium binary for Vercel's Linux runtime — it does not run on a local Windows/macOS dev machine; set `PUPPETEER_EXECUTABLE_PATH` to a local Chrome install for local testing of that specific feature.

## Known limitations

Documented plainly rather than left for a reviewer to discover:

- **No automated test suite or CI pipeline yet.** Verification currently relies on `npm run build`'s type-checking, ESLint, and manual/scripted checks against real data before each deploy.
- **No WAF/DDoS layer beyond Vercel's platform-level protection** — the app runs on a `*.vercel.app` domain rather than a custom domain, which limits options here (see `SECURITY_STANDARDS.md`'s infrastructure section for the tradeoffs).
- **Encryption at rest is currently scoped to**: third-party integration credentials, calendar OAuth tokens, MFA secrets, and employee salary fields. Other fields flagged as sensitive in `SECURITY_STANDARDS.md` (e.g. national IDs, bank details) don't exist in the current schema at all.
- A handful of `npm audit` advisories remain, all traced to transitive dependencies (`exceljs`, `googleapis-common`, and Next.js's own vendored `postcss`/`sharp`) that don't yet have a non-breaking upstream fix — tracked, not silently ignored.
