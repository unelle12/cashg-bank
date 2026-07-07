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
