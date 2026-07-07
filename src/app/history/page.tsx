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
        <Select value={filter} onValueChange={(v) => v && setFilter(v)}>
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
