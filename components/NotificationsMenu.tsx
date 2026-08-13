'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'
import {
  Bell,
  Heart,
  MapPin,
  MessageCircle,
  MessagesSquare,
  Star,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// A row from /api/notifications. `actor` and `listing` are embedded from the
// related_* foreign keys and can be null if that person or listing is gone.
export interface NotificationItem {
  id: string
  type: 'message' | 'listing' | 'favorite' | 'comment' | 'review'
  created_at: string
  read_at: string | null
  related_listing_id: string | null
  related_user_id: string | null
  actor: {
    id: string
    name: string | null
    username: string | null
    avatar_url: string | null
  } | null
  listing: { id: string; title: string } | null
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

// Icon + copy for each kind of notification. The database stores only a type
// and the related ids, so the wording is derived here.
function describeNotification(n: NotificationItem): {
  icon: LucideIcon
  title: string
  detail: string
} {
  const who = n.actor?.name || n.actor?.username || 'Someone'
  const what = n.listing?.title || 'your listing'

  switch (n.type) {
    case 'message':
      return {
        icon: MessagesSquare,
        title: 'New message',
        detail: `${who} sent you a message`,
      }
    case 'comment':
      return {
        icon: MessageCircle,
        title: 'New comment',
        detail: `${who} commented on ${what}`,
      }
    case 'review':
      return {
        icon: Star,
        title: 'New review',
        // Host reviews carry no listing; property reviews do.
        detail: n.related_listing_id
          ? `${who} reviewed ${what}`
          : `${who} left you a review`,
      }
    case 'favorite':
      return { icon: Heart, title: 'Listing saved', detail: `${who} saved ${what}` }
    case 'listing':
      return { icon: MapPin, title: 'New matching listing', detail: what }
    default:
      return { icon: Bell, title: 'Notification', detail: '' }
  }
}

interface NotificationsMenuProps {
  /** Controlled, so the host header can close its other dropdowns in step. */
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Where a message notification should take the user, if anywhere. */
  onOpenMessages?: () => void
}

/**
 * The header bell and its dropdown, shared by the landing page and the map's
 * top menu so both show the same real feed. Rows are written by database
 * triggers (see database.sql), so this only ever reads.
 */
export default function NotificationsMenu({
  open,
  onOpenChange,
  onOpenMessages,
}: NotificationsMenuProps) {
  const { user } = useAuth()
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)

  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!user) {
      setNotifications([])
      setUnreadCount(0)
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications ?? [])
        setUnreadCount(data.unreadCount ?? 0)
      }
    } catch {
      // Network hiccup — leave the bell showing whatever it already had.
    } finally {
      setLoading(false)
    }
  }, [user])

  // Fetch once so the unread dot is right before the menu is ever opened.
  useEffect(() => {
    load()
  }, [load])

  // Clicking anywhere else dismisses the dropdown.
  useEffect(() => {
    if (!open) return
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onOpenChange(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open, onOpenChange])

  // Opening refreshes the feed and clears the unread dot. The rows keep their
  // unread styling locally so you can still see what was new.
  const handleBellClick = () => {
    const opening = !open
    onOpenChange(opening)
    if (!opening || !user) return

    load()
    if (unreadCount > 0) {
      setUnreadCount(0)
      fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      }).catch(() => {
        // Best-effort; the next load will report the true count.
      })
    }
  }

  // Send the user to whatever the notification is about.
  const openNotification = (n: NotificationItem) => {
    onOpenChange(false)
    if (n.type === 'message') {
      onOpenMessages?.()
    } else if (n.related_listing_id) {
      router.push(`/listings/${n.related_listing_id}`)
    } else if (n.actor?.id) {
      router.push(`/users/${n.actor.id}`)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleBellClick}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-blue-500 ring-2 ring-white" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
            {unreadCount > 0 && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto py-1.5">
            {!user ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">
                Sign in to see your notifications.
              </p>
            ) : loading && notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">
                Loading…
              </p>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">
                Nothing yet. Messages, comments, reviews and saves on your
                listings show up here.
              </p>
            ) : (
              notifications.map((n) => {
                const { icon: Icon, title, detail } = describeNotification(n)
                return (
                  <button
                    key={n.id}
                    onClick={() => openNotification(n)}
                    className={`flex w-full gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-slate-50 ${
                      n.read_at ? '' : 'bg-blue-50/40'
                    }`}
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">{title}</p>
                      <p className="truncate text-xs text-slate-500">
                        {detail} · {timeAgo(n.created_at)}
                      </p>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
