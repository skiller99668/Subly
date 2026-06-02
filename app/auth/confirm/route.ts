import { type EmailOtpType } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/utils/supabase-server"

// Handles the email-verification link from the "Confirm signup" template.
// Supabase points the link here with a token_hash; verifyOtp marks the email
// as confirmed and sets the session cookie. Using token_hash (rather than the
// PKCE ?code=) means the link works even if it's opened on a different device
// than the one the user signed up on.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const next = searchParams.get("next") ?? "/"

  if (token_hash && type) {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })

    if (!error) {
      // Verified and signed in — send them into the app.
      return NextResponse.redirect(`${origin}${next}`)
    }

    return NextResponse.redirect(
      `${origin}/auth?error=${encodeURIComponent(error.message)}`
    )
  }

  return NextResponse.redirect(
    `${origin}/auth?error=${encodeURIComponent("Invalid or expired verification link")}`
  )
}
