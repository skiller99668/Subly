'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Star, Trash2, Home } from 'lucide-react'
import { useAuth } from '@/app/providers'
import StarRating from './StarRating'

interface PropertyReview {
  id: string
  listing_id: string
  author_id: string
  rating: number
  comment?: string
  created_at: string
  author?: {
    id: string
    name?: string
    username?: string
    avatar_url?: string
  }
}

interface PropertyReviewsProps {
  listingId: string
  /** When true, opens the composer immediately on mount. */
  autoOpen?: boolean
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return new Date(iso).toLocaleDateString([], { month: 'short', year: 'numeric' })
}

function Avatar({
  name,
  username,
  url,
}: {
  name?: string
  username?: string
  url?: string
}) {
  const initial = (name || username || '?').charAt(0).toUpperCase()
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name || username || 'Reviewer'}
        className="h-9 w-9 shrink-0 rounded-full object-cover"
      />
    )
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600">
      {initial}
    </div>
  )
}

export default function PropertyReviews({
  listingId,
  autoOpen = false,
}: PropertyReviewsProps) {
  const { user } = useAuth()

  const [reviews, setReviews] = useState<PropertyReview[]>([])
  const [average, setAverage] = useState(0)
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const [composing, setComposing] = useState(false)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/property-reviews?listing_id=${listingId}`)
      if (res.ok) {
        const data = await res.json()
        setReviews(data.reviews ?? [])
        setAverage(data.average ?? 0)
        setCount(data.count ?? 0)
      }
    } catch {
      // Non-fatal.
    } finally {
      setLoading(false)
    }
  }, [listingId])

  useEffect(() => {
    load()
  }, [load])

  const startComposing = () => {
    setRating(0)
    setComment('')
    setError('')
    setComposing(true)
  }

  useEffect(() => {
    if (autoOpen && !loading && user) {
      startComposing()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen, loading, user])

  const submit = async () => {
    if (rating < 1) {
      setError('Please choose a star rating.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/property-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId, rating, comment }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to submit review.')
      } else {
        setComposing(false)
        setReviews((prev) => [data as PropertyReview, ...prev])
        setCount((c) => c + 1)
        setAverage((prev) =>
          count === 0 ? rating : (prev * count + rating) / (count + 1)
        )
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit review.')
    } finally {
      setSubmitting(false)
    }
  }

  const remove = async (id: string, reviewRating: number) => {
    const prev = reviews
    const prevAvg = average
    const prevCount = count
    setReviews((r) => r.filter((x) => x.id !== id))
    setCount((c) => Math.max(0, c - 1))
    setAverage(
      count <= 1
        ? 0
        : (average * count - reviewRating) / (count - 1)
    )
    try {
      const res = await fetch(`/api/property-reviews?id=${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        setReviews(prev)
        setAverage(prevAvg)
        setCount(prevCount)
      }
    } catch {
      setReviews(prev)
      setAverage(prevAvg)
      setCount(prevCount)
    }
  }

  // Star breakdown — how many reviews per rating.
  const breakdown = [5, 4, 3, 2, 1].map((star) => ({
    star,
    n: reviews.filter((r) => r.rating === star).length,
  }))

  return (
    <section className="border-t pt-6">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Home size={18} className="text-slate-400" />
          <h3 className="font-semibold text-slate-900">Property reviews</h3>
          {count > 0 && (
            <span className="text-sm text-slate-400">({count})</span>
          )}
        </div>
        {count > 0 && (
          <div className="flex items-center gap-1.5">
            <StarRating value={average} size={15} />
            <span className="text-sm font-medium text-slate-700">
              {average.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {/* Aggregate breakdown — only when there are reviews */}
      {count > 0 && (
        <div className="mb-5 flex gap-4 rounded-xl bg-slate-50 p-4">
          <div className="flex flex-col items-center justify-center gap-0.5 pr-4 border-r border-slate-200">
            <span className="text-3xl font-bold text-slate-900">
              {average.toFixed(1)}
            </span>
            <StarRating value={average} size={14} />
            <span className="mt-0.5 text-xs text-slate-400">out of 5</span>
          </div>
          <div className="flex flex-1 flex-col gap-1 justify-center">
            {breakdown.map(({ star, n }) => (
              <div key={star} className="flex items-center gap-2">
                <span className="w-3 text-right text-xs text-slate-500">{star}</span>
                <Star size={11} className="shrink-0 fill-amber-400 text-amber-400" />
                <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-amber-400 transition-all"
                    style={{ width: count > 0 ? `${(n / count) * 100}%` : '0%' }}
                  />
                </div>
                <span className="w-4 text-xs text-slate-400">{n}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading reviews…</p>
      ) : (
        <>
          {/* Write control */}
          {!user ? (
            <p className="mb-4 text-sm text-slate-400">
              <Link href="/auth" className="text-blue-600 hover:underline">
                Sign in
              </Link>{' '}
              to review this property.
            </p>
          ) : composing ? (
            <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <p className="text-sm font-medium text-slate-700">Your review</p>
              <StarRating value={rating} onChange={setRating} size={28} />
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="What was the property like? Cleanliness, location, value…"
                className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={submit}
                  disabled={submitting}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Posting…' : 'Post review'}
                </button>
                <button
                  onClick={() => setComposing(false)}
                  className="px-4 text-sm text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={startComposing}
              className="mb-5 flex items-center gap-2 text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
            >
              <Star size={15} /> Leave a property review
            </button>
          )}

          {/* Reviews list */}
          {reviews.length === 0 ? (
            <p className="text-sm text-slate-400">
              No reviews yet.{user ? ' Be the first.' : ''}
            </p>
          ) : (
            <div className="space-y-4">
              {reviews.map((r) => {
                const isMine = user?.id === r.author_id
                const displayName =
                  r.author?.name || r.author?.username || 'Subly user'
                return (
                  <div key={r.id} className="group flex gap-3">
                    <Link href={`/users/${r.author_id}`} className="shrink-0">
                      <Avatar
                        name={r.author?.name}
                        username={r.author?.username}
                        url={r.author?.avatar_url}
                      />
                    </Link>
                    <div className="min-w-0 flex-1 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <Link
                          href={`/users/${r.author_id}`}
                          className="text-sm font-medium text-slate-800 transition-colors hover:text-blue-600 hover:underline"
                        >
                          {displayName}
                        </Link>
                        {isMine && (
                          <span className="text-xs text-slate-400">· you</span>
                        )}
                        <span className="text-xs text-slate-400">
                          · {timeAgo(r.created_at)}
                        </span>
                        <div className="ml-auto">
                          <StarRating value={r.rating} size={13} />
                        </div>
                      </div>
                      {r.comment && (
                        <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                          {r.comment}
                        </p>
                      )}
                      {isMine && (
                        <button
                          onClick={() => remove(r.id, r.rating)}
                          className="mt-2 flex items-center gap-1 text-xs text-slate-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                          aria-label="Delete review"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </section>
  )
}
