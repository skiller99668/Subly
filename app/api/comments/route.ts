import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/utils/supabase-server"

// Embed the comment author's public profile.
const COMMENT_SELECT =
  "*, author:users!author_id(id, name, username, avatar_url)"

// GET /api/comments?listing_id=<listingId>
// Public: returns a listing's comments, newest first.
export async function GET(request: NextRequest) {
  try {
    const listingId = request.nextUrl.searchParams.get("listing_id")
    if (!listingId) {
      return NextResponse.json(
        { error: "listing_id is required" },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from("comments")
      .select(COMMENT_SELECT)
      .eq("listing_id", listingId)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const comments = data ?? []
    return NextResponse.json({ comments, count: comments.length })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    )
  }
}

// POST /api/comments  { listing_id, content }
// Creates a comment. The author is taken from the session, never the body.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { listing_id, content } = body
    const trimmed = typeof content === "string" ? content.trim() : ""

    if (!listing_id) {
      return NextResponse.json(
        { error: "listing_id is required" },
        { status: 400 }
      )
    }
    if (!trimmed) {
      return NextResponse.json(
        { error: "Comment can't be empty" },
        { status: 400 }
      )
    }
    if (trimmed.length > 1000) {
      return NextResponse.json(
        { error: "Comment is too long (max 1000 characters)" },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("comments")
      .insert({ listing_id, author_id: user.id, content: trimmed })
      .select(COMMENT_SELECT)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE /api/comments?id=<commentId> — removes the caller's own comment.
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const id = request.nextUrl.searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 })
    }

    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", id)
      .eq("author_id", user.id)

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
