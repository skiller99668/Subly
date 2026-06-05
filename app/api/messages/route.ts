import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/utils/supabase-server"

// GET messages: ?with=<userId> returns the thread with that user; otherwise
// returns the conversation list (one entry per person, newest first).
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

    // --- Single thread ---
    if (conversationWith) {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${conversationWith}),and(sender_id.eq.${conversationWith},receiver_id.eq.${user.id})`
        )
        .order("created_at", { ascending: true })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json(data)
    }

    // --- Conversation list ---
    const { data, error } = await supabase
      .from("messages")
      .select(
        "*, sender:users!sender_id(id, name, username, avatar_url), receiver:users!receiver_id(id, name, username, avatar_url)"
      )
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const conversations: any[] = []
    const seen = new Set<string>()

    for (const msg of data as any[]) {
      const otherUser = msg.sender_id === user.id ? msg.receiver : msg.sender
      if (!otherUser || seen.has(otherUser.id)) continue
      seen.add(otherUser.id)
      conversations.push({
        otherUser,
        lastMessage: {
          content: msg.content,
          created_at: msg.created_at,
          sender_id: msg.sender_id,
        },
        unreadCount: 0,
      })
    }

    // Tally unread messages (sent to me, not yet read) per conversation.
    for (const conv of conversations) {
      conv.unreadCount = (data as any[]).filter(
        (m) =>
          m.sender_id === conv.otherUser.id &&
          m.receiver_id === user.id &&
          !m.read_at
      ).length
    }

    return NextResponse.json(conversations)
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
      .insert([{ sender_id: user.id, receiver_id, content }])
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
