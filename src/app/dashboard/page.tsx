import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import BalanceCard from "@/components/balance-card"
import TransactionList from "@/components/transaction-list"
import { getCurrentUser, getRecentTransactions } from "@/lib/actions"

export default async function DashboardPage() {
  const supabase = await createClient()
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
        <Link href="/send" className={cn(buttonVariants())}>Send Money</Link>
        <Link href="/bills" className={cn(buttonVariants({ variant: "outline" }))}>Pay Bills</Link>
        <Link href="/account" className={cn(buttonVariants({ variant: "outline" }))}>Account</Link>
        <Link href="/history" className={cn(buttonVariants({ variant: "outline" }))}>History</Link>
      </div>
      <div>
        <h2 className="text-lg font-semibold mb-3">Recent Activity</h2>
        <TransactionList transactions={transactions} />
      </div>
    </div>
  )
}
