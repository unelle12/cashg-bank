import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { createClient } from "@/lib/supabase"
import Navbar from "@/components/navbar"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "CashG Bank",
  description: "Send money, pay bills, and manage your finances",
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Navbar user={user ? { email: user.email!, name: user.user_metadata?.name ?? "" } : null} />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  )
}
