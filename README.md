# Personalized Money Tracker — Phase 1

A polished, responsive, and secure personal finance management web application built with a classic human-centered editorial design, exact integer paise ledger arithmetic, and modular architecture.

---

## 🌟 Key Features (Phase 1)

1. **Classic Editorial UI/UX**:
   - Clean, trustworthy aesthetic with soft ivory background (`#FBFBFA`), deep navy slate elements (`#0F172A`), restrained green for income/surplus, and muted red for expenses.
   - Built with Tailwind CSS, Lucide icons, and Recharts.
   - Fully responsive on desktop (persistent sidebar) and mobile (collapsible drawer).

2. **Zero Floating-Point Financial Precision**:
   - All monetary figures are stored and calculated as integer **paise** (1 INR = 100 paise).
   - Eliminates standard IEEE 754 floating-point rounding bugs across all ledger summaries and reports.

3. **Complete Financial Modules**:
   - **Main Dashboard**: Total Income, Total Expenses, Net Cash Flow, Budget Utilization, Daily Spending Flow chart, Category Donut chart, upcoming bills, and debt glance.
   - **Transactions Ledger**: Manual entries for Income, Expenses, and Transfers between own accounts. Filtering by date range, category, type, and payment method (UPI, Card, Cash, Bank Transfer). Search, sort, and summary totals.
   - **Monthly Budgets**: Monthly category limits with proactive warnings (80% approaching limit, 100% exceeded). Spending calculated strictly from actual expenses within the period.
   - **Money Lent, Borrowed & Advances**: Financial obligations ledger distinguishing money owed to the user from debts owed to others. Linked partial repayment logs preserving historical records.
   - **Trip Expense Tracker**: Separate trip budgeting for vacations and treks. Logs expenses under Travel, Hotel, Food, Transport, and Shopping without polluting monthly living expenses.
   - **Group Expenses & Split Bills**: Shared expense splitting and settlements for vacations, roommates, and outings. 5 exact split methods (Equal, Unequal, Percentage, Shares, Itemized), greedy debt minimization, and direct UPI settlement links.
   - **Recurring Bills & EMIs**: Schedules for monthly rent, subscriptions, EMIs, and salaries. 1-click "Record as Paid" button posts real transaction entries and auto-advances the next due date.
   - **Categories**: Standard default taxonomy plus custom category creation with color palettes.
   - **Reports & Analytics**: Month-over-month comparisons (MoM growth rates), 6-month historical cash flow bar chart, and CSV export for spreadsheets.

4. **Security & Privacy**:
   - Password hashing with `bcryptjs`.
   - JWT session authentication.
   - Strict server-side user data isolation (all DB queries scoped to authenticated `userId`).
   - Zero UPI PIN or bank credential requests.

---

## 🏗️ Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, Recharts, React Router v7, Axios.
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, Zod validation, JWT, Bcrypt.
- **Database**: PostgreSQL (with Prisma migrations and zero-config local dev SQLite option).
- **Testing**: Jest, Supertest, ts-jest.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### 2. Installation
From the root workspace directory, install dependencies:
```bash
npm run install:all
```

### 3. Environment Setup
Review `.env.example` in the root and configure `server/.env`:
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your-secure-random-secret-key-min-32-chars
DATABASE_URL="file:./dev.db"
# Or PostgreSQL:
# DATABASE_URL="postgresql://postgres:password@localhost:5432/money_tracker?schema=public"
```

### 4. Database Sync & Seed
```bash
# Push schema
npm --prefix server run prisma:push

# Seed default categories & demo user
npm --prefix server run prisma:seed
```

### 5. Start Development Servers
Run both backend API (port 5000) and frontend client (port 3000) concurrently:
```bash
npm run dev
```

Open your browser at: **`http://localhost:3000`**

---

## 🔑 Demo Account Credentials

For instant exploration with pre-populated sample transactions, budgets, debts, and trips:
- **Email**: `demo@moneytracker.com`
- **Password**: `Password123!`
- Or simply click **"Instant Demo Account (1-Click)"** on the landing or login page.

---

## 🧪 Running Automated Tests

Run the test suite verifying currency arithmetic, financial business rules, and API authorization:
```bash
npm test
```
Result: All unit and integration test suites pass.

---

## 🚀 Deployment Guide

You can deploy this application in either of two ways:

### Option A: Deploy Separately (Frontend & Backend Decoupled)

Best for serverless static frontend (Vercel, Netlify, Cloudflare Pages) + dedicated backend API (Render, Railway, Fly.io, DigitalOcean).

#### 1. Backend Setup (e.g. Render Web Service / Railway)
- **Root Directory**: `server`
- **Build Command**: `npm install && npm run build && npm run prisma:push`
- **Start Command**: `npm start`
- **Environment Variables**:
  ```env
  PORT=5000
  NODE_ENV=production
  JWT_SECRET=your_32_char_minimum_random_secret_key
  DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB?schema=public
  CORS_ORIGIN=https://your-frontend-domain.vercel.app
  ```

#### 2. Frontend Setup (e.g. Vercel / Netlify / Cloudflare Pages)
- **Root Directory**: `client`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variable**:
  ```env
  VITE_API_URL=https://your-backend-api.onrender.com
  ```
  *(The client will automatically prepend this to `/api` requests).*

---

### Option B: Deploy Together as Single Service (Unified Monolith)

Best for single-server setups (Render Web Service, Railway, VPS, Docker, Heroku). The Express backend serves the built React frontend static assets, handling both UI and `/api` on one single domain with zero CORS setup needed.

#### 1. Configuration
- **Root Directory**: `.` (Repository Root)
- **Build Command**:
  ```bash
  npm run install:all && npm run build && npm --prefix server run prisma:push
  ```
- **Start Command**:
  ```bash
  npm start
  ```
- **Environment Variables**:
  ```env
  PORT=5000
  NODE_ENV=production
  JWT_SECRET=your_32_char_minimum_random_secret_key
  DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB?schema=public
  ```
  *(Leave `VITE_API_URL` and `CORS_ORIGIN` empty or unset — the app serves everything on the same origin).*

#### How it works under the hood:
1. `npm run build` compiles both the backend (`server/dist`) and the frontend (`client/dist`).
2. Express detects `client/dist` and mounts `express.static` for assets.
3. Requests to `/api/*` go directly to the Express REST controllers.
4. All browser navigation routes (`/dashboard`, `/groups`, etc.) return `index.html` for client-side React Router.

