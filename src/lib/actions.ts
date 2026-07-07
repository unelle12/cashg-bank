"use server"

import { createClient, createServiceClient } from "@/lib/supabase"

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase.from("users").select("*").eq("id", user.id).single()
  return data
}

export async function getRecentTransactions(userId: string, limit = 5) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("transactions")
    .select("*")
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(limit)
  return data ?? []
}

export async function searchUsers(query: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("users")
    .select("id, name, email, phone")
    .or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(10)
  return data ?? []
}

export async function sendMoney(receiverId: string, amount: number, description?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data: sender } = await supabase.from("users").select("*").eq("id", user.id).single()
  if (!sender) throw new Error("Sender not found")
  if (sender.balance < amount) throw new Error("Insufficient balance")

  const { data: receiver } = await supabase.from("users").select("*").eq("id", receiverId).single()
  if (!receiver) throw new Error("Recipient not found")

  const svc = createServiceClient()

  const { error: deductErr } = await svc
    .from("users")
    .update({ balance: sender.balance - amount })
    .eq("id", sender.id)
  if (deductErr) throw deductErr

  const { error: creditErr } = await svc
    .from("users")
    .update({ balance: receiver.balance + amount })
    .eq("id", receiver.id)
  if (creditErr) throw creditErr

  const { error: txnErr } = await svc.from("transactions").insert([
    { sender_id: sender.id, receiver_id: receiver.id, amount, type: "send", description: description ?? null },
    { sender_id: sender.id, receiver_id: receiver.id, amount, type: "receive", description: description ?? null },
  ])
  if (txnErr) throw txnErr

  return { success: true }
}

export async function getBillProviders() {
  const supabase = await createClient()
  const { data } = await supabase.from("bill_providers").select("*").order("name")
  return data ?? []
}

export async function payBill(providerId: string, accountNumber: string, amount: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data: currentUser } = await supabase.from("users").select("*").eq("id", user.id).single()
  if (!currentUser) throw new Error("User not found")
  if (currentUser.balance < amount) throw new Error("Insufficient balance")

  const { error: deductErr } = await supabase
    .from("users")
    .update({ balance: currentUser.balance - amount })
    .eq("id", currentUser.id)
  if (deductErr) throw deductErr

  const { error: billErr } = await supabase.from("bill_payments").insert({
    user_id: currentUser.id,
    provider_id: providerId,
    account_number: accountNumber,
    amount,
    status: "paid",
  })
  if (billErr) throw billErr

  const { error: txnErr } = await supabase.from("transactions").insert({
    sender_id: currentUser.id,
    amount,
    type: "bill_payment",
    description: `Bill payment - ${accountNumber}`,
  })
  if (txnErr) throw txnErr

  return { success: true }
}

export async function deposit(amount: number) {
  const supabase = await createClient()
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
  const supabase = await createClient()
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

export async function getAllUserTransactions(userId: string, typeFilter?: string) {
  const supabase = await createClient()
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

export async function getAllUsers() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data: currentUser } = await supabase.from("users").select("role").eq("id", user.id).single()
  if (currentUser?.role !== "admin") throw new Error("Not authorized")

  const { data } = await supabase.from("users").select("*").order("created_at", { ascending: false })
  return data ?? []
}

export async function getAllTransactionsAdmin() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("transactions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100)
  return data ?? []
}
