# CashG Bank — Prototype Design

## Overview
A GCash-inspired fintech prototype (demo only, no real money/banking) built with Next.js 14+ App Router and Supabase. Features simulated money transfers, bill payments, account management, and admin tools.

## Architecture
- **Framework:** Next.js 14+ App Router (TypeScript)
- **Database:** Supabase PostgreSQL
- **Auth:** Supabase email/password auth
- **UI:** Tailwind CSS + shadcn/ui components
- **Realtime:** Supabase Realtime for live transaction updates

## Routes / Pages

| Route | Purpose |
|-------|---------|
| `/` | Landing/welcome page |
| `/login` | Sign in |
| `/signup` | Create account |
| `/dashboard` | Home — balance, recent activity, quick actions |
| `/send` | Send money (user search, amount, optional QR) |
| `/bills` | Bill payment (providers, pay bill) |
| `/account` | View balance, deposit/withdraw (simulated) |
| `/history` | Transaction list with filter/search |
| `/admin` | Admin panel — manage users, view all txns |

## Database Schema

### users
- `id` uuid PK (Supabase Auth user id)
- `email` text
- `name` text
- `phone` text
- `balance` numeric (default 1000.00)
- `created_at` timestamptz

### transactions
- `id` uuid PK
- `sender_id` uuid FK → users.id (nullable for deposits)
- `receiver_id` uuid FK → users.id (nullable for withdrawals)
- `amount` numeric
- `type` text (send / receive / deposit / withdrawal / bill_payment)
- `description` text
- `created_at` timestamptz

### bill_providers
- `id` uuid PK
- `name` text
- `category` text (e.g. electricity, water, internet)
- `logo_url` text

### bill_payments
- `id` uuid PK
- `user_id` uuid FK → users.id
- `provider_id` uuid FK → bill_providers.id
- `account_number` text
- `amount` numeric
- `status` text (pending / paid / failed)
- `created_at` timestamptz

## Behaviors
- New users get ₱1,000 demo credit
- Sending money: deduct sender balance, credit receiver, create transaction record
- Bill payment: deduct balance, create bill_payment + transaction record
- Deposit/withdraw are simulated balance changes
- Admin can view all users and all transactions

## Error Handling
- Insufficient balance guard on send/bill-pay
- Auth middleware protects all routes except /, /login, /signup
- Admin routes check `role` column on users table (set to 'admin' manually or via seed)

## Auth & Roles
- Supabase email/password auth
- Users table has `role` column: 'user' or 'admin'
- Admin is set manually (Supabase dashboard or seed)
- Auth middleware redirects unauthenticated users to /login
- Admin pages check role and redirect non-admins to /dashboard

## Testing
- Basic demo script showing core flows

## Non-goals (prototype)
- No real money movement
- No KYC/compliance
- No real bank integration
- No push notifications
- No multi-currency
