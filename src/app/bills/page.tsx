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
