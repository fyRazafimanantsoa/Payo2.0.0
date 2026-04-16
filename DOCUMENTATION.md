# Payo - Documentation

Payo is a powerful web application designed to help freelancers and small businesses automate their payment reminders and get paid on time.

## 1. Project Overview
- **Mission**: Automate payment reminders to ensure punctuality for freelancers and small businesses.
- **Framework**: Built with [Next.js 16](https://nextjs.org/) (App Router).
- **Language**: [TypeScript](https://www.typescriptlang.org/).
- **Database**: [Prisma](https://www.prisma.io/) with [SQLite](https://sqlite.org/) (for local/MVP) or [PostgreSQL](https://www.postgresql.org/) (for production).
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) and [shadcn/ui](https://ui.shadcn.com/) components.
- **Authentication**: Custom authentication logic using `bcryptjs` and session-based tokens (or `next-auth`).

---

## 2. Technical Stack
- **Frontend**: React 19, Framer Motion (for animations), Lucide React (icons), TanStack Table (data tables), Recharts (dashboard charts).
- **Backend**: Next.js API Routes (Route Handlers).
- **Database**: Prisma ORM, SQLite.
- **Infrastructure**: 
  - **PM2**: For process management in production.
  - **Caddy**: For reverse proxying and SSL management.
  - **Prisma**: Database migrations and seeding.

---

## 3. Data Model
Based on `prisma/schema.prisma`:
- **User**: The main account holder. Contains business details, plan information, and settings.
- **Client**: Represents the business clients. Tracks contact info, preferred currency, and associated templates.
- **Invoice**: Tracks payment details, due dates, and status (upcoming, pending, overdue, paid).
- **Template**: Reusable reminder email templates (system or user-customized).
- **ReminderLog**: Audit trail for every email sent to clients.
- **Subscription**: Tracks user's own Payo subscription (Starter, Pro, etc.).
- **AdminLog**: Tracks administrative actions (e.g., changing user plans).
- **Session**: Manages user authentication sessions.

---

## 4. API Endpoints
The backend is organized into standard RESTful patterns:
- `/api/auth`: Login, Registration, Session management.
- `/api/clients`: Manage client records.
- `/api/invoices`: CRUD operations for invoices and reminder triggers.
- `/api/templates`: System and custom email templates.
- `/api/cron`: Scheduled tasks for processing reminders and subscription expirations.
- `/api/dashboard`: Aggregated stats for the main dashboard.
- `/api/admin`: Administrative tools (user management, logs, stats).
- `/api/user`: Current user settings and profile management.

---

## 5. Deployment & Configuration
### Standalone Production Build
The project uses the `next build` standalone feature for efficient production deployment.
- **Output**: `.next/standalone` directory containing everything needed to run.
- **Process Manager**: PM2 uses `ecosystem.config.cjs` to run `server.js`.
- **Caddy**: Acts as a reverse proxy, listening on port 81 (configurable) and forwarding to port 3000.

### Environment Variables
Key variables required in `.env`:
- `DATABASE_URL`: Path to the SQLite database or Postgres connection string.
- `JWT_SECRET`: Secret key for session tokens.
- `CRON_SECRET`: Secret key to authorize cron job requests.
- `EMAIL_PROVIDER_API_KEY`: API key for real email sending (Resend/Postmark).

---

## 6. Key Features & Workflows
- **Automated Reminders**: A cron job runs every 30 minutes to check for pending/overdue invoices and sends emails based on the assigned template.
- **Template Studio**: A sophisticated editor for customizing the tone (friendly, neutral, firm) and timing of reminders.
- **Admin Panel**: Accessible via `admin@payo.com`, allows for manual plan changes, user suspension, and viewing system-wide audit logs.
- **MVP Manual Payments**: Since Stripe integration is not yet fully automated, the admin manually marks subscriptions as paid in the Admin Panel.

---

## 7. Development & Production Commands
- `npm run dev`: Start development server on port 3000.
- `npm run build`: Generate production build.
- `npm run start:pm2`: Launch production server using PM2.
- `npm run build:full`: Comprehensive build script that copies all necessary production assets.
- `npx prisma db push`: Synchronize database schema.
