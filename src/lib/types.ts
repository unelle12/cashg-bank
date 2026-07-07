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
