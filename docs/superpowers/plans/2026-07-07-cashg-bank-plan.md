# CashG Bank Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a GCash-inspired fintech prototype with simulated money transfers, bill payments, and account management.

**Architecture:** Next.js 14 App Router monolith with Supabase for auth, PostgreSQL database, and realtime. Server actions for all mutations. Tailwind + shadcn/ui for UI.

**Tech Stack:** Next.js 14+, TypeScript, Supabase (auth + postgres + realtime), Tailwind CSS, shadcn/ui

## Global Constraints

- All data is simulated — no real money movement, no bank integration
- TypeScript throughout, no `any` types on DB-facing code
- shadcn/ui components for all UI (install via `npx shadcn@latest add`)
- Supabase MCP tools available for schema management

---

### Task 1: Project Scaffolding + Dependencies

**Files:**
- Create: Full Next.js project via `create-next-app`
- Create: `src/lib/supabase.ts`
- Create: `src/lib/types.ts`
- Modify: `package.json` (deps added)

**Interfaces:**
- Consumes: Empty project folder
- Produces: `src/lib/supabase.ts` (server + browser Supabase clients), `src/lib/types.ts` (shared types)

- [ ] **Step 1: Scaffold Next.js project**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-turbopack
```

- [ ] **Step 2: Install additional deps**

```bash
npm install @supabase/supabase-js @supabase/ssr
npx shadcn@latest init -d
npx shadcn@latest add button card input label select table toast dropdown-menu avatar sheet
```

- [ ] **Step 3: Create Supabase clients**

`src/lib/supabase.ts`:
```typescript
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() {
          const cookieStore = await cookies()
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          // noop for server components
        },
      },
    }
  )
}

// Service role client for cross-user writes (send money, admin queries)
// RLS only allows users to update their own row; this bypasses RLS
export function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: { getAll: async () => [], setAll: () => {} },
    }
  )
}

export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 4: Create TypeScript types**

`src/lib/types.ts`:
```typescript
export type User = {
  id: string
  email: string
  name: string
  phone: string
  balance: number
  role: "user" | "admin"
  created_at: string
}

export type Transaction = {
  id: string
  sender_id: string | null
  receiver_id: string | null
  amount: number
  type: "send" | "receive" | "deposit" | "withdrawal" | "bill_payment"
  description: string | null
  created_at: string
}

export type BillProvider = {
  id: string
  name: string
  category: string
  logo_url: string | null
}

export type BillPayment = {
  id: string
  user_id: string
  provider_id: string
  account_number: string
  amount: number
  status: "pending" | "paid" | "failed"
  created_at: string
}
```

- [ ] **Step 5: Add .env.local template**

Create `.env.local` with placeholder values:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

- [ ] **Step 6: Commit**

```bash
git init && git add -A && git commit -m "feat: scaffold Next.js project with Supabase + shadcn"
```

---

### Task 2: Database Schema + Seed Data

**Files:**
- Create: `supabase/migrations/001_cashg_schema.sql`

**Interfaces:**
- Consumes: Supabase project (created/managed via MCP)
- Produces: Database tables with RLS policies, seed bill providers, seed admin user

- [ ] **Step 1: Apply migration (via Supabase MCP)**

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table (extends Supabase auth.users)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  phone text,
  balance numeric(12,2) not null default 1000.00,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

-- Transaction history
create table if not exists public.transactions (
  id uuid primary key default uuid_generate_v4(),
  sender_id uuid references public.users(id) on delete set null,
  receiver_id uuid references public.users(id) on delete set null,
  amount numeric(12,2) not null check (amount > 0),
  type text not null check (type in ('send', 'receive', 'deposit', 'withdrawal', 'bill_payment')),
  description text,
  created_at timestamptz not null default now()
);

-- Bill providers
create table if not exists public.bill_providers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text not null,
  logo_url text
);

-- Bill payments
create table if not exists public.bill_payments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  provider_id uuid not null references public.bill_providers(id),
  account_number text not null,
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_transactions_sender on public.transactions(sender_id);
create index if not exists idx_transactions_receiver on public.transactions(receiver_id);
create index if not exists idx_transactions_created on public.transactions(created_at desc);
create index if not exists idx_bill_payments_user on public.bill_payments(user_id);

-- Row Level Security
alter table public.users enable row level security;
alter table public.transactions enable row level security;
alter table public.bill_providers enable row level security;
alter table public.bill_payments enable row level security;

-- Users: users can read/update their own row; admins can read all
create policy "users_read_own" on public.users for select using (auth.uid() = id);
create policy "users_update_own" on public.users for update using (auth.uid() = id);
create policy "admin_read_all_users" on public.users for select using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

-- Transactions: users see their own; admins see all
create policy "users_read_own_transactions" on public.transactions for select using (
  auth.uid() = sender_id or auth.uid() = receiver_id
);
create policy "users_insert_transactions" on public.transactions for insert with check (
  auth.uid() = sender_id or auth.uid() = receiver_id
);
create policy "admin_read_all_transactions" on public.transactions for select using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

-- Bill providers: everyone can read
create policy "everyone_read_providers" on public.bill_providers for select using (true);

-- Bill payments: users see own; admins see all
create policy "users_read_own_bills" on public.bill_payments for select using (auth.uid() = user_id);
create policy "users_insert_bills" on public.bill_payments for insert with check (auth.uid() = user_id);
create policy "admin_read_all_bills" on public.bill_payments for select using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);
```

- [ ] **Step 2: Seed data via Supabase SQL**

```sql
-- Seed bill providers
insert into public.bill_providers (name, category) values
  ('Meralco', 'Electricity'),
  ('Maynilad', 'Water'),
  ('PLDT', 'Internet'),
  ('Globe', 'Telecom'),
  ('Smart', 'Telecom'),
  ('Manila Water', 'Water')
on conflict do nothing;
```

- [ ] **Step 3: Create trigger to auto-create public.users row on auth signup**

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.users (id, email, name, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'phone'
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add database schema, RLS, seed data"
```

---

### Task 3: Auth Pages + Middleware

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/app/signup/page.tsx`
- Create: `src/app/auth/callback/route.ts`
- Create: `src/middleware.ts`

**Interfaces:**
- Consumes: Supabase clients (Task 1), DB schema (Task 2)
- Produces: `/login`, `/signup` pages; auth middleware

- [ ] **Step 1: Middleware**

`src/middleware.ts`:
```typescript
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && !request.nextUrl.pathname.startsWith("/login") && !request.nextUrl.pathname.startsWith("/signup") && request.nextUrl.pathname !== "/") {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
```

- [ ] **Step 2: Login page**

`src/app/login/page.tsx`:
```typescript
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserSupabaseClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
    } else {
      router.push("/dashboard")
      router.refresh()
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl text-center">CashG Bank</CardTitle>
          <p className="text-sm text-muted-foreground text-center">Sign in to your account</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
            <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">Sign In</Button>
          </form>
          <p className="text-center text-sm mt-4">
            Don't have an account? <a href="/signup" className="text-primary underline">Sign up</a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Signup page**

`src/app/signup/page.tsx`:
```typescript
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserSupabaseClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, phone } },
    })
    if (error) {
      setError(error.message)
    } else {
      router.push("/dashboard")
      router.refresh()
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Create Account</CardTitle>
          <p className="text-sm text-muted-foreground text-center">Join CashG Bank</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <Input placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} required />
            <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
            <Input type="tel" placeholder="Phone" value={phone} onChange={e => setPhone(e.target.value)} />
            <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">Sign Up</Button>
          </form>
          <p className="text-center text-sm mt-4">
            Already have an account? <a href="/login" className="text-primary underline">Sign in</a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 4: Auth callback route**

`src/app/auth/callback/route.ts`:
```typescript
import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/dashboard"

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
        },
      }
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add auth pages and middleware"
```

---

### Task 4: Shared Layout + Navigation

**Files:**
- Create: `src/app/layout.tsx` (root layout with Supabase listener + navbar)
- Create: `src/components/navbar.tsx`

**Interfaces:**
- Consumes: Auth (Task 3)
- Produces: Root layout wrapping all pages with Navbar

- [ ] **Step 1: Navbar component**

`src/components/navbar.tsx`:
```typescript
"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { createBrowserSupabaseClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface NavbarProps {
  user: { email: string; name: string } | null
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <nav className="border-b bg-background">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href={user ? "/dashboard" : "/"} className="font-bold text-xl">CashG Bank</Link>
        {user ? (
          <div className="flex items-center gap-4">
            <Link href="/send" className="text-sm text-muted-foreground hover:text-foreground">Send</Link>
            <Link href="/bills" className="text-sm text-muted-foreground hover:text-foreground">Bills</Link>
            <Link href="/history" className="text-sm text-muted-foreground hover:text-foreground">History</Link>
            <Link href="/account" className="text-sm text-muted-foreground hover:text-foreground">Account</Link>
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild><Link href="/account">My Account</Link></DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" asChild><Link href="/login">Login</Link></Button>
            <Button asChild><Link href="/signup">Sign Up</Link></Button>
          </div>
        )}
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Root layout**

`src/app/layout.tsx`:
```typescript
import { createClient } from "@/lib/supabase"
import Navbar from "@/components/navbar"
import "./globals.css"

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <html lang="en">
      <body>
        <Navbar user={user ? { email: user.email!, name: user.user_metadata?.name ?? "" } : null} />
        <main>{children}</main>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add layout and navbar"
```

---

### Task 5: Landing Page

**Files:**
- Create: `src/app/page.tsx`

**Interfaces:**
- Consumes: Layout (Task 4)
- Produces: Landing/hero page

- [ ] **Step 1: Landing page**

`src/app/page.tsx`:
```typescript
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
      <h1 className="text-5xl font-bold mb-4">CashG Bank</h1>
      <p className="text-xl text-muted-foreground mb-8 max-w-md">
        Send money, pay bills, and manage your finances — all in one place.
      </p>
      <div className="flex gap-4">
        <Button size="lg" asChild><Link href="/signup">Get Started</Link></Button>
        <Button size="lg" variant="outline" asChild><Link href="/login">Sign In</Link></Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-3xl">
        <div className="p-6 border rounded-lg">
          <h3 className="font-semibold mb-2">Send Money</h3>
          <p className="text-sm text-muted-foreground">Instant transfers to any CashG user</p>
        </div>
        <div className="p-6 border rounded-lg">
          <h3 className="font-semibold mb-2">Pay Bills</h3>
          <p className="text-sm text-muted-foreground">Electric, water, internet and more</p>
        </div>
        <div className="p-6 border rounded-lg">
          <h3 className="font-semibold mb-2">Bank Account</h3>
          <p className="text-sm text-muted-foreground">Deposit, withdraw, track your balance</p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add landing page"
```

---

### Task 6: Dashboard Page

**Files:**
- Create: `src/app/dashboard/page.tsx`
- Create: `src/components/balance-card.tsx`
- Create: `src/components/transaction-list.tsx`
- Create: `src/lib/actions.ts` (add `getBalance`, `getRecentTransactions`)

**Interfaces:**
- Consumes: Auth (Task 3)
- Produces: Dashboard with balance, quick actions, recent transactions

- [ ] **Step 1: Server actions**

`src/lib/actions.ts`:
```typescript
"use server"

import { createClient } from "@/lib/supabase"

export async function getCurrentUser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase.from("users").select("*").eq("id", user.id).single()
  return data
}

export async function getRecentTransactions(userId: string, limit = 5) {
  const supabase = createClient()
  const { data } = await supabase
    .from("transactions")
    .select("*")
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(limit)
  return data ?? []
}
```

- [ ] **Step 2: Balance card component**

`src/components/balance-card.tsx`:
```typescript
import { Card, CardContent } from "@/components/ui/card"

export default function BalanceCard({ balance }: { balance: number }) {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
        <p className="text-4xl font-bold">₱{balance.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Transaction list component**

`src/components/transaction-list.tsx`:
```typescript
import type { Transaction } from "@/lib/types"

export default function TransactionList({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) return <p className="text-muted-foreground text-sm">No transactions yet.</p>

  return (
    <div className="space-y-2">
      {transactions.map(tx => (
        <div key={tx.id} className="flex items-center justify-between p-3 border rounded-lg">
          <div>
            <p className="font-medium capitalize">{tx.type.replace("_", " ")}</p>
            {tx.description && <p className="text-xs text-muted-foreground">{tx.description}</p>}
          </div>
          <p className={tx.type === "deposit" || tx.type === "receive" ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
            {tx.type === "deposit" || tx.type === "receive" ? "+" : "-"}₱{tx.amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
          </p>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Dashboard page**

`src/app/dashboard/page.tsx`:
```typescript
import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase"
import BalanceCard from "@/components/balance-card"
import TransactionList from "@/components/transaction-list"
import { Button } from "@/components/ui/button"
import { getCurrentUser, getRecentTransactions } from "@/lib/actions"

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const currentUser = await getCurrentUser()
  if (!currentUser) redirect("/login")

  const transactions = await getRecentTransactions(currentUser.id)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Welcome, {currentUser.name}</h1>
      <BalanceCard balance={currentUser.balance} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Button asChild><Link href="/send">Send Money</Link></Button>
        <Button asChild variant="outline"><Link href="/bills">Pay Bills</Link></Button>
        <Button asChild variant="outline"><Link href="/account">Account</Link></Button>
        <Button asChild variant="outline"><Link href="/history">History</Link></Button>
      </div>
      <div>
        <h2 className="text-lg font-semibold mb-3">Recent Activity</h2>
        <TransactionList transactions={transactions} />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add dashboard page"
```

---

### Task 7: Send Money Feature

**Files:**
- Create: `src/app/send/page.tsx`
- Modify: `src/lib/actions.ts` (add `sendMoney`, `searchUsers`)

**Interfaces:**
- Consumes: Auth (Task 3), Server actions (Task 6)
- Produces: `/send` page with user search + transfer form

- [ ] **Step 1: Add server actions**

Add to `src/lib/actions.ts`:
```typescript
export async function searchUsers(query: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from("users")
    .select("id, name, email, phone")
    .or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(10)
  return data ?? []
}

export async function sendMoney(receiverId: string, amount: number, description?: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data: sender } = await supabase.from("users").select("*").eq("id", user.id).single()
  if (!sender) throw new Error("Sender not found")
  if (sender.balance < amount) throw new Error("Insufficient balance")

  const { data: receiver } = await supabase.from("users").select("*").eq("id", receiverId).single()
  if (!receiver) throw new Error("Recipient not found")

  // Use service client for cross-user writes (RLS blocks crediting another user)
  const svc = createServiceClient()

  // Deduct from sender (works with user client too, but use svc for atomicity)
  const { error: deductErr } = await svc
    .from("users")
    .update({ balance: sender.balance - amount })
    .eq("id", sender.id)
  if (deductErr) throw deductErr

  // Credit receiver
  const { error: creditErr } = await svc
    .from("users")
    .update({ balance: receiver.balance + amount })
    .eq("id", receiver.id)
  if (creditErr) throw creditErr

  // Create transaction records
  const { error: txnErr } = await svc.from("transactions").insert([
    { sender_id: sender.id, receiver_id: receiver.id, amount, type: "send", description: description ?? null },
    { sender_id: sender.id, receiver_id: receiver.id, amount, type: "receive", description: description ?? null },
  ])
  if (txnErr) throw txnErr

  return { success: true }
}
```

- [ ] **Step 2: Send money page**

`src/app/send/page.tsx`:
```typescript
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { sendMoney, searchUsers } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function SendPage() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<{ id: string; name: string; phone: string | null }[]>([])
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null)
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleSearch = async () => {
    if (query.length < 2) return
    const users = await searchUsers(query)
    setResults(users)
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    setError("")
    try {
      await sendMoney(selected.id, parseFloat(amount), description)
      setSuccess(true)
      setTimeout(() => router.push("/dashboard"), 1500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send money")
    }
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto px-4 py-8 text-center">
        <h2 className="text-2xl font-bold text-green-600 mb-2">Sent Successfully!</h2>
        <p className="text-muted-foreground">₱{parseFloat(amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })} to {selected?.name}</p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Send Money</CardTitle>
        </CardHeader>
        <CardContent>
          {!selected ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input placeholder="Search by name, email, or phone" value={query} onChange={e => setQuery(e.target.value)} />
                <Button onClick={handleSearch}>Search</Button>
              </div>
              <div className="space-y-2">
                {results.map(u => (
                  <div key={u.id} className="p-3 border rounded-lg cursor-pointer hover:bg-accent" onClick={() => setSelected(u)}>
                    <p className="font-medium">{u.name}</p>
                    {u.phone && <p className="text-sm text-muted-foreground">{u.phone}</p>}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSend} className="space-y-4">
              <p className="text-sm">Sending to: <span className="font-medium">{selected.name}</span></p>
              <Input type="number" placeholder="Amount (₱)" value={amount} onChange={e => setAmount(e.target.value)} required min="1" step="0.01" />
              <Input placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setSelected(null)}>Back</Button>
                <Button type="submit" className="flex-1">Send</Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add send money feature"
```

---

### Task 8: Bill Payments

**Files:**
- Create: `src/app/bills/page.tsx`
- Modify: `src/lib/actions.ts` (add `getBillProviders`, `payBill`)

**Interfaces:**
- Consumes: Auth (Task 3), Server actions (Task 6)
- Produces: `/bills` page with provider list + pay form

- [ ] **Step 1: Add server actions**

Add to `src/lib/actions.ts`:
```typescript
export async function getBillProviders() {
  const supabase = createClient()
  const { data } = await supabase.from("bill_providers").select("*").order("name")
  return data ?? []
}

export async function payBill(providerId: string, accountNumber: string, amount: number) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data: currentUser } = await supabase.from("users").select("*").eq("id", user.id).single()
  if (!currentUser) throw new Error("User not found")
  if (currentUser.balance < amount) throw new Error("Insufficient balance")

  // Deduct
  const { error: deductErr } = await supabase
    .from("users")
    .update({ balance: currentUser.balance - amount })
    .eq("id", currentUser.id)
  if (deductErr) throw deductErr

  // Record bill payment
  const { error: billErr } = await supabase.from("bill_payments").insert({
    user_id: currentUser.id,
    provider_id: providerId,
    account_number: accountNumber,
    amount,
    status: "paid",
  })
  if (billErr) throw billErr

  // Record transaction
  const { error: txnErr } = await supabase.from("transactions").insert({
    sender_id: currentUser.id,
    amount,
    type: "bill_payment",
    description: `Bill payment - ${accountNumber}`,
  })
  if (txnErr) throw txnErr

  return { success: true }
}
```

- [ ] **Step 2: Bills page**

`src/app/bills/page.tsx`:
```typescript
"use client"

import { useState, useEffect } from "react"
import { getBillProviders, payBill } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { BillProvider } from "@/lib/types"

export default function BillsPage() {
  const [providers, setProviders] = useState<BillProvider[]>([])
  const [selected, setSelected] = useState<BillProvider | null>(null)
  const [accountNumber, setAccountNumber] = useState("")
  const [amount, setAmount] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  useEffect(() => { getBillProviders().then(setProviders) }, [])

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    setError("")
    try {
      await payBill(selected.id, accountNumber, parseFloat(amount))
      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Payment failed")
    }
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto px-4 py-8 text-center">
        <h2 className="text-2xl font-bold text-green-600 mb-2">Bill Paid!</h2>
        <Button onClick={() => { setSuccess(false); setSelected(null) }}>Pay Another</Button>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>{selected ? `Pay ${selected.name}` : "Pay Bills"}</CardTitle>
        </CardHeader>
        <CardContent>
          {!selected ? (
            <div className="space-y-2">
              {providers.map(p => (
                <div key={p.id} className="p-3 border rounded-lg cursor-pointer hover:bg-accent" onClick={() => setSelected(p)}>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.category}</p>
                </div>
              ))}
            </div>
          ) : (
            <form onSubmit={handlePay} className="space-y-4">
              <p className="text-sm">Provider: <span className="font-medium">{selected.name}</span></p>
              <Input placeholder="Account Number" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} required />
              <Input type="number" placeholder="Amount (₱)" value={amount} onChange={e => setAmount(e.target.value)} required min="1" step="0.01" />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setSelected(null)}>Back</Button>
                <Button type="submit" className="flex-1">Pay</Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add bill payments"
```

---

### Task 9: Account Management (Deposit / Withdraw)

**Files:**
- Create: `src/app/account/page.tsx`
- Modify: `src/lib/actions.ts` (add `deposit`, `withdraw`)

**Interfaces:**
- Consumes: Auth (Task 3), Server actions (Task 6)
- Produces: `/account` page with balance, deposit/withdraw

- [ ] **Step 1: Add server actions**

Add to `src/lib/actions.ts`:
```typescript
export async function deposit(amount: number) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data: currentUser } = await supabase.from("users").select("*").eq("id", user.id).single()
  if (!currentUser) throw new Error("User not found")

  const { error: updateErr } = await supabase
    .from("users")
    .update({ balance: currentUser.balance + amount })
    .eq("id", currentUser.id)
  if (updateErr) throw updateErr

  const { error: txnErr } = await supabase.from("transactions").insert({
    receiver_id: currentUser.id,
    amount,
    type: "deposit",
    description: "Cash deposit",
  })
  if (txnErr) throw txnErr

  return { success: true, newBalance: currentUser.balance + amount }
}

export async function withdraw(amount: number) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data: currentUser } = await supabase.from("users").select("*").eq("id", user.id).single()
  if (!currentUser) throw new Error("User not found")
  if (currentUser.balance < amount) throw new Error("Insufficient balance")

  const { error: updateErr } = await supabase
    .from("users")
    .update({ balance: currentUser.balance - amount })
    .eq("id", currentUser.id)
  if (updateErr) throw updateErr

  const { error: txnErr } = await supabase.from("transactions").insert({
    sender_id: currentUser.id,
    amount,
    type: "withdrawal",
    description: "Cash withdrawal",
  })
  if (txnErr) throw txnErr

  return { success: true, newBalance: currentUser.balance - amount }
}
```

- [ ] **Step 2: Account page**

`src/app/account/page.tsx`:
```typescript
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { deposit, withdraw, getCurrentUser } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AccountPage() {
  const router = useRouter()
  const [user, setUser] = useState<Awaited<ReturnType<typeof getCurrentUser>>>(null)
  const [amount, setAmount] = useState("")
  const [mode, setMode] = useState<"deposit" | "withdraw" | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => { getCurrentUser().then(setUser) }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mode) return
    setError("")
    setSuccess("")
    try {
      const fn = mode === "deposit" ? deposit : withdraw
      const result = await fn(parseFloat(amount))
      setSuccess(`${mode === "deposit" ? "Deposited" : "Withdrawn"} successfully! New balance: ₱${result.newBalance.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`)
      setMode(null)
      setAmount("")
      getCurrentUser().then(setUser)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed")
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Current Balance</p>
            <p className="text-4xl font-bold">₱{user?.balance.toLocaleString("en-PH", { minimumFractionDigits: 2 }) ?? "—"}</p>
          </div>
          <div className="flex gap-3">
            <Button className="flex-1" onClick={() => setMode("deposit")}>Deposit</Button>
            <Button className="flex-1" variant="outline" onClick={() => setMode("withdraw")}>Withdraw</Button>
          </div>
        </CardContent>
      </Card>

      {mode && (
        <Card>
          <CardHeader>
            <CardTitle className="capitalize">{mode}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input type="number" placeholder="Amount (₱)" value={amount} onChange={e => setAmount(e.target.value)} required min="1" step="0.01" />
              {error && <p className="text-sm text-destructive">{error}</p>}
              {success && <p className="text-sm text-green-600">{success}</p>}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setMode(null)}>Cancel</Button>
                <Button type="submit" className="flex-1" variant={mode === "withdraw" ? "destructive" : "default"}>
                  Confirm {mode === "deposit" ? "Deposit" : "Withdrawal"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add account page with deposit/withdraw"
```

---

### Task 10: Transaction History

**Files:**
- Create: `src/app/history/page.tsx`
- Modify: `src/lib/actions.ts` (add `getAllUserTransactions`)

**Interfaces:**
- Consumes: Auth (Task 3), Server actions (Task 6)
- Produces: `/history` page with filters

- [ ] **Step 1: Add server action**

Add to `src/lib/actions.ts`:
```typescript
export async function getAllUserTransactions(userId: string, typeFilter?: string) {
  const supabase = createClient()
  let query = supabase
    .from("transactions")
    .select("*")
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order("created_at", { ascending: false })

  if (typeFilter && typeFilter !== "all") {
    query = query.eq("type", typeFilter)
  }

  const { data } = await query
  return data ?? []
}
```

- [ ] **Step 2: History page**

`src/app/history/page.tsx`:
```typescript
"use client"

import { useState, useEffect } from "react"
import { getAllUserTransactions, getCurrentUser } from "@/lib/actions"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import type { Transaction } from "@/lib/types"

export default function HistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filter, setFilter] = useState("all")
  const [search, setSearch] = useState("")

  const load = async () => {
    const user = await getCurrentUser()
    if (user) setTransactions(await getAllUserTransactions(user.id, filter))
  }

  useEffect(() => { load() }, [filter])

  const filtered = transactions.filter(tx =>
    !search || tx.description?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold">Transaction History</h1>

      <div className="flex gap-3">
        <Input placeholder="Search transactions..." value={search} onChange={e => setSearch(e.target.value)} />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="send">Sent</SelectItem>
            <SelectItem value="receive">Received</SelectItem>
            <SelectItem value="deposit">Deposits</SelectItem>
            <SelectItem value="withdrawal">Withdrawals</SelectItem>
            <SelectItem value="bill_payment">Bill Payments</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {filtered.map(tx => (
          <div key={tx.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium capitalize">{tx.type.replace("_", " ")}</p>
              {tx.description && <p className="text-xs text-muted-foreground">{tx.description}</p>}
              <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</p>
            </div>
            <p className={
              tx.type === "deposit" || tx.type === "receive"
                ? "text-green-600 font-medium"
                : "text-red-600 font-medium"
            }>
              {tx.type === "deposit" || tx.type === "receive" ? "+" : "-"}₱{tx.amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </p>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-muted-foreground text-sm">No transactions found.</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add transaction history page"
```

---

### Task 11: Admin Panel

**Files:**
- Create: `src/app/admin/page.tsx`
- Modify: `src/lib/actions.ts` (add `getAllUsers`, `getAllTransactionsAdmin`)

**Interfaces:**
- Consumes: Auth (Task 3), Server actions (Task 6)
- Produces: `/admin` page with user list + all transactions

- [ ] **Step 1: Add server actions**

Add to `src/lib/actions.ts`:
```typescript
export async function getAllUsers() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data: currentUser } = await supabase.from("users").select("role").eq("id", user.id).single()
  if (currentUser?.role !== "admin") throw new Error("Not authorized")

  const { data } = await supabase.from("users").select("*").order("created_at", { ascending: false })
  return data ?? []
}

export async function getAllTransactionsAdmin() {
  const supabase = createClient()
  const { data } = await supabase
    .from("transactions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100)
  return data ?? []
}
```

- [ ] **Step 2: Admin page**

`src/app/admin/page.tsx`:
```typescript
"use client"

import { useState, useEffect } from "react"
import { getAllUsers, getAllTransactionsAdmin, getCurrentUser } from "@/lib/actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { User, Transaction } from "@/lib/types"

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [error, setError] = useState("")

  useEffect(() => {
    getCurrentUser().then(u => {
      if (u?.role !== "admin") {
        setError("Not authorized")
        return
      }
      getAllUsers().then(setUsers)
      getAllTransactionsAdmin().then(setTransactions)
    })
  }, [])

  if (error) return <div className="max-w-4xl mx-auto px-4 py-8 text-center text-destructive">{error}</div>

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold">Admin Panel</h1>

      <Card>
        <CardHeader><CardTitle>Users ({users.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(u => (
                <TableRow key={u.id}>
                  <TableCell>{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.phone ?? "—"}</TableCell>
                  <TableCell>₱{u.balance.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="capitalize">{u.role}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>All Transactions (last 100)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map(tx => (
                <TableRow key={tx.id}>
                  <TableCell className="capitalize">{tx.type.replace("_", " ")}</TableCell>
                  <TableCell>₱{tx.amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell>{tx.description ?? "—"}</TableCell>
                  <TableCell>{new Date(tx.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add admin panel"
```
