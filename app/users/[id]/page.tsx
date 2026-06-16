'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  MapPin,
  Mail,
  MessageSquare,
  Calendar,
  Ruler,
  ArrowLeft,
  Loader2,
  Building2,
  Star,
} from 'lucide-react'
import { useAuth } from '@/app/providers'
import { Listing, User } from '@/utils/supabase'
import ListingAddress from '@/components/ListingAddress'
import LandlordReviews from '@/components/LandlordReviews'

// A user's public profile — social-media style: avatar, bio, a "message" /
// "leave a review" action area, and the grid of every listing they've posted.
// Matches the site's marketing UI (slate palette, serif headings, blue accents).
export default function ProfilePage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const { user: me } = useAuth()

  const [profile, setProfile] = useState<User | null>(null)
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)

  const reviewsSectionRef = useRef<HTMLElement>(null)
  const [reviewOpen, setReviewOpen] = useState(false)

  // Message composer state.
  const [composing, setComposing] = useState(false)
  const [messageBody, setMessageBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (!id) return
    let active = true
    setLoading(true)
    fetch(`/api/users/${id}`)
      .then(async (res) => {
        if (!active) return
        if (res.status === 404) {
          setMissing(true)
          return
        }
        if (res.ok) {
          const data = await res.json()
          setProfile(data.user)
          setListings(data.listings ?? [])
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

  const sendMessage = async () => {
    if (!messageBody.trim() || !profile) return
    setSending(true)
    setSendError('')
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiver_id: profile.id,
          content: messageBody.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSendError(data.error || 'Failed to send message.')
      } else {
        setSent(true)
        setMessageBody('')
        setComposing(false)
      }
    } catch (err: any) {
      setSendError(err.message || 'Failed to send message.')
    } finally {
      setSending(false)
    }
  }

  const header = (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600">
            <MapPin className="h-4 w-4 text-white" strokeWidth={2.5} />
          </span>
          <span className="text-[17px] font-semibold tracking-tight text-slate-900">
            Subly
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/map"
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:text-slate-900"
          >
            Browse the map
          </Link>
          {me ? (
            <Link
              href="/map?panel=post"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-700"
            >
              Post a sublease
            </Link>
          ) : (
            <Link
              href="/auth"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-700"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-white font-sans text-slate-900 antialiased">
        {header}
        <div className="flex h-[60vh] items-center justify-center text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    )
  }

  if (missing || !profile) {
    return (
      <div className="min-h-screen bg-white font-sans text-slate-900 antialiased">
        {header}
        <div className="mx-auto flex max-w-5xl flex-col items-center px-5 py-24 text-center">
          <h1 className="font-serif text-2xl font-semibold text-slate-900">
            Profile not found
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            This user may have been removed or the link is incorrect.
          </p>
          <Link
            href="/map"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <ArrowLeft size={16} /> Back to the map
          </Link>
        </div>
      </div>
    )
  }

  const isMe = me?.id === profile.id
  const displayName = profile.name || profile.username || 'Subly user'
  const memberSince = new Date(profile.created_at).toLocaleDateString([], {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 antialiased">
      {header}

      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <Link
          href="/map"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
        >
          <ArrowLeft size={16} /> Back to the map
        </Link>

        {/* Profile header card */}
        <div className="mt-4 rounded-2xl border border-slate-200 p-6 shadow-sm sm:p-8">
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            {/* Avatar */}
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="h-20 w-20 shrink-0 rounded-full object-cover ring-2 ring-slate-100"
              />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-blue-500 text-2xl font-semibold text-white">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-serif text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                  {displayName}
                </h1>
                {isMe && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                    This is you
                  </span>
                )}
              </div>
              {profile.username && (
                <p className="text-sm text-slate-500">@{profile.username}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar size={13} /> Joined {memberSince}
                </span>
                {profile.location_name && (
                  <span className="flex items-center gap-1">
                    <MapPin size={13} /> {profile.location_name}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Building2 size={13} /> {listings.length}{' '}
                  {listings.length === 1 ? 'listing' : 'listings'}
                </span>
              </div>
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-slate-600">
              {profile.bio}
            </p>
          )}

          {/* Contact actions */}
          {!isMe && (
            <div className="mt-5 border-t border-slate-100 pt-5">
              {sent ? (
                <p className="text-sm font-medium text-green-600">
                  Message sent! {displayName} will see it in their inbox.
                </p>
              ) : composing ? (
                <div className="max-w-md space-y-2">
                  <textarea
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    rows={3}
                    placeholder={`Write a message to ${displayName}…`}
                    className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {sendError && (
                    <p className="text-xs text-red-600">{sendError}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={sendMessage}
                      disabled={sending || !messageBody.trim()}
                      className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                    >
                      {sending ? 'Sending…' : 'Send'}
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
                <div className="flex flex-wrap items-center gap-3">
                  {me ? (
                    <button
                      onClick={() => setComposing(true)}
                      className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                    >
                      <MessageSquare size={16} /> Message
                    </button>
                  ) : (
                    <Link
                      href="/auth"
                      className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                    >
                      <MessageSquare size={16} /> Sign in to message
                    </Link>
                  )}
                  {profile.email && (
                    <a
                      href={`mailto:${profile.email}`}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                    >
                      <Mail size={16} /> Email
                    </a>
                  )}
                  {me && (
                    <button
                      onClick={() => {
                        setReviewOpen(true)
                        setTimeout(() => {
                          reviewsSectionRef.current?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start',
                          })
                        }, 50)
                      }}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                    >
                      <Star size={16} /> Leave a review
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Listings */}
        <section className="mt-10">
          <h2 className="mb-4 font-serif text-xl font-semibold text-slate-900">
            {isMe ? 'Your listings' : `Listings by ${displayName}`}
          </h2>
          {listings.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 px-5 py-10 text-center text-sm text-slate-400">
              {isMe
                ? "You haven't posted any listings yet."
                : `${displayName} hasn't posted any listings yet.`}
            </p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </section>

        {/* Reviews — reuse the shared, self-contained section */}
        <section
          ref={reviewsSectionRef}
          className="mt-10 rounded-2xl border border-slate-200 p-6 shadow-sm sm:p-8"
        >
          <LandlordReviews
            subjectId={profile.id}
            subjectName={displayName}
            autoOpen={reviewOpen}
          />
        </section>
      </main>
    </div>
  )
}

// Compact listing card for the profile grid.
function ListingCard({ listing }: { listing: Listing }) {
  const cover = listing.images?.[0]
  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group overflow-hidden rounded-xl border border-slate-200 transition-shadow hover:shadow-md"
    >
      <div className="aspect-[4/3] overflow-hidden bg-slate-100">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={listing.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">
            No photo
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="truncate font-medium text-slate-900">
            {listing.title}
          </h3>
          <span className="shrink-0 text-sm font-semibold text-slate-900">
            ${listing.price}
            <span className="font-normal text-slate-400">/mo</span>
          </span>
        </div>
        <p className="mt-1 flex items-start gap-1 text-xs text-slate-500">
          <MapPin size={13} className="mt-0.5 shrink-0 text-slate-400" />
          <span className="line-clamp-1">
            <ListingAddress listing={listing} />
          </span>
        </p>
        <p className="mt-1.5 flex items-center gap-1 text-xs text-slate-400">
          <Ruler size={13} /> {listing.size} sq ft
        </p>
      </div>
    </Link>
  )
}
