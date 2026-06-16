import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/utils/supabase-server"

const SELECT =
  "*, author:users!author_id(id, name, username, avatar_url)"

// GET /api/property-reviews?listing_id=<id>
export async function GET(request: NextRequest) {
  try {
    const listingId = request.nextUrl.searchParams.get("listing_id")
    if (!listingId) {
      return NextResponse.json({ error: "listing_id is required" }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from("property_reviews")
      .select(SELECT)
      .eq("listing_id", listingId)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const reviews = data ?? []
    const count = reviews.length
    const average =
      count > 0
        ? reviews.reduce((sum, r) => sum + (r.rating as number), 0) / count
        : 0

    return NextResponse.json({ reviews, count, average })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    )
  }
}

// POST /api/property-reviews  { listing_id, rating, comment }
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
    const { listing_id, rating, comment } = body
    const numericRating = Math.round(Number(rating))

    if (!listing_id) {
      return NextResponse.json({ error: "listing_id is required" }, { status: 400 })
    }
    if (!numericRating || numericRating < 1 || numericRating > 5) {
      return NextResponse.json(
        { error: "Rating must be a whole number from 1 to 5" },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("property_reviews")
      .insert({
        listing_id,
        author_id: user.id,
        rating: numericRating,
        comment:
          typeof comment === "string" && comment.trim() ? comment.trim() : null,
      })
      .select(SELECT)
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

// DELETE /api/property-reviews?id=<reviewId>
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
      .from("property_reviews")
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
