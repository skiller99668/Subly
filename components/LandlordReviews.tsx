'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Star, Trash2 } from 'lucide-react'
import { useAuth } from '@/app/providers'
import { Review } from '@/utils/supabase'
import StarRating from './StarRating'

interface LandlordReviewsProps {
  /** The host/landlord being reviewed (their users.id). */
  subjectId: string
  /** Display name, used in the composer placeholder. */
  subjectName: string
}

// Host review section: aggregate rating, a write/edit composer (signed-in
// users who aren't the host), and the list of reviews. Self-contained — it
// fetches its own data from /api/reviews and refreshes after writes.
export default function LandlordReviews({ subjectId, subjectName }: LandlordReviewsProps) {
  const { user } = useAuth()
  const isOwn = user?.id === subjectId

  const [reviews, setReviews] = useState<Review[]>([])
  const [average, setAverage] = useState(0)
  const [count, setCount] = useState(0)
  const [mine, setMine] = useState<Review | null>(null)
  const [loading, setLoading] = useState(true)

  const [composing, setComposing] = useState(false)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reviews?subject_id=${subjectId}`)
      if (res.ok) {
        const data = await res.json()
        setReviews(data.reviews ?? [])
        setAverage(data.average ?? 0)
        setCount(data.count ?? 0)
        setMine(data.mine ?? null)
      }
    } catch {
      // Non-fatal: leave the section empty if the fetch fails.
    } finally {
      setLoading(false)
    }
  }, [subjectId])

  useEffect(() => {
    load()
  }, [load])

  // Prefill the composer with the user's existing review when editing.
  const startComposing = () => {
    setRating(mine?.rating ?? 0)
    setComment(mine?.comment ?? '')
    setError('')
    setComposing(true)
  }

  const submit = async () => {
    if (rating < 1) {
      setError('Please pick a star rating.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject_id: subjectId, rating, comment }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to submit review.')
      } else {
        setComposing(false)
        await load()
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit review.')
    } finally {
      setSubmitting(false)
    }
  }

  const remove = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/reviews?subject_id=${subjectId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setComposing(false)
        await load()
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="border-t pt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Host reviews</h3>
        {count > 0 && (
          <div className="flex items-center gap-1.5">
            <StarRating value={average} size={15} />
            <span className="text-sm text-gray-600">
              {average.toFixed(1)} ({count})
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-gray-400">Loading reviews…</p>
      ) : (
        <>
          {/* Write / edit control */}
          {!user ? (
            <p className="text-xs text-gray-400 mb-3">Sign in to review this host.</p>
          ) : isOwn ? (
            <p className="text-xs text-gray-400 mb-3">You can&apos;t review yourself.</p>
          ) : composing ? (
            <div className="space-y-2 mb-4 rounded-lg border border-gray-200 p-3">
              <StarRating value={rating} onChange={setRating} size={26} />
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder={`Share your experience with ${subjectName}…`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
              />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={submit}
                  disabled={submitting}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium py-2 rounded-lg transition disabled:opacity-50"
                >
                  {submitting ? 'Saving…' : mine ? 'Update review' : 'Post review'}
                </button>
                <button
                  onClick={() => setComposing(false)}
                  className="px-4 text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={startComposing}
              className="mb-4 flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              <Star size={16} /> {mine ? 'Edit your review' : 'Write a review'}
            </button>
          )}

          {/* Reviews list */}
          {reviews.length === 0 ? (
            <p className="text-xs text-gray-400">No reviews yet. Be the first.</p>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => {
                const isMine = user?.id === r.author_id
                return (
                  <div key={r.id} className="rounded-lg border border-gray-100 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-gray-800">
                        <Link
                          href={`/users/${r.author_id}`}
                          className="transition-colors hover:text-blue-600 hover:underline"
                        >
                          {r.author?.name || r.author?.username || 'Subly user'}
                        </Link>
                        {isMine && (
                          <span className="font-normal text-gray-400"> (you)</span>
                        )}
                      </span>
                      <StarRating value={r.rating} size={13} />
                    </div>
                    {r.comment && (
                      <p className="mt-1.5 text-sm text-gray-600 whitespace-pre-line">
                        {r.comment}
                      </p>
                    )}
                    <div className="mt-1 flex items-center gap-3">
                      <span className="text-xs text-gray-400">
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                      {isMine && (
                        <button
                          onClick={remove}
                          disabled={submitting}
                          className="flex items-center gap-1 text-xs text-gray-400 transition hover:text-red-500"
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
    </div>
  )
}
