import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/utils/supabase-server"

// PATCH update a listing (owner only — enforced by RLS + the user_id filter)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const updates: Record<string, unknown> = {}
    if (body.title !== undefined) updates.title = body.title
    if (body.description !== undefined) updates.description = body.description
    if (body.price !== undefined) updates.price = parseFloat(body.price)
    if (body.size !== undefined) updates.size = parseInt(body.size)
    if (body.lat !== undefined) updates.lat = parseFloat(body.lat)
    if (body.lng !== undefined) updates.lng = parseFloat(body.lng)
    if (body.move_in_date !== undefined) updates.move_in_date = body.move_in_date
    if (body.address !== undefined) updates.address = body.address || null
    if (body.images !== undefined) {
      updates.images = Array.isArray(body.images) ? body.images : []
    }
    if (body.tags !== undefined) {
      updates.tags = Array.isArray(body.tags) ? body.tags : []
    }

    const { data, error } = await supabase
      .from("listings")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "Listing not found or not yours" },
        { status: 404 }
      )
    }

    return NextResponse.json(data[0])
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE a listing (owner only)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { error } = await supabase
      .from("listings")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

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
