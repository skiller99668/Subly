import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/utils/supabase-server"

// Two FKs point at `users` (user_id = recipient, related_user_id = whoever
// caused it), so disambiguate the embed with the `!related_user_id` hint.
const NOTIFICATION_SELECT =
  "*, actor:users!related_user_id(id, name, username, avatar_url), listing:listings!related_listing_id(id, title)"

// Enough to fill the bell's dropdown without paging.
const FEED_LIMIT = 30

// GET /api/notifications — the caller's feed, newest first, plus unread count.
// Rows are written by database triggers (see database.sql), never by clients.
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Signed out isn't an error here — the bell just has nothing to show.
    if (!user) {
      return NextResponse.json({ notifications: [], unreadCount: 0 })
    }

    const { data, error } = await supabase
      .from("notifications")
      .select(NOTIFICATION_SELECT)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(FEED_LIMIT)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const notifications = data ?? []
    const unreadCount = notifications.filter((n) => !n.read_at).length

    return NextResponse.json({ notifications, unreadCount })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    )
  }
}

// PATCH /api/notifications  { id } | { all: true }
// Marks one notification read, or every unread one for the caller.
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { id, all } = body as { id?: string; all?: boolean }

    if (!id && !all) {
      return NextResponse.json(
        { error: "Pass an id, or all: true" },
        { status: 400 }
      )
    }

    // The user_id filter is belt-and-braces: RLS already scopes UPDATE to the
    // caller's own rows.
    let query = supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null)

    if (id) query = query.eq("id", id)

    const { error } = await query
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    )
  }
}
