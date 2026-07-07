"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { createBrowserSupabaseClient } from "@/lib/supabase"
import { buttonVariants } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface NavbarProps {
  user: { email: string; name: string } | null
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <nav className="border-b bg-background">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href={user ? "/dashboard" : "/"} className="font-bold text-xl">CashG Bank</Link>
        {user ? (
          <div className="flex items-center gap-4">
            <Link href="/send" className="text-sm text-muted-foreground hover:text-foreground">Send</Link>
            <Link href="/bills" className="text-sm text-muted-foreground hover:text-foreground">Bills</Link>
            <Link href="/history" className="text-sm text-muted-foreground hover:text-foreground">History</Link>
            <Link href="/account" className="text-sm text-muted-foreground hover:text-foreground">Account</Link>
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push("/account")}>My Account</DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="flex gap-2">
            <Link href="/login" className={cn(buttonVariants({ variant: "outline" }))}>Login</Link>
            <Link href="/signup" className={cn(buttonVariants())}>Sign Up</Link>
          </div>
        )}
      </div>
    </nav>
  )
}
