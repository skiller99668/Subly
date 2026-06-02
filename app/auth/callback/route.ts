import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/utils/supabase-server"

// OAuth (Google) redirects here with a `?code=` that must be exchanged for a
// session server-side. The profile row in public.users is created
// automatically by the on_auth_user_created trigger, so there's nothing else
// to do here but set the session cookie and redirect home.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const errorDescription = searchParams.get("error_description")

  if (errorDescription) {
    return NextResponse.redirect(
      `${origin}/auth?error=${encodeURIComponent(errorDescription)}`
    )
  }

  if (code) {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      return NextResponse.redirect(
        `${origin}/auth?error=${encodeURIComponent(error.message)}`
      )
    }
  }

  return NextResponse.redirect(origin)
}
