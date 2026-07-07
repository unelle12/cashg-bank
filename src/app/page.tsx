import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
      <h1 className="text-5xl font-bold mb-4">CashG Bank</h1>
      <p className="text-xl text-muted-foreground mb-8 max-w-md">
        Send money, pay bills, and manage your finances — all in one place.
      </p>
      <div className="flex gap-4">
        <Link href="/signup" className={cn(buttonVariants({ size: "lg" }))}>Get Started</Link>
        <Link href="/login" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>Sign In</Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-3xl">
        <div className="p-6 border rounded-lg">
          <h3 className="font-semibold mb-2">Send Money</h3>
          <p className="text-sm text-muted-foreground">Instant transfers to any CashG user</p>
        </div>
        <div className="p-6 border rounded-lg">
          <h3 className="font-semibold mb-2">Pay Bills</h3>
          <p className="text-sm text-muted-foreground">Electric, water, internet and more</p>
        </div>
        <div className="p-6 border rounded-lg">
          <h3 className="font-semibold mb-2">Bank Account</h3>
          <p className="text-sm text-muted-foreground">Deposit, withdraw, track your balance</p>
        </div>
      </div>
    </div>
  )
}
