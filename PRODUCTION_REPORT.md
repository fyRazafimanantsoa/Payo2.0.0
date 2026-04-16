# Payo: Production Readiness & Netlify Deployment Report

This report outlines the steps required to take Payo from its current "Base MVP" state to a production-ready application hosted on Netlify.

## 1. High-Priority Infrastructure

### A. Database Migration (Postgres)
Netlify uses serverless functions, which are ephemeral. **SQLite will NOT work in production** because the database file will be deleted or reset every time a function starts or the app redeploys.
- **Action:** Migrate to a hosted Postgres provider like **Supabase**, **Neon**, or **Render**.
- **Prisma:** Update `schema.prisma` datasource to `postgresql` and update the `DATABASE_URL` in Netlify's environment variables.

### B. Real Email Integration
Currently, reminders only log to the console.
- **Action:** Integrate an email service provider. **Resend** is highly recommended for Next.js.
- **Provider:** Resend, Postmark, or SendGrid.
- **Setup:** Add API keys to environment variables and update `src/app/api/invoices/[id]/send-reminder/route.ts` to use the provider's SDK.

## 2. Business Logic & Plan Management

### A. Manual Payment Flow
As requested, we have implemented manual payment cues:
- Users on trial or expired plans see a call-to-action to contact `mananarazafy1@gmail.com`.
- **Next Step:** When a user pays manually, the admin (you) must log in to the Admin Dashboard (using `admin@payo.com`) and manually change that user's `planType` (Starter/Pro) and `subscriptionStatus` (Active).

### B. Plan Limits
The code already has constants for `PLAN_CLIENT_LIMITS` and `PLAN_INVOICE_LIMITS`.
- **Action:** Ensure all creation endpoints (Clients, Invoices, Custom Templates) strictly enforce these limits based on `user.planType`.

## 3. Deployment to Netlify

### A. Environment Variables
You must set these in the Netlify UI (Site settings > Build & deploy > Environment):
- `DATABASE_URL`: Your Postgres connection string.
- `SESSION_SECRET`: A long random string.
- `TRIAL_DAYS`: Set to `14`.
- `CRON_SECRET`: A secret token to secure your cron jobs.
- `RESEND_API_KEY`: For real email sending.

### B. Netlify Configuration
- **Build Command:** `npx prisma generate && next build`
- **Publish Directory:** `.next`
- **Functions:** Ensure Next.js Runtime is enabled on Netlify.

## 4. UI/UX Improvements Done & Pending

### Improvements Made Today:
- **Visual Template Editor:** Replaced the "bad" UX with a polished, dual-mode editor (Visual vs HTML).
- **Navigation Fixes:** Dashboard clicks now correctly open invoice details.
- **Smart Forms:** Invoice forms now sync currency and numbering per client.

### Pending Polish:
- **Mobile Responsiveness:** Further testing on mobile devices for the Sidebar and Template Studio.
- **Email Previews:** More robust "Send Test Email" feature so users can see the final result in their own inbox.
- **Onboarding Checklist:** A guided tour for new users (Create Client -> Create Template -> Add Invoice).

## 5. Security & Maintenance
- **Cron Jobs:** Set up a scheduled task (e.g., using Netlify Scheduled Functions or Cron-job.org) to hit `/api/cron/process` every 24 hours to automate reminders.
- **Error Tracking:** Consider adding **Sentry** or **LogRocket** to catch production bugs.

---
**Current Status:** Base MVP Logic Complete. Ready for Postgres migration and Email Provider integration.
