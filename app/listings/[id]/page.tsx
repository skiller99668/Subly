'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  MapPin,
  Ruler,
  Calendar,
  Mail,
  MessageSquare,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  Heart,
  ArrowLeft,
  Loader2,
} from 'lucide-react'
import { useAuth } from '@/app/providers'
import { getSupabaseBrowserClient, Listing } from '@/utils/supabase'
import { TAG_BY_ID } from '@/utils/listingTags'
import ListingAddress from '@/components/ListingAddress'
import PropertyReviews from '@/components/PropertyReviews'
import ListingComments from '@/components/ListingComments'

// Full-screen listing page — the same information as the slide-over detail
// panel, laid out as a standalone page that matches the site's marketing UI
// (slate palette, serif headings, blue accents, backdrop-blur header).
export default function ListingPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const { user } = useAuth()
  const supabase = getSupabaseBrowserClient()

  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [activeImage, setActiveImage] = useState(0)
  const [isFav, setIsFav] = useState(false)

  // Message composer state.
  const [composing, setComposing] = useState(false)
  const [messageBody, setMessageBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [sent, setSent] = useState(false)

  // Fetch the listing.
  useEffect(() => {
    if (!id) return
    let active = true
    setLoading(true)
    fetch(`/api/listings/${id}`)
      .then(async (res) => {
        if (!active) return
        if (res.status === 404) {
          setMissing(true)
          return
        }
        if (res.ok) setListing(await res.json())
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

  // Is this listing already favorited by the signed-in user?
  useEffect(() => {
    if (!user || !id) {
      setIsFav(false)
      return
    }
    supabase
      .from('favorites')
      .select('listing_id')
      .eq('user_id', user.id)
      .eq('listing_id', id)
      .then(({ data }) => setIsFav(!!data && data.length > 0))
  }, [user, id, supabase])

  const toggleFavorite = async () => {
    if (!user || !listing) return
    const next = !isFav
    setIsFav(next)
    if (next) {
      await supabase
        .from('favorites')
        .insert({ user_id: user.id, listing_id: listing.id })
    } else {
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('listing_id', listing.id)
    }
  }

  const sendMessage = async () => {
    if (!messageBody.trim() || !listing) return
    setSending(true)
    setSendError('')
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiver_id: listing.user_id,
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
          {user ? (
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

  // ---- Loading / not-found states ----
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

  if (missing || !listing) {
    return (
      <div className="min-h-screen bg-white font-sans text-slate-900 antialiased">
        {header}
        <div className="mx-auto flex max-w-5xl flex-col items-center px-5 py-24 text-center">
          <h1 className="font-serif text-2xl font-semibold text-slate-900">
            Listing not found
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            This sublease may have been removed or the link is incorrect.
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

  const images = listing.images ?? []
  const landlord = listing.user
  const isOwnListing = user?.id === listing.user_id

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 antialiased">
      {header}

      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        {/* Back link */}
        <Link
          href="/map"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
        >
          <ArrowLeft size={16} /> Back to the map
        </Link>

        {/* Title + address */}
        <div className="mt-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              {listing.title}
            </h1>
            <div className="mt-2 flex items-start gap-1.5 text-sm text-slate-600">
              <MapPin size={16} className="mt-0.5 shrink-0 text-slate-400" />
              <ListingAddress listing={listing} />
            </div>
          </div>
          {user && (
            <button
              onClick={toggleFavorite}
              className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
              aria-label={isFav ? 'Remove from saved' : 'Save listing'}
            >
              <Heart
                size={18}
                className={isFav ? 'fill-red-500 text-red-500' : 'text-slate-500'}
              />
              <span className="hidden sm:inline">{isFav ? 'Saved' : 'Save'}</span>
            </button>
          )}
        </div>

        {/* Gallery */}
        <div className="mt-6">
          {images.length > 0 ? (
            <>
              <div className="relative overflow-hidden rounded-2xl bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={images[activeImage]}
                  alt={`${listing.title} photo ${activeImage + 1}`}
                  className="h-[300px] w-full object-cover sm:h-[460px]"
                />
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() =>
                        setActiveImage(
                          (activeImage - 1 + images.length) % images.length
                        )
                      }
                      className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-slate-700 shadow-sm backdrop-blur transition hover:bg-white"
                      aria-label="Previous photo"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      onClick={() =>
                        setActiveImage((activeImage + 1) % images.length)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-slate-700 shadow-sm backdrop-blur transition hover:bg-white"
                      aria-label="Next photo"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </>
                )}
              </div>
              {images.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {images.map((src, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImage(i)}
                      className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg ring-2 transition ${
                        i === activeImage
                          ? 'ring-blue-600'
                          : 'ring-transparent hover:ring-slate-200'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt={`Thumbnail ${i + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex h-[300px] items-center justify-center rounded-2xl bg-slate-100 text-sm text-slate-400 sm:h-[460px]">
              No photos provided
            </div>
          )}
        </div>

        {/* Body: content + sticky contact card */}
        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          {/* Main column */}
          <div className="space-y-8 lg:col-span-2">
            {/* Tags */}
            {listing.tags && listing.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {listing.tags.map((tagId) => {
                  const tag = TAG_BY_ID[tagId]
                  if (!tag) return null
                  const Icon = tag.icon
                  return (
                    <span
                      key={tagId}
                      className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700"
                    >
                      <Icon size={14} />
                      {tag.label}
                    </span>
                  )
                })}
              </div>
            )}

            {/* Description */}
            <section>
              <h2 className="mb-2 font-serif text-xl font-semibold text-slate-900">
                About this place
              </h2>
              <p className="whitespace-pre-line leading-relaxed text-slate-600">
                {listing.description}
              </p>
            </section>

            {/* Property reviews + comments */}
            <PropertyReviews listingId={listing.id} />
            <ListingComments listingId={listing.id} />
          </div>

          {/* Sticky contact / facts card */}
          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-24 rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-slate-900">
                  ${listing.price}
                </span>
                <span className="text-slate-500">/month</span>
              </div>

              {/* Key facts */}
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-slate-50 px-3 py-2.5">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Ruler size={14} /> Size
                  </div>
                  <div className="mt-0.5 font-medium text-slate-800">
                    {listing.size} sq ft
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2.5">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Calendar size={14} /> Move-in
                  </div>
                  <div className="mt-0.5 font-medium text-slate-800">
                    {listing.move_in_date}
                  </div>
                </div>
              </div>

              {/* Host + contact */}
              <div className="mt-5 border-t border-slate-100 pt-4">
                <Link
                  href={`/users/${listing.user_id}`}
                  className="group mb-3 flex items-center gap-2 text-sm text-slate-700"
                >
                  {landlord?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={landlord.avatar_url}
                      alt={landlord.name || landlord.username || 'Host'}
                      className="h-9 w-9 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500 font-semibold text-white">
                      {(landlord?.name || landlord?.username || 'U')
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <UserIcon size={14} className="text-slate-400" />
                      <span className="truncate font-medium text-slate-800 transition-colors group-hover:text-blue-600 group-hover:underline">
                        {landlord?.name || landlord?.username || 'Subly user'}
                      </span>
                    </div>
                    {landlord?.username && (
                      <span className="text-xs text-slate-400">
                        @{landlord.username}
                      </span>
                    )}
                  </div>
                </Link>

                {landlord?.email && (
                  <a
                    href={`mailto:${landlord.email}`}
                    className="mb-3 flex items-center gap-2 text-sm text-blue-600 transition-colors hover:text-blue-700"
                  >
                    <Mail size={15} /> {landlord.email}
                  </a>
                )}

                {isOwnListing ? (
                  <p className="text-xs text-slate-400">This is your listing.</p>
                ) : !user ? (
                  <Link
                    href="/auth"
                    className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                  >
                    <MessageSquare size={16} /> Sign in to message
                  </Link>
                ) : sent ? (
                  <p className="text-sm font-medium text-green-600">
                    Message sent!
                  </p>
                ) : composing ? (
                  <div className="space-y-2">
                    <textarea
                      value={messageBody}
                      onChange={(e) => setMessageBody(e.target.value)}
                      rows={3}
                      placeholder="Hi, is this still available?"
                      className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {sendError && (
                      <p className="text-xs text-red-600">{sendError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={sendMessage}
                        disabled={sending || !messageBody.trim()}
                        className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
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
                  <button
                    onClick={() => setComposing(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                  >
                    <MessageSquare size={16} /> Message host
                  </button>
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
