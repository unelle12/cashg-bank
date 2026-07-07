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
