import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/utils/supabase-server"

// GET /api/users/[id]
// Public: a user's profile plus the listings they've posted (newest first).
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()

    const { data: user, error: userError } = await supabase
      .from("users")
      .select(
        "id, name, username, avatar_url, bio, location_name, email, created_at"
      )
      .eq("id", id)
      .maybeSingle()

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 })
    }
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { data: listings, error: listingsError } = await supabase
      .from("listings")
      .select("*")
      .eq("user_id", id)
      .order("created_at", { ascending: false })

    if (listingsError) {
      return NextResponse.json({ error: listingsError.message }, { status: 500 })
    }

    return NextResponse.json({ user, listings: listings ?? [] })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    )
  }
}
