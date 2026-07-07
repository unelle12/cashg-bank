"use client"

import { useState, useEffect } from "react"
import { deposit, withdraw, getCurrentUser } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AccountPage() {
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
