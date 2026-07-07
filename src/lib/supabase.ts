import { createServerClient, createBrowserClient } from "@supabase/ssr"

// ponytail: lazy import to avoid breaking client components that import this module
export async function createClient() {
  const { cookies } = await import("next/headers")
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() {
          const cookieStore = await cookies()
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          // noop for server components
        },
      },
    }
  )
}

// Service role client for cross-user writes (send money, admin queries)
// RLS only allows users to update their own row; this bypasses RLS
export function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: { getAll: async () => [], setAll: () => {} },
    }
  )
}

export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
