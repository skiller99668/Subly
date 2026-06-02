import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/utils/supabase-server"

// GET messages (conversations and individual messages)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const conversationWith = searchParams.get("with")

    if (conversationWith) {
      // Get messages with specific user
      const { data, error } = await supabase
        .from("messages")
        .select("*, sender:users(id, name, username), receiver:users(id, name, username)")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${conversationWith}),and(sender_id.eq.${conversationWith},receiver_id.eq.${user.id})`
        )
        .order("created_at", { ascending: true })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(data)
    } else {
      // Get all conversations for this user
      const { data, error } = await supabase
        .from("messages")
        .select("*, sender:users(id, name, username), receiver:users(id, name, username)")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Group by conversation (removing duplicates)
      const conversations = new Map()
      data.forEach((msg: any) => {
        const otherUserId =
          msg.sender_id === user.id ? msg.receiver_id : msg.sender_id
        if (!conversations.has(otherUserId)) {
          conversations.set(otherUserId, msg)
        }
      })

      return NextResponse.json(Array.from(conversations.values()))
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    )
  }
}

// POST send a message
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
    const { receiver_id, content } = body

    if (!receiver_id || !content) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("messages")
      .insert([
        {
          sender_id: user.id,
          receiver_id,
          content,
        },
      ])
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data[0], { status: 201 })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    )
  }
}
