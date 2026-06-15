'use client'

import { useCallback, useEffect, useState } from 'react'
import { Send, Trash2, MessageCircle } from 'lucide-react'
import { useAuth } from '@/app/providers'
import { Comment } from '@/utils/supabase'

interface ListingCommentsProps {
  /** The listing whose comment thread to show. */
  listingId: string
}

// Compact relative timestamp: "just now", "5m", "3h", "2d", then a date.
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d`
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

// Small round avatar — photo if present, otherwise a colored initial.
function Avatar({
  name,
  username,
  url,
  size = 32,
}: {
  name?: string
  username?: string
  url?: string
  size?: number
}) {
  const initial = (name || username || '?').charAt(0).toUpperCase()
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name || username || 'User'}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-blue-500 font-semibold text-white"
      style={{ width: size, height: size, fontSize: size / 2.4 }}
    >
      {initial}
    </div>
  )
}

// Listing comment thread: a composer (signed-in users) plus the list of
// comments. Self-contained — fetches from /api/comments and updates locally.
export default function ListingComments({ listingId }: ListingCommentsProps) {
  const { user } = useAuth()

  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/comments?listing_id=${listingId}`)
      if (res.ok) {
        const data = await res.json()
        setComments(data.comments ?? [])
      }
    } catch {
      // Non-fatal: leave the thread empty if the fetch fails.
    } finally {
      setLoading(false)
    }
  }, [listingId])

  useEffect(() => {
    load()
  }, [load])

  const submit = async () => {
    const content = draft.trim()
    if (!content) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId, content }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to post comment.')
      } else {
        // Prepend the new comment (it arrives with its author embedded).
        setComments((prev) => [data as Comment, ...prev])
        setDraft('')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to post comment.')
    } finally {
      setSubmitting(false)
    }
  }

  const remove = async (id: string) => {
    // Optimistic removal; restore on failure.
    const prev = comments
    setComments((c) => c.filter((x) => x.id !== id))
    try {
      const res = await fetch(`/api/comments?id=${id}`, { method: 'DELETE' })
      if (!res.ok) setComments(prev)
    } catch {
      setComments(prev)
    }
  }

  // Submit on Enter, newline on Shift+Enter.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="border-t pt-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
        <MessageCircle size={16} className="text-gray-400" />
        Comments
        {comments.length > 0 && (
          <span className="font-normal text-gray-400">({comments.length})</span>
        )}
      </h3>

      {/* Composer */}
      {user ? (
        <div className="mb-5 flex gap-2.5">
          <Avatar
            name={user.user_metadata?.name}
            username={user.user_metadata?.username}
            url={user.user_metadata?.avatar_url}
          />
          <div className="flex-1">
            <div className="flex items-end gap-2 rounded-2xl border border-gray-300 bg-white px-3 py-2 transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/30">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder="Ask a question or leave a comment…"
                className="max-h-32 flex-1 resize-none bg-transparent text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none"
              />
              <button
                onClick={submit}
                disabled={submitting || !draft.trim()}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white transition hover:bg-blue-600 disabled:opacity-40"
                aria-label="Post comment"
              >
                <Send size={15} />
              </button>
            </div>
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          </div>
        </div>
      ) : (
        <p className="mb-5 text-xs text-gray-400">
          Sign in to join the conversation.
        </p>
      )}

      {/* Thread */}
      {loading ? (
        <p className="text-xs text-gray-400">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-gray-400">
          No comments yet. {user ? 'Start the conversation.' : ''}
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map((c) => {
            const isMine = user?.id === c.author_id
            return (
              <div key={c.id} className="group flex gap-2.5">
                <Avatar
                  name={c.author?.name}
                  username={c.author?.username}
                  url={c.author?.avatar_url}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-gray-800">
                      {c.author?.name || c.author?.username || 'Subly user'}
                    </span>
                    {isMine && (
                      <span className="shrink-0 text-xs text-gray-400">you</span>
                    )}
                    <span className="shrink-0 text-xs text-gray-400">
                      · {timeAgo(c.created_at)}
                    </span>
                    {isMine && (
                      <button
                        onClick={() => remove(c.id)}
                        className="ml-auto text-gray-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                        aria-label="Delete comment"
                        title="Delete comment"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <p className="mt-0.5 whitespace-pre-line break-words text-sm text-gray-600">
                    {c.content}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
