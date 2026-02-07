# AMT - Ameb Money Tracker

**The simplest accounting software in the world.**

AMT exists because business owners should not need an accounting degree to understand where their money is going. A director sitting at home should be able to open this app and within seconds know: How much came in today? How much went out? Which business is profitable? Who owes me? Who do I owe? — without calling anyone.

---

## The Vision

### Problem
Most accounting software is built for accountants. It assumes the user understands debits, credits, journals, trial balances, and chart of accounts. But the people who need financial information the most — business owners, directors, entrepreneurs — are often the least equipped to navigate these systems. They end up depending entirely on accountants and finance managers, losing control of their own money.

### Solution
AMT is built **owner-first**. Every screen answers a simple question. Every action takes the fewest possible taps. The complexity lives in the backend where it belongs. The owner sees clarity. The accountant sees power. Both use the same app.

### Who Is This For?

| User | What They See |
|------|--------------|
| **Business owner / Director** | Dashboard with plain-language money summaries, alerts when things go wrong, one-tap transaction entry |
| **Accountant / Admin** | Full transaction history, categories, reports, bank reconciliation, journal entries |
| **Staff / Clerk** | Only the businesses they're assigned to, simple data entry |
| **Partner** | Read access to their business segment only |
| **Auditor** | Read-only access to everything |

### Scale Philosophy
AMT is built in levels. A woman selling provisions at Makola Market and a mining company with five subsidiaries should both find this software useful. The difference is not a different product — it is the same product with features that reveal themselves as the business grows:

- **Level 1 (Solo trader):** One business, money in, money out, see your profit. Done.
- **Level 2 (Growing business):** Multiple businesses, bank accounts, categories, customers and suppliers.
- **Level 3 (Complex operations):** Journal entries, multi-currency, approval workflows, staff roles, asset tracking.
- **Level 4 (Full accounting):** Chart of accounts, double-entry, financial statements, tax, invoicing.

We are currently at **Level 2-3**. This README documents where we are and exactly what comes next.

### Geographic Scope
AMT is being built in Ghana but it is **not a Ghanaian product**. It is a universal product that happens to start in Ghana. The architecture supports:
- Multiple currencies (GHS, USD, CNY, GBP, NGN, CDF — more can be added)
- Configurable locations (currently Ghana cities — designed to be swapped per country)
- Configurable business types (currently machinery, gold, spare parts, fuel — designed to be extended)
- Language-ready structure (English first, but text is externalizable)
- Tax framework-ready (VAT/GST fields can be added without restructuring)

### Future Product Lines
1. **AMT Business** (current) — For businesses of all sizes
2. **AMT Personal** — For individuals managing personal finances (same core engine, different interface)
3. **AMT SaaS** — Multi-tenant cloud offering with subscription tiers

---

## What Is Built (Current State)

### Core Features (Working)
- **Multi-business management** — Owner can run 5+ businesses from one dashboard
- **Money In / Money Out** — Simple transaction entry with 3-step flow
- **Journal Entries** — Non-cash adjustments (write-offs, corrections, opening balances) without bank account movement
- **Category direction filtering** — Income categories only show for Money In, expense categories only show for Money Out
- **Bank accounts** — Track balances across multiple banks, auto-update on transactions
- **Customers module** — Full add/edit/delete, searchable, filterable by business, selectable in transactions
- **Suppliers module** — Full add/edit/delete with category tagging, selectable in transactions
- **Dashboard** — Owner sees money overview, business tiles with profit/loss, quick action buttons, alerts
- **Quick Actions** — One-tap access to New Entry, Customers, Suppliers, Banks, Users, Add Business
- **Add Business** — Owner can create new businesses directly from the dashboard
- **Role-based access** — Owner, Admin, Staff, Partner, Auditor with different permissions
- **User management** — Create users, assign them to specific businesses, set roles
- **Alerts system** — Low stock warnings, overdue payments, cash variances
- **Approval workflow** — Transactions above threshold require owner approval
- **Reports** — Monthly breakdown by category and business
- **Multi-currency** — GHS, USD, CNY, GBP, NGN, CDF supported
- **Offline support** — Transactions saved locally when offline, auto-sync when back online
- **Dark mode** — Full dark theme support

### Business-Specific Features (Working)
- **Machinery:** Asset tracking with cost lines (purchase, shipping, clearing, transport, storage), lease contracts, payment tracking
- **Gold (Agent/Owner):** Lot tracking with funding, grams received, sale values, agent performance
- **Spare Parts:** Inventory with quantities, reorder levels, movement history
- **Fuel:** Weekly summary with owner/partner share splits, variance detection

### Tech Stack
- **Frontend:** React 18 + TypeScript, Tailwind CSS, Shadcn/ui components, Wouter router, TanStack React Query
- **Backend:** Express.js + TypeScript
- **Database:** PostgreSQL via Supabase, Drizzle ORM
- **Hosting:** Railway (backend + frontend served together)
- **Charts:** Recharts

---

## What Needs To Be Built (Development Roadmap)

**Read this entire section before writing any code.**

The roadmap follows the scale philosophy: each level makes the app useful to a larger audience without making it confusing for the smaller user. **Never add complexity to the surface. Always add clarity.**

### Level 3 Completion (Current Priority)

These features complete the "smart business manager" level. After this, any small-to-medium business can use AMT as their primary financial tool.

#### 3.1 Invoicing (Accounts Receivable)
**Why:** When a business sells on credit, the owner needs to know who owes them and how much. Right now there's no way to track "I sold goods worth GHS 5,000 to Kofi but he hasn't paid yet."

**What to build:**
- Invoice creation: customer, items/description, amount, due date, payment terms
- Invoice status: draft, sent, partially paid, paid, overdue
- Invoice list page with filters (status, customer, date range, business)
- Auto-link invoice payments to Money In transactions
- Dashboard widget: "Outstanding receivables: GHS XX,XXX"
- Overdue invoice alerts

**Design rule:** An invoice is NOT an accounting journal. It is a promise of payment. When payment arrives, the owner records a Money In transaction and links it to the invoice. The system updates the invoice status automatically.

#### 3.2 Bills (Accounts Payable)
**Why:** Same as invoicing but in reverse. "I received goods from supplier but haven't paid yet."

**What to build:**
- Bill creation: supplier, description, amount, due date
- Bill status: pending, partially paid, paid, overdue
- Bill list page with filters
- Auto-link bill payments to Money Out transactions
- Dashboard widget: "Bills due this week: GHS XX,XXX"
- Overdue bill alerts

#### 3.3 Bank Reconciliation
**Why:** The bank says you have GHS 50,000. Your books say GHS 48,500. Where is the GHS 1,500 difference? Without reconciliation, the owner can never trust the numbers.

**What to build:**
- Upload or manually enter bank statement lines (date, description, amount)
- Side-by-side matching: bank statement line <-> app transaction
- Auto-match by amount + date proximity
- Manual match for the rest
- Show unmatched items on both sides
- Reconciliation summary: matched, unmatched bank items, unmatched book items

**Design rule:** Keep it visual. Green = matched. Red = unmatched. The owner should see at a glance whether the books are clean.

#### 3.4 Recurring Transactions
**Why:** Rent is GHS 3,000 every month. Salaries are GHS 15,000 every two weeks. The owner should not have to enter these manually each time.

**What to build:**
- Create recurring template: amount, direction, category, business, frequency (weekly/monthly/quarterly)
- Auto-generate transactions on schedule (or prompt for confirmation)
- List of active recurring items with next due date
- Pause/resume/delete recurring items

#### 3.5 Budget vs Actual
**Why:** "I planned to spend GHS 20,000 on fuel this month but I've already spent GHS 28,000." Without budgets, there is no financial discipline.

**What to build:**
- Set monthly budget per category per business
- Reports page shows: Budget | Actual | Variance for each category
- Dashboard alert when spending exceeds budget threshold (e.g., 80%)
- Simple bar chart: budget vs actual side by side

---

### Level 4: Full Accounting Engine

These features transform AMT from a money tracker into a proper accounting system. **Do not build these until Level 3 is complete and tested.** These features require careful design because they affect every transaction in the system.

#### 4.1 Chart of Accounts
**Why:** Every real accounting system organizes money into a tree: Assets > Bank > GCB Bank. This structure makes financial statements possible.

**What to build:**
- Standard chart: Assets, Liabilities, Equity, Revenue, Expenses
- Each existing category maps to an account
- Each bank account maps to an asset account
- Owner can add custom accounts
- Account codes (e.g., 1000 = Assets, 1100 = Cash, 1200 = Bank)

**Design rule:** The owner NEVER sees account codes unless they want to. The system uses them internally. The dashboard still says "Money In" and "Money Out."

#### 4.2 Double-Entry Bookkeeping
**Why:** Every Money In is actually: Debit Bank, Credit Revenue. Every Money Out is: Debit Expense, Credit Bank. Without this, you cannot produce a balance sheet.

**What to build:**
- Every transaction auto-generates two journal lines (debit + credit)
- The existing Money In / Money Out UI does NOT change — the double entry happens silently in the backend
- Journal entries page for accountants who want to see the full picture
- Trial balance: sum of all debits must equal sum of all credits

**Design rule:** This is the most important rule in this entire document: **The owner's experience does not change.** They still tap Money In, enter amount, pick business, done. The accountant can toggle "Show journal view" to see the debit/credit lines. Two views of the same data.

#### 4.3 Financial Statements
**Why:** The three reports every business needs: Balance Sheet (what do I own and owe?), Profit & Loss (am I making money?), Cash Flow (where is the cash going?).

**What to build:**
- Balance Sheet: Assets - Liabilities = Equity, auto-calculated from chart of accounts
- Profit & Loss: Revenue - Expenses = Net Profit, by period
- Cash Flow Statement: Operating, Investing, Financing activities
- Export to PDF
- Compare periods (this month vs last month, this year vs last year)

#### 4.4 Tax Module
**Why:** Every country has tax obligations. Ghana has VAT (15%), NHIL (2.5%), GETFund (2.5%), COVID levy (1%). Other countries have GST, sales tax, etc.

**What to build:**
- Configurable tax rates per country/region
- Tax-inclusive and tax-exclusive pricing
- Tax on invoices and bills
- Tax summary report for filing
- Tax period tracking

**Design rule:** Tax configuration should be a one-time setup. After that, the system applies it automatically. The owner sees "Total: GHS 1,000 (incl. VAT)" — not a tax calculation spreadsheet.

#### 4.5 Multi-Currency with Exchange Rates
**Why:** Currently the app stores amounts in different currencies but cannot convert between them. A business that buys in USD and sells in GHS needs to see profit in one currency.

**What to build:**
- Exchange rate table (manual entry or API-fed)
- Base currency setting per business
- Automatic conversion for reports and dashboard totals
- Realized/unrealized gain/loss on currency transactions

---

### Level 5: Platform & SaaS

**Do not build any of this until Level 4 is fully operational.**

#### 5.1 AMT Personal
- Same core engine, simplified interface
- No businesses — just personal categories (Food, Transport, Housing, Entertainment, Savings, etc.)
- Monthly spending breakdown
- Savings goals
- Bill reminders
- "Where did my salary go?" summary

#### 5.2 SaaS Multi-Tenancy
- Organization/tenant isolation
- Subscription tiers (Free: 1 business, Basic: 3 businesses, Pro: unlimited)
- Onboarding wizard
- Custom branding per tenant
- Admin console for managing tenants

#### 5.3 Advanced Features
- API for third-party integrations
- Mobile app (React Native, reusing component logic)
- Payroll module
- Inventory with barcode scanning
- Receipt OCR (photo to transaction)
- AI-powered categorization of transactions
- WhatsApp/SMS alerts

---

## For Developers: How To Contribute

### Before You Write Any Code

1. **Read this entire README.** Understand the vision. Understand the levels. Understand who the user is.
2. **Read DEVELOPMENT.md** for technical setup, file structure, and coding patterns.
3. **Ask yourself:** "Will a market trader in Accra understand what this button does?" If no, redesign it.
4. **Ask yourself:** "Will an accountant in London find this limiting?" If yes, add a power-user toggle, not a different screen.

### Development Principles

1. **Simplicity is not the absence of features. It is the absence of confusion.**
2. **Every screen answers one question.** Dashboard: "How is my money?" Transactions: "What happened?" Reports: "How did the month go?"
3. **Mobile-first.** Most users will use this on their phone. Every button must be thumb-reachable. Every form must work without a keyboard.
4. **Offline-capable.** Internet in many target markets is unreliable. The app must work without connection and sync when it returns.
5. **No data loss. Ever.** Soft-delete only. Audit trails for everything. Transactions are append-only.
6. **The owner sees plain language. The accountant sees accounting language. Same data, different views.**

### Getting Started

```bash
# Clone the repository
git clone https://github.com/kfrem/Ameb-Business-Manager.git
cd Ameb-Business-Manager

# Install dependencies
npm install

# Set up environment variables (copy and fill in your values)
# DATABASE_URL=your_supabase_postgres_connection_string
# SUPABASE_URL=your_supabase_project_url
# SUPABASE_ANON_KEY=your_supabase_anon_key

# Run the development server
npm run dev

# App will be available at http://localhost:5000
# Demo login: Phone 0201234567, PIN 1234 (Owner account)
```

### Project Structure

```
├── client/src/           # Frontend (React + TypeScript)
│   ├── pages/            # Full page components (Dashboard, NewEntry, etc.)
│   ├── components/       # Reusable UI components
│   │   ├── dashboard/    # Dashboard-specific (BusinessTile, MoneyOverview)
│   │   ├── forms/        # Form components (AmountInput, NumericKeypad)
│   │   ├── charts/       # Chart components (BarChart, DonutChart)
│   │   ├── layout/       # Layout components (Header, BottomNav)
│   │   └── ui/           # Shadcn/ui primitives (Button, Card, Select, etc.)
│   ├── contexts/         # React contexts (Auth, Theme)
│   ├── hooks/            # Custom React hooks
│   └── lib/              # Utilities (API client, offline queue, constants)
├── server/               # Backend (Express + TypeScript)
│   ├── index.ts          # App entry, middleware, migration runner
│   ├── routes.ts         # All API endpoints
│   ├── storage.ts        # Database access layer (all CRUD operations)
│   ├── db.ts             # Database connection + runtime migrations
│   └── seed.ts           # Demo data seeding
├── shared/               # Shared between frontend and backend
│   └── schema.ts         # Database schema (Drizzle ORM) + Zod validation
└── package.json
```

---

## License

Proprietary. All rights reserved.

---

*Built with clarity. Built for everyone.*
