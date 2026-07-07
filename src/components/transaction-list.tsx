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
