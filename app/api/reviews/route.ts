import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/utils/supabase-server"

// Embed the review author's public profile. Two FKs point at `users`
// (author_id + subject_id), so disambiguate with the `!author_id` hint.
const REVIEW_SELECT =
  "*, author:users!author_id(id, name, username, avatar_url)"

// GET /api/reviews?subject_id=<userId>
// Public: returns a host's reviews plus aggregate rating and, when signed in,
// the caller's own review (so the UI can offer "edit" instead of "write").
export async function GET(request: NextRequest) {
  try {
    const subjectId = request.nextUrl.searchParams.get("subject_id")
    if (!subjectId) {
      return NextResponse.json({ error: "subject_id is required" }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from("reviews")
      .select(REVIEW_SELECT)
      .eq("subject_id", subjectId)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const reviews = data ?? []
    const count = reviews.length
    const average =
      count > 0 ? reviews.reduce((sum, r) => sum + (r.rating as number), 0) / count : 0

    const {
      data: { user },
    } = await supabase.auth.getUser()
    const mine = user ? reviews.find((r) => r.author_id === user.id) ?? null : null

    return NextResponse.json({ reviews, count, average, mine })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    )
  }
}

// POST /api/reviews  { subject_id, rating, comment }
// Creates or updates (upsert) the caller's review of a host. The author is
// taken from the session, never the body.
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
    const { subject_id, rating, comment } = body
    const numericRating = Math.round(Number(rating))

    if (!subject_id) {
      return NextResponse.json({ error: "subject_id is required" }, { status: 400 })
    }
    if (!numericRating || numericRating < 1 || numericRating > 5) {
      return NextResponse.json(
        { error: "Rating must be a whole number from 1 to 5" },
        { status: 400 }
      )
    }
    if (subject_id === user.id) {
      return NextResponse.json({ error: "You can't review yourself" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("reviews")
      .upsert(
        {
          subject_id,
          author_id: user.id,
          rating: numericRating,
          comment: typeof comment === "string" && comment.trim() ? comment.trim() : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "subject_id,author_id" }
      )
      .select(REVIEW_SELECT)
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

// DELETE /api/reviews?subject_id=<userId> — removes the caller's review of a host.
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const subjectId = request.nextUrl.searchParams.get("subject_id")
    if (!subjectId) {
      return NextResponse.json({ error: "subject_id is required" }, { status: 400 })
    }

    const { error } = await supabase
      .from("reviews")
      .delete()
      .eq("author_id", user.id)
      .eq("subject_id", subjectId)

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
