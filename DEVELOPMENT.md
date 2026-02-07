# AMT Development Guide

**Read README.md first.** This document covers the technical details a developer needs to start contributing.

---

## Environment Setup

### Prerequisites
- Node.js 20+
- npm 10+
- PostgreSQL database (we use Supabase)
- Git

### Environment Variables

Create a `.env` file in the project root:

```
DATABASE_URL=postgresql://user:password@host:5432/database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=5000
NODE_ENV=development
```

### Running Locally

```bash
npm install
npm run dev          # Starts backend + frontend on port 5000
```

### Build & Deploy

```bash
npm run build        # Builds frontend + bundles backend
npm start            # Runs production build
```

Deployment is on **Railway**, connected to the `main` branch on GitHub. Every push to `main` triggers automatic deployment.

---

## Architecture Overview

### Request Flow
```
Browser -> Express (port 5000) -> API routes -> Storage layer -> PostgreSQL (Supabase)
                                -> Vite dev server (frontend assets in dev)
                                -> Static files (frontend assets in production)
```

### Authentication
- Phone number + 4-digit PIN login
- No JWT/session tokens — user ID stored in `localStorage` as `amt_user`
- Every API request sends `X-User-Id` header
- Server validates user exists and is active on every request
- Role checked via middleware: `ownerOnly`, `ownerOrAdmin`, `canWrite`

### Database
- **ORM:** Drizzle ORM with type-safe queries
- **Schema:** Defined in `shared/schema.ts` — single source of truth for both frontend types and backend queries
- **Migrations:** Runtime migrations in `server/db.ts` — runs on every server start, safe to run multiple times (uses `IF NOT EXISTS`, `IF NOT EXISTS`)
- **Seeding:** `server/seed.ts` — creates demo data on first run, skips if data already exists

### Data Access Pattern
All database operations go through `server/storage.ts`. Routes never query the database directly.

```
Route handler -> storage.someMethod() -> Drizzle query -> PostgreSQL
```

This makes it easy to swap the database, add caching, or mock for testing.

### Frontend Data Fetching
- **TanStack React Query** handles all API calls
- Query keys follow the pattern: `['/api/endpoint', ...params]`
- The custom `apiRequest()` helper in `lib/queryClient.ts` adds auth headers automatically
- Mutations invalidate relevant query keys to trigger refetching

### Offline Support
- `lib/offlineQueue.ts` manages a localStorage-based queue
- When offline: transactions are saved to the queue and the user sees confirmation
- When back online: queued items are sent to the server automatically
- `OfflineBanner` component shows offline status

---

## Database Schema (Key Tables)

| Table | Purpose |
|-------|---------|
| `users` | All users with phone, PIN, role |
| `businesses` | Company entities (machinery, gold, spare parts, fuel) |
| `user_business_access` | Many-to-many: which users can see which businesses |
| `bank_accounts` | Bank/cash accounts with running balances |
| `categories` | Transaction categories with `direction` field (in/out/both) |
| `ledger_transactions` | All money movements — the core table |
| `customers` | Customer contacts linked to businesses |
| `suppliers` | Supplier contacts linked to businesses |
| `machinery_assets` | Asset tracking for machinery businesses |
| `machinery_cost_lines` | Cost breakdown per asset |
| `lease_contracts` | Lease agreements on machinery |
| `lease_payments` | Payment tracking per lease |
| `gold_lots` | Gold lot tracking (funded, in_hand, sold) |
| `agents` | Gold buying agents |
| `inventory_items` | Spare parts stock |
| `inventory_movements` | Stock in/out movements |
| `fuel_summaries` | Weekly fuel station summaries |
| `alerts` | System alerts (low stock, overdue, variance) |
| `approvals` | Transaction approval workflow |
| `audit_log` | Change tracking (exists, not fully wired) |

### The `ledger_transactions` Table (Most Important)
This is the heart of the system. Every financial event is a row here.

| Column | Purpose |
|--------|---------|
| `direction` | `'in'` or `'out'` — money coming in or going out |
| `amount` | Decimal amount |
| `currency` | Which currency |
| `businessId` | Which business this belongs to |
| `bankAccountId` | Which bank account (null for journal entries) |
| `categoryId` | What type of income/expense |
| `customerId` | Linked customer (optional) |
| `supplierId` | Linked supplier (optional) |
| `counterparty` | Free-text name (fallback when no customer/supplier selected) |
| `subcategory` | Used for journal entry types (e.g., `journal_adjustment`) |
| `status` | `'draft'` or `'posted'` |
| `reconciled` | Whether matched to bank statement |

---

## API Routes Reference

### Auth
| Method | Route | Access | Purpose |
|--------|-------|--------|---------|
| POST | `/api/auth/login` | Public | Login with phone + PIN |
| POST | `/api/auth/register` | Public | Register new user |
| POST | `/api/auth/change-pin` | Authenticated | Change PIN |

### Transactions
| Method | Route | Access | Purpose |
|--------|-------|--------|---------|
| GET | `/api/transactions` | Authenticated | All transactions (filtered by business access) |
| POST | `/api/transactions` | Can Write | Create transaction |
| GET | `/api/transactions/today` | Authenticated | Today's transactions |

### Businesses
| Method | Route | Access | Purpose |
|--------|-------|--------|---------|
| GET | `/api/businesses` | Authenticated | User's businesses |
| GET | `/api/businesses/:id` | Authenticated | Single business |
| POST | `/api/businesses` | Owner | Create new business |
| GET | `/api/businesses/:id/kpis` | Authenticated | Business KPIs |

### Bank Accounts
| Method | Route | Access | Purpose |
|--------|-------|--------|---------|
| GET | `/api/bank-accounts` | Owner/Admin | All bank accounts |
| GET | `/api/bank-accounts/:id/transactions` | Owner/Admin | Transactions for a bank |

### Categories
| Method | Route | Access | Purpose |
|--------|-------|--------|---------|
| GET | `/api/categories` | Authenticated | All categories |
| GET | `/api/categories/by-direction?direction=in` | Authenticated | Filtered by direction |

### Customers
| Method | Route | Access | Purpose |
|--------|-------|--------|---------|
| GET | `/api/customers` | Authenticated | All customers |
| POST | `/api/customers` | Can Write | Create customer |
| PATCH | `/api/customers/:id` | Can Write | Update customer |
| DELETE | `/api/customers/:id` | Can Write | Soft-delete customer |

### Suppliers
| Method | Route | Access | Purpose |
|--------|-------|--------|---------|
| GET | `/api/suppliers` | Authenticated | All suppliers |
| POST | `/api/suppliers` | Can Write | Create supplier |
| PATCH | `/api/suppliers/:id` | Can Write | Update supplier |
| DELETE | `/api/suppliers/:id` | Can Write | Soft-delete supplier |

### Dashboard & Reports
| Method | Route | Access | Purpose |
|--------|-------|--------|---------|
| GET | `/api/dashboard` | Authenticated | Dashboard aggregated data |
| GET | `/api/reports?month=2026-01` | Authenticated | Monthly report |

### Admin
| Method | Route | Access | Purpose |
|--------|-------|--------|---------|
| GET | `/api/admin/users` | Owner/Admin | All users |
| POST | `/api/admin/users` | Owner/Admin | Create user |
| PATCH | `/api/admin/users/:id` | Owner/Admin | Update user |
| GET | `/api/admin/businesses` | Owner/Admin | All businesses (for assignment) |
| POST | `/api/admin/users/:id/businesses` | Owner/Admin | Grant business access |
| DELETE | `/api/admin/users/:userId/businesses/:businessId` | Owner/Admin | Revoke access |

---

## Frontend Pages

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | `Dashboard` | Home — money overview, quick actions, business tiles |
| `/new-entry` | `NewEntry` | 3-step transaction/journal entry form |
| `/transactions` | `Transactions` | Transaction history with search and filters |
| `/customers` | `Customers` | Customer management (add/edit/delete/search) |
| `/suppliers` | `Suppliers` | Supplier management (add/edit/delete/search) |
| `/banks` | `Banks` | Bank account list with total balance |
| `/bank/:id` | `BankAccountDetail` | Single bank account transactions |
| `/business/:id` | `BusinessDetail` | Business KPIs and details |
| `/reports` | `Reports` | Monthly reports with charts |
| `/alerts` | `Alerts` | Alert list with dismiss |
| `/admin/users` | `AdminUsers` | User management |
| `/login` | `Login` | Login form |
| `/register` | `Register` | Registration form |
| `/change-pin` | `ChangePIN` | PIN change form |

---

## Adding New Features: Step-by-Step

### Adding a New Database Table

1. Define the table in `shared/schema.ts`
2. Add insert schema and types at the bottom of `shared/schema.ts`
3. Add a runtime migration in `server/db.ts` (CREATE TABLE IF NOT EXISTS)
4. Add CRUD methods to the `IStorage` interface and `DatabaseStorage` class in `server/storage.ts`
5. Add API routes in `server/routes.ts`
6. Add seed data in `server/seed.ts` if needed

### Adding a New Page

1. Create the page component in `client/src/pages/YourPage.tsx`
2. Add the route in `client/src/App.tsx`
3. Add navigation (Dashboard quick action, or link from relevant page)
4. Use `useQuery` for data fetching, `useMutation` for writes
5. Follow existing patterns: sticky header, BottomNav, max-w-2xl mx-auto

### Adding a New Category

Categories are seeded in `server/seed.ts` and migrated in `server/db.ts`. To add:
1. Add to seed data with correct `direction` ('in', 'out', or 'both')
2. Add to the migration UPDATE statements in `db.ts` so existing databases get the classification
3. Optionally set `businessType` if it's specific to one business type

---

## Coding Conventions

- **TypeScript everywhere.** No `any` in new code unless interfacing with legacy code.
- **Functional components only.** No class components.
- **Shadcn/ui for all UI elements.** Don't reinvent buttons, cards, selects, etc.
- **Tailwind for styling.** No separate CSS files.
- **`apiRequest()` for all API calls.** It handles auth headers.
- **Soft-delete only.** Set `isActive = false`, never DELETE rows.
- **Decimal amounts stored as strings** in the database to avoid floating point issues.
- **All monetary display uses `formatCurrency()`** from `lib/constants.ts`.

---

## Testing Accounts (Seed Data)

| Name | Phone | PIN | Role |
|------|-------|-----|------|
| DEEBI Owner | 0201234567 | 1234 | owner |
| eACG Finance | 0202345678 | 1234 | admin |
| Machinery Accountant | 0203456789 | 1234 | staff |
| Gold Desk | 0204567890 | 1234 | staff |
| Spare Parts Clerk | 0205678901 | 1234 | staff |
| Fuel Partner | 0206789012 | 1234 | partner |
| Auditor | 0207890123 | 1234 | auditor |

---

## Commit Convention

Always commit and push after completing a feature or fix. Every commit message should explain **what** changed and **why**.

Format:
```
Short summary of changes (under 70 characters)

- Bullet point details if needed
- Another detail

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

**Never leave uncommitted work.** The next developer (or the same developer after a restart) should always be able to pull `main` and have a working, up-to-date app.

---

## Verified & Tested Features (as of Feb 2026)

The following features have been tested via API calls and confirmed working. Before building new features, the next developer should re-verify these. If any fail, fix them first before adding anything new.

### Authentication & Access Control
| Test | Status | How to verify |
|------|--------|---------------|
| Owner login (0201234567 / 1234) | PASS | Returns user + all 5 businesses |
| Staff login (0203456789 / 1234) | PASS | Returns user + only DEEBI Machinery (restricted) |
| Invalid PIN rejected | PASS | Returns 401 error |
| Role-based route protection | PASS | Staff cannot access owner-only endpoints |

### Dashboard
| Test | Status | How to verify |
|------|--------|---------------|
| Dashboard loads with money overview | PASS | `GET /api/dashboard` returns todayIn, todayOut, totalBalance |
| Business tiles show with profit/loss | PASS | Each business has cashIn, cashOut, profit fields |
| Quick Actions visible for owner | PASS | UI shows 6 action tiles (owner role only) |
| Alerts display on dashboard | PASS | 5 seed alerts returned (low stock, overdue, variance) |

### Transactions
| Test | Status | How to verify |
|------|--------|---------------|
| Transaction list loads | PASS | `GET /api/transactions` returns 64+ transactions |
| Create Money In transaction | PASS | `POST /api/transactions` with direction=in saves correctly |
| Create Money Out transaction | PASS | `POST /api/transactions` with direction=out saves correctly |
| Bank balance auto-updates | PASS | Creating transaction with bankAccountId adjusts the bank balance |
| Category direction filtering | PASS | Money In shows only: Gold Sale, Sales Revenue, Lease Payment |
| Category direction filtering | PASS | Money Out shows only: Purchase, Shipping, Clearing, Transport, Storage, Agent Funding, Gold Purchase, Salaries/Wages, Taxes/Levies, Fuel/Transport, Utilities, Maintenance |
| No crossover between directions | PASS | Sales Revenue does NOT appear for Money Out. Salaries does NOT appear for Money In. |

### Businesses
| Test | Status | How to verify |
|------|--------|---------------|
| List businesses | PASS | Owner sees all 5 seeded businesses |
| Create new business (owner only) | PASS | `POST /api/businesses` creates business and auto-assigns owner access |
| New business appears in list | PASS | After creation, business shows in dashboard and dropdowns |
| Business KPIs load | PASS | `GET /api/businesses/:id/kpis` returns revenue, expenses, profit |

### Bank Accounts
| Test | Status | How to verify |
|------|--------|---------------|
| List all bank accounts | PASS | 6 accounts returned (GCB, Ecobank, Absa, Fidelity, USD, Cash) |
| Bank account detail with transactions | PASS | `GET /api/bank-accounts/:id/transactions` returns linked transactions |
| Multi-currency balances | PASS | GHS and USD accounts show correct currencies |

### Customers
| Test | Status | How to verify |
|------|--------|---------------|
| Customer list (empty initially) | PASS | `GET /api/customers` returns [] on fresh DB |
| Create customer | PASS | `POST /api/customers` with name and phone creates successfully |
| Customer persists and appears in list | PASS | After creation, customer appears in GET response |
| Update customer | PASS | `PATCH /api/customers/:id` updates fields |
| Soft-delete customer | PASS | `DELETE /api/customers/:id` sets isActive=false, removed from list |
| Customer selection in NewEntry | PASS | Step 3 shows customer dropdown for Money In |

### Suppliers
| Test | Status | How to verify |
|------|--------|---------------|
| Supplier list (empty initially) | PASS | `GET /api/suppliers` returns [] on fresh DB |
| Create supplier | PASS | `POST /api/suppliers` with name, phone, category creates successfully |
| Supplier persists and appears in list | PASS | After creation, supplier appears in GET response |
| Update supplier | PASS | `PATCH /api/suppliers/:id` updates fields |
| Soft-delete supplier | PASS | `DELETE /api/suppliers/:id` sets isActive=false, removed from list |
| Supplier selection in NewEntry | PASS | Step 3 shows supplier dropdown for Money Out |

### Journal Entries
| Test | Status | How to verify |
|------|--------|---------------|
| Journal Entry toggle on NewEntry page | PASS | UI shows Cash Transaction / Journal Entry tabs |
| Journal type selector | PASS | Adjustment, Write-Off, Opening Balance, Transfer, Other |
| Journal saved without bank account | PASS | Transaction created with bankAccountId=null and subcategory=journal_* |
| Increase/Decrease direction | PASS | Journal entries support both directions |

### Reports
| Test | Status | How to verify |
|------|--------|---------------|
| Monthly report loads | PASS | `GET /api/reports?month=2026-02` returns revenue, expenses, breakdowns |
| Category breakdown | PASS | Expenses grouped by category name |
| Business breakdown | PASS | Revenue grouped by business name |

### Alerts & Approvals
| Test | Status | How to verify |
|------|--------|---------------|
| Alerts list loads | PASS | 5 seed alerts: 2 low stock, 1 overdue, 1 variance, 1 agent warning |
| Dismiss alert | PASS | `POST /api/alerts/:id/dismiss` marks as read |
| Pending approvals (owner) | PASS | 2 seed approvals returned for owner |

### User Management (Admin)
| Test | Status | How to verify |
|------|--------|---------------|
| List all users | PASS | 7 seed users returned |
| Create new user | PASS | `POST /api/admin/users` creates user with role |
| Assign business access | PASS | `POST /api/admin/users/:id/businesses` grants access |
| Revoke business access | PASS | `DELETE /api/admin/users/:userId/businesses/:businessId` removes access |

### Database & Infrastructure
| Test | Status | How to verify |
|------|--------|---------------|
| Runtime migrations run on startup | PASS | Server logs "Database migrations completed" |
| Seed data creates on empty DB | PASS | Server logs "Database seeded successfully" |
| Seed skips on populated DB | PASS | Server logs "Database already seeded, skipping" |
| category_direction enum exists | PASS | Categories have direction field (in/out/both) |
| Customers/Suppliers tables exist | PASS | Created by migration, CRUD operations work |

### Known Limitations (Not Bugs — Just Not Built Yet)
- Offline queue saves transactions locally but sync has no conflict resolution
- Photo/File attachment buttons exist in UI but upload is not implemented
- Transfer button on Banks page is UI-only (no backend)
- Audit log table exists but is not populated by any operations
- Reports only show one month at a time, no comparison
- No invoicing, bills, reconciliation, budgets, or financial statements yet (see README roadmap)
