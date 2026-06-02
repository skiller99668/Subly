import { cookies } from "next/headers"
import { createServerClient } from "@supabase/auth-helpers-nextjs"

// Cookie-based Supabase client for use inside Route Handlers / Server
// Components. Reads the session written by the browser client so that
// auth.uid() / getUser() resolve to the signed-in user and RLS is enforced.
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component where cookies are read-only;
            // safe to ignore — session refresh is handled elsewhere.
          }
        },
      },
    }
  )
}
