# 🚀 How to Start the Payo Application

This application has been redesigned and optimized for production deployment on **Netlify** with a **PostgreSQL** backend. 

Follow these steps to get the application running on your local machine.

---

## 1. Prerequisites
- **Node.js** (v18 or higher)
- **npm** or **bun**
- **PostgreSQL** (since we migrated to `postgresql` for Netlify compatibility).
  *If you want to use SQLite locally, see the "Local SQLite Setup" section below.*

---

## 2. Environment Setup
Create a `.env` file in the root directory (copy the template below):

```env
# Database
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"

# Auth (Required for login/register)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-random-secret-here"
JWT_SECRET="another-secure-random-string"

# Automation (Required for reminders)
CRON_SECRET="your-automation-secret"

# App
NODE_ENV="development"
```

---

## 3. Installation & Database Prep
Run these commands in order:

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma client
npx prisma generate

# 3. Sync database schema (Wait until DATABASE_URL is set in .env)
npx prisma db push
```

---

## 4. Starting the Server
The application is now automated. To start the server locally or on any hosting platform, simply run:

```bash
npm run dev
```
*Note: This command will automatically generate the required database clients before launching the app.*

The app will be available at **http://localhost:3000**.

---

## 5. Local SQLite Setup (Optional)
If you don't have a PostgreSQL database ready and want to test locally with SQLite:

1. Open `prisma/schema.prisma`.
2. Change the `datasource db` block to:
   ```prisma
   datasource db {
     provider = "sqlite"
     url      = "file:./dev.db"
   }
   ```
3. Update your `.env` file:
   ```env
   DATABASE_URL="file:./dev.db"
   ```
4. Run `npx prisma db push` again.

---

## 6. Redesign Features (Atelier Edition)
The app is now running the **Atelier Redesign**. Key improvements:
- **Premium Typography:** Using *Newsreader* (Serif) for a high-end editorial feel.
- **Bento Dashboard:** High-level metrics organized in a modern grid.
- **Visual Template Studio:** A premium canvas for drafting client reminders.
- **Invoice Ledger:** A sophisticated list view with rich status badges.

---

### **Important Note for Netlify Deployment**
When deploying to Netlify:
1. Ensure `prisma/schema.prisma` is set to `provider = "postgresql"`.
2. Add all the environment variables from your `.env` into the **Netlify Environment Variables** settings.
3. Use `npm run build` as the build command and `.next` as the publish directory.
