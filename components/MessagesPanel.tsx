'use client'

import { useState, useEffect, useRef, useCallback, Fragment } from 'react'
import {
  X,
  Search,
  ArrowLeft,
  Send,
  Info,
  Trash2,
  Eraser,
  Image as ImageIcon,
} from 'lucide-react'
import { useAuth } from '@/app/providers'
import { getSupabaseBrowserClient } from '@/utils/supabase'

interface ChatUser {
  id: string
  name: string
  username: string
  avatar_url?: string
}

interface Conversation {
  otherUser: ChatUser
  lastMessage: { content: string; created_at: string; sender_id: string } | null
  unreadCount: number
}

interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  created_at: string
  read_at?: string
}

interface MessagesPanelProps {
  open: boolean
  onClose: () => void
  // Notify the parent when unread state may have changed (so it can refresh).
  onActivity?: () => void
}

const NICKNAMES_KEY = 'subly.chatNicknames'
const CLEARED_KEY = 'subly.chatClearedAt'
const IMAGE_URL_RE = /https?:\/\/\S+\.(?:png|jpe?g|gif|webp)/gi

// Messages within this gap from the same sender visually stick together.
const GROUP_GAP_MS = 2 * 60 * 1000
// A centered timestamp is shown when the gap exceeds this.
const TIME_GAP_MS = 15 * 60 * 1000

// Friendly timestamp: time today, "Yesterday 3:45 PM", else "Jun 2, 3:45 PM".
function formatMessageTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  if (d.toDateString() === now.toDateString()) return time
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday ${time}`
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`
}

// Small round avatar — uses the photo if present, otherwise initials.
function Avatar({
  user,
  name,
  size = 44,
}: {
  user: ChatUser
  name: string
  size?: number
}) {
  const initial = (name || user.username || '?').charAt(0).toUpperCase()
  if (user.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatar_url}
        alt={name}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="rounded-full bg-indigo-500 text-white flex items-center justify-center font-semibold shrink-0"
      style={{ width: size, height: size, fontSize: size / 2.5 }}
    >
      {initial}
    </div>
  )
}

export default function MessagesPanel({
  open,
  onClose,
  onActivity,
}: MessagesPanelProps) {
  const { user } = useAuth()
  const supabase = getSupabaseBrowserClient()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loadingConvos, setLoadingConvos] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ChatUser[]>([])

  const [activeUser, setActiveUser] = useState<ChatUser | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  // Chat settings (stored locally — personal to this user).
  const [showSettings, setShowSettings] = useState(false)
  const [nicknames, setNicknames] = useState<Record<string, string>>({})
  const [clearedAt, setClearedAt] = useState<Record<string, string>>({})
  const [nameDraft, setNameDraft] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const displayName = useCallback(
    (u: ChatUser) => nicknames[u.id]?.trim() || u.name,
    [nicknames]
  )

  // Load local nickname / cleared-chat settings once.
  useEffect(() => {
    try {
      const n = localStorage.getItem(NICKNAMES_KEY)
      if (n) setNicknames(JSON.parse(n))
      const c = localStorage.getItem(CLEARED_KEY)
      if (c) setClearedAt(JSON.parse(c))
    } catch {
      // ignore malformed storage
    }
  }, [])

  const persistNicknames = (next: Record<string, string>) => {
    setNicknames(next)
    try {
      localStorage.setItem(NICKNAMES_KEY, JSON.stringify(next))
    } catch {
      // ignore
    }
  }

  const persistCleared = (next: Record<string, string>) => {
    setClearedAt(next)
    try {
      localStorage.setItem(CLEARED_KEY, JSON.stringify(next))
    } catch {
      // ignore
    }
  }

  // --- Conversation list ---
  const fetchConversations = useCallback(async () => {
    setLoadingConvos(true)
    try {
      const res = await fetch('/api/messages')
      if (res.ok) setConversations(await res.json())
    } catch {
      // ignore
    } finally {
      setLoadingConvos(false)
    }
  }, [])

  useEffect(() => {
    if (open && !activeUser) fetchConversations()
  }, [open, activeUser, fetchConversations])

  // --- User search ---
  useEffect(() => {
    const q = searchQuery.trim()
    if (q.length < 2 || !user) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('users')
        .select('id, name, username, avatar_url')
        .or(`username.ilike.%${q}%,name.ilike.%${q}%`)
        .neq('id', user.id)
        .limit(8)
      setSearchResults((data as ChatUser[]) ?? [])
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, user, supabase])

  // --- Active chat ---
  const markRead = useCallback(
    async (otherId: string) => {
      if (!user) return
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('receiver_id', user.id)
        .eq('sender_id', otherId)
        .is('read_at', null)
      onActivity?.()
    },
    [user, supabase, onActivity]
  )

  const fetchMessages = useCallback(
    async (otherId: string) => {
      const res = await fetch(`/api/messages?with=${otherId}`)
      if (res.ok) {
        setMessages(await res.json())
        markRead(otherId)
      }
    },
    [markRead]
  )

  const openChat = (chatUser: ChatUser) => {
    setActiveUser(chatUser)
    setShowSettings(false)
    setMessages([])
    setSearchQuery('')
    setSearchResults([])
    fetchMessages(chatUser.id)
  }

  // Poll the open thread so incoming messages appear without a refresh.
  useEffect(() => {
    if (!open || !activeUser || showSettings) return
    const id = setInterval(() => fetchMessages(activeUser.id), 5000)
    return () => clearInterval(id)
  }, [open, activeUser, showSettings, fetchMessages])

  // Filter out messages cleared before the per-chat "clear" timestamp.
  const clearedTs = activeUser ? clearedAt[activeUser.id] : undefined
  const visibleMessages = clearedTs
    ? messages.filter((m) => m.created_at > clearedTs)
    : messages

  // Conversations hide once cleared, until a newer message arrives.
  const visibleConversations = conversations.filter((c) => {
    const cleared = clearedAt[c.otherUser.id]
    if (!cleared) return true
    return c.lastMessage ? c.lastMessage.created_at > cleared : false
  })

  // Image URLs found in the visible messages → "attachments".
  const attachments = visibleMessages.flatMap(
    (m) => m.content.match(IMAGE_URL_RE) ?? []
  )

  // Auto-scroll to the newest message.
  useEffect(() => {
    if (!showSettings) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [visibleMessages.length, showSettings])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    const content = input.trim()
    if (!content || !activeUser) return
    setSending(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiver_id: activeUser.id, content }),
      })
      if (res.ok) {
        const created = await res.json()
        setMessages((prev) => [...prev, created])
        setInput('')
      }
    } finally {
      setSending(false)
    }
  }

  const backToList = () => {
    setActiveUser(null)
    setShowSettings(false)
    setMessages([])
    fetchConversations()
    onActivity?.()
  }

  const openSettings = () => {
    if (!activeUser) return
    setNameDraft(nicknames[activeUser.id] ?? '')
    setShowSettings(true)
  }

  const saveName = () => {
    if (!activeUser) return
    const next = { ...nicknames }
    if (nameDraft.trim()) next[activeUser.id] = nameDraft.trim()
    else delete next[activeUser.id]
    persistNicknames(next)
  }

  const clearChat = () => {
    if (!activeUser) return
    persistCleared({ ...clearedAt, [activeUser.id]: new Date().toISOString() })
    setShowSettings(false)
  }

  const deleteChat = () => {
    if (!activeUser) return
    if (!window.confirm('Delete this conversation from your list?')) return
    persistCleared({ ...clearedAt, [activeUser.id]: new Date().toISOString() })
    backToList()
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-[60]"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-[61] w-full sm:max-w-md bg-white shadow-2xl flex flex-col">
        {activeUser && showSettings ? (
          /* ---------- SETTINGS VIEW ---------- */
          <>
            <div className="flex items-center gap-3 px-4 py-3 border-b">
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition"
                aria-label="Back to chat"
              >
                <ArrowLeft size={20} className="text-gray-600" />
              </button>
              <p className="flex-1 font-semibold text-gray-800">Details</p>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded-lg transition"
                aria-label="Close"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Identity */}
              <div className="flex flex-col items-center text-center">
                <Avatar user={activeUser} name={displayName(activeUser)} size={72} />
                <p className="mt-3 font-bold text-gray-800">
                  {displayName(activeUser)}
                </p>
                <p className="text-sm text-gray-400">@{activeUser.username}</p>
              </div>

              {/* Rename */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Name
                </label>
                <div className="flex gap-2">
                  <input
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    placeholder={activeUser.name}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <button
                    onClick={saveName}
                    className="px-4 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition"
                  >
                    Save
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  A custom name is only visible to you. Leave blank to use their
                  real name.
                </p>
              </div>

              {/* Attachments */}
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <ImageIcon size={16} /> Attachments
                </h3>
                {attachments.length === 0 ? (
                  <p className="text-sm text-gray-400">No attachments yet</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {attachments.map((url, i) => (
                      <a
                        key={`${url}-${i}`}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-lg overflow-hidden bg-gray-100"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt="Attachment"
                          className="w-full h-20 object-cover"
                        />
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Danger actions */}
              <div className="border-t pt-4 space-y-1">
                <button
                  onClick={clearChat}
                  className="flex items-center gap-3 w-full px-2 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition"
                >
                  <Eraser size={18} className="text-gray-400" /> Clear chat
                </button>
                <button
                  onClick={deleteChat}
                  className="flex items-center gap-3 w-full px-2 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 size={18} /> Delete conversation
                </button>
              </div>
            </div>
          </>
        ) : activeUser ? (
          /* ---------- CHAT VIEW ---------- */
          <>
            <div className="flex items-center gap-3 px-4 py-3 border-b">
              <button
                onClick={backToList}
                className="p-1 hover:bg-gray-100 rounded-lg transition"
                aria-label="Back"
              >
                <ArrowLeft size={20} className="text-gray-600" />
              </button>
              <Avatar user={activeUser} name={displayName(activeUser)} size={36} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 truncate">
                  {displayName(activeUser)}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  @{activeUser.username}
                </p>
              </div>
              <button
                onClick={openSettings}
                className="p-1 hover:bg-gray-100 rounded-lg transition"
                aria-label="Chat details"
              >
                <Info size={20} className="text-gray-600" />
              </button>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded-lg transition"
                aria-label="Close"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50">
              {visibleMessages.length === 0 ? (
                <p className="text-center text-sm text-gray-400 mt-8">
                  No messages yet. Say hello!
                </p>
              ) : (
                visibleMessages.map((msg, i) => {
                  const mine = msg.sender_id === user?.id
                  const prev = visibleMessages[i - 1]
                  const next = visibleMessages[i + 1]
                  const t = new Date(msg.created_at).getTime()

                  // Centered timestamp when there's a big gap (or it's first).
                  const showTime =
                    !prev || t - new Date(prev.created_at).getTime() > TIME_GAP_MS

                  // Same sender within the group window → stick together.
                  const prevSame =
                    !!prev &&
                    prev.sender_id === msg.sender_id &&
                    t - new Date(prev.created_at).getTime() <= GROUP_GAP_MS &&
                    !showTime
                  const nextSame =
                    !!next &&
                    next.sender_id === msg.sender_id &&
                    new Date(next.created_at).getTime() - t <= GROUP_GAP_MS

                  const spacing = showTime ? '' : prevSame ? 'mt-0.5' : 'mt-3'
                  // Flatten the corners where bubbles connect.
                  const corners = mine
                    ? `${prevSame ? 'rounded-tr-md' : ''} ${nextSame ? 'rounded-br-md' : ''}`
                    : `${prevSame ? 'rounded-tl-md' : ''} ${nextSame ? 'rounded-bl-md' : ''}`

                  return (
                    <Fragment key={msg.id}>
                      {showTime && (
                        <div className="text-center text-xs text-gray-400 py-2">
                          {formatMessageTime(msg.created_at)}
                        </div>
                      )}
                      <div
                        className={`flex ${mine ? 'justify-end' : 'justify-start'} ${spacing}`}
                      >
                        <div
                          title={new Date(msg.created_at).toLocaleString()}
                          className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm break-words ${corners} ${
                            mine
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 text-gray-900'
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    </Fragment>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <form onSubmit={sendMessage} className="flex items-center gap-2 p-3 border-t">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message..."
                className="flex-1 px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="p-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition disabled:opacity-40"
                aria-label="Send"
              >
                <Send size={16} />
              </button>
            </form>
          </>
        ) : (
          /* ---------- LIST VIEW ---------- */
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-xl font-bold text-gray-800">Messages</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
                aria-label="Close"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 py-3 border-b">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search people..."
                  className="w-full pl-9 pr-3 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            {/* Search results OR conversation list */}
            <div className="flex-1 overflow-y-auto">
              {searchQuery.trim().length >= 2 ? (
                searchResults.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 mt-8">
                    No users found
                  </p>
                ) : (
                  searchResults.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => openChat(u)}
                      className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-50 transition text-left"
                    >
                      <Avatar user={u} name={displayName(u)} />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 truncate">
                          {displayName(u)}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          @{u.username}
                        </p>
                      </div>
                    </button>
                  ))
                )
              ) : loadingConvos ? (
                <p className="text-center text-sm text-gray-400 mt-8">Loading…</p>
              ) : visibleConversations.length === 0 ? (
                <p className="text-center text-sm text-gray-400 mt-8 px-6">
                  No conversations yet. Search for someone to start chatting.
                </p>
              ) : (
                visibleConversations.map((conv) => (
                  <button
                    key={conv.otherUser.id}
                    onClick={() => openChat(conv.otherUser)}
                    className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-50 transition text-left"
                  >
                    <Avatar
                      user={conv.otherUser}
                      name={displayName(conv.otherUser)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">
                        {displayName(conv.otherUser)}
                      </p>
                      <p
                        className={`text-sm truncate ${
                          conv.unreadCount > 0
                            ? 'text-gray-900 font-medium'
                            : 'text-gray-400'
                        }`}
                      >
                        {conv.lastMessage
                          ? (conv.lastMessage.sender_id === user?.id
                              ? 'You: '
                              : '') + conv.lastMessage.content
                          : ''}
                      </p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="shrink-0 bg-blue-500 text-white text-xs font-semibold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
                        {conv.unreadCount}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
