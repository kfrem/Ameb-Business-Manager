# DEEBI Business Manager

## Overview
DEEBI is a mobile-first Progressive Web App (PWA) for business management in Ghana. It enables owners to track multiple businesses (Heavy Machinery, Gold Trading, Spare Parts, Fuel Station) with real-time visibility of cash flow, inventory, and alerts.

**Target Users:**
- Primary: Semi-literate/illiterate business owners who can use phone-style numeric keypads
- Secondary: Finance staff and accountants who record daily transactions

## Recent Changes
- February 2026: Initial MVP implementation
  - Complete PostgreSQL schema with 15+ tables
  - Mobile-first React frontend with phone keypad entry
  - Express backend with REST API
  - Demo data seeded with 7 users, 5 businesses, 120+ transactions

## Tech Stack
- **Frontend:** React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend:** Express.js + TypeScript
- **Database:** PostgreSQL with Drizzle ORM
- **State Management:** TanStack Query v5
- **Routing:** Wouter
- **Charts:** Recharts

## Project Structure
```
client/
├── src/
│   ├── components/
│   │   ├── dashboard/     # BusinessTile, MoneyOverview, AlertsList
│   │   ├── charts/        # DonutChart, BarChart
│   │   ├── forms/         # NumericKeypad, AmountInput
│   │   ├── layout/        # Header, BottomNav
│   │   └── ui/            # shadcn components
│   ├── contexts/          # AuthContext, ThemeContext
│   ├── pages/             # Login, Dashboard, NewEntry, etc.
│   └── lib/               # queryClient, utils, constants
server/
├── db.ts                  # Database connection
├── routes.ts              # API endpoints
├── storage.ts             # Data access layer
├── seed.ts                # Demo data seeding
└── middleware/auth.ts     # Authentication middleware
shared/
└── schema.ts              # Drizzle schema + Zod types
```

## Key Features

### Business Modules
1. **Heavy Machinery** - Track assets through pipeline (ordered→shipping→clearing→storage→sold/leased), cost breakdown, lease payments
2. **Gold (Agents)** - Fund agents, track lots, measure agent performance
3. **Gold (Owner)** - Direct purchase/sale tracking
4. **Spare Parts** - Inventory management, low stock alerts
5. **Fuel Station** - Weekly summaries, profit sharing, variance tracking

### User Roles (RBAC)
- **Owner** - Full access, approves transactions over threshold
- **Admin** - Manage all businesses, no approval rights
- **Staff** - Access to assigned businesses only
- **Partner** - Access to specific business (e.g., fuel partner)
- **Auditor** - Read-only access

### UI Features
- Large touch targets for mobile users
- Phone-style numeric keypad for amount entry
- 3-step transaction entry form
- Dashboard with 5 business tiles
- Charts (donut, bar) for visual reports
- Dark/light theme toggle

## Demo Accounts
| Name | Phone | PIN | Role |
|------|-------|-----|------|
| DEEBI Owner | 0201234567 | 1234 | owner |
| eACG Finance | 0202345678 | 1234 | admin |
| Machinery Accountant | 0203456789 | 1234 | staff |
| Gold Desk | 0204567890 | 1234 | staff |
| Spare Parts Clerk | 0205678901 | 1234 | staff |
| Fuel Partner | 0206789012 | 1234 | partner |
| Auditor | 0207890123 | 1234 | auditor |

## API Endpoints
- `POST /api/auth/login` - Login with phone/PIN
- `GET /api/dashboard` - Dashboard data with business stats
- `GET /api/businesses` - List all businesses
- `GET /api/businesses/:id/kpis` - Business KPIs
- `GET /api/transactions` - List transactions
- `POST /api/transactions` - Create transaction
- `GET /api/alerts` - List alerts
- `GET /api/approvals` - Pending approvals (owner)
- `GET /api/bank-accounts` - Bank account balances
- `GET /api/reports` - Monthly report data

## Development

### Running Locally
```bash
npm run dev
```

### Database
- Push schema: `npm run db:push`
- Seed runs automatically in development

### Currency
Default: GHS (Ghana Cedi). Also supports USD, CNY.

### Ghana Locations
Accra, Tema, Kumasi, Obuasi, Tamale, Sekondi-Takoradi, Sunyani, Cape Coast, Koforidua, Techiman

## User Preferences
- Mobile-first design with large fonts and touch targets
- Minimal text (1-2 words) with icons
- High contrast for outdoor use
- Simple charts (donut, bar) - avoid dense tables

## Assumptions (MVP)
- Authentication uses simple phone + PIN (no OTP in MVP)
- Offline support prepared but not fully implemented
- Single currency per transaction (no multi-currency)
- Attachment upload placeholder (file storage not connected)
