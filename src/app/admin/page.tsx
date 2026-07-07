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
