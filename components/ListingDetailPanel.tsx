'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  X,
  MapPin,
  Ruler,
  Calendar,
  Mail,
  MessageSquare,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  Heart,
  ArrowUpRight,
} from 'lucide-react'
import { useAuth } from '@/app/providers'
import { Listing } from '@/utils/supabase'
import { TAG_BY_ID } from '@/utils/listingTags'
import ListingAddress from './ListingAddress'
import LandlordReviews from './LandlordReviews'
import ListingComments from './ListingComments'

interface ListingDetailPanelProps {
  listing: Listing | null
  onClose: () => void
  isFavorited?: boolean
  onToggleFavorite?: (listingId: string) => void
}

export default function ListingDetailPanel({
  listing,
  onClose,
  isFavorited = false,
  onToggleFavorite,
}: ListingDetailPanelProps) {
  const { user } = useAuth()
  const [activeImage, setActiveImage] = useState(0)
  const [composing, setComposing] = useState(false)
  const [messageBody, setMessageBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [sent, setSent] = useState(false)

  if (!listing) return null

  const images = listing.images ?? []
  const landlord = listing.user
  const isOwnListing = user?.id === listing.user_id

  const sendMessage = async () => {
    if (!messageBody.trim()) return
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

  return (
    <>
      {/* Dimmed backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-[60]"
        onClick={onClose}
        aria-hidden
      />

      {/* Slide-in panel */}
      <div className="fixed inset-y-0 right-0 z-[61] w-full sm:max-w-md bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <Link
            href={`/listings/${listing.id}`}
            className="group flex min-w-0 items-center gap-1.5 pr-4 text-gray-800 transition-colors hover:text-blue-600"
            title="Open full listing page"
          >
            <h2 className="truncate text-lg font-bold">{listing.title}</h2>
            <ArrowUpRight
              size={16}
              className="shrink-0 text-gray-400 transition-colors group-hover:text-blue-600"
            />
          </Link>
          <div className="flex items-center gap-1 shrink-0">
            {/* Save / favorite (signed-in users only) */}
            {user && (
              <button
                onClick={() => onToggleFavorite?.(listing.id)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
                aria-label={isFavorited ? 'Remove from saved' : 'Save listing'}
                title={isFavorited ? 'Remove from saved' : 'Save listing'}
              >
                <Heart
                  size={20}
                  className={
                    isFavorited ? 'text-red-500 fill-red-500' : 'text-gray-600'
                  }
                />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              aria-label="Close"
            >
              <X size={20} className="text-gray-600" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Image gallery */}
          <div className="relative bg-gray-100">
            {images.length > 0 ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={images[activeImage]}
                  alt={`${listing.title} photo ${activeImage + 1}`}
                  className="w-full h-64 object-cover"
                />
                {images.length > 1 && (
                  <>
                    {/* Prev / next arrows */}
                    <button
                      onClick={() =>
                        setActiveImage(
                          (activeImage - 1 + images.length) % images.length
                        )
                      }
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition"
                      aria-label="Previous photo"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      onClick={() =>
                        setActiveImage((activeImage + 1) % images.length)
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition"
                      aria-label="Next photo"
                    >
                      <ChevronRight size={18} />
                    </button>

                    {/* Dot indicators */}
                    <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                      {images.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveImage(i)}
                          className={`w-2 h-2 rounded-full transition ${
                            i === activeImage ? 'bg-white' : 'bg-white/50'
                          }`}
                          aria-label={`Go to photo ${i + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-64 flex items-center justify-center text-gray-400 text-sm">
                No photos provided
              </div>
            )}
          </div>

          {/* Details */}
          <div className="px-6 py-5 space-y-5">
            {/* Price */}
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-gray-900">
                ${listing.price}
              </span>
              <span className="text-gray-500">/month</span>
            </div>

            {/* Address */}
            <div className="flex items-start gap-2 text-sm text-gray-700">
              <MapPin size={16} className="text-gray-400 shrink-0 mt-0.5" />
              <span>
                <ListingAddress listing={listing} />
              </span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-700">
                <Ruler size={16} className="text-gray-400" />
                {listing.size} sq ft
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Calendar size={16} className="text-gray-400" />
                {listing.move_in_date}
              </div>
            </div>

            {/* Student attribute tags */}
            {listing.tags && listing.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {listing.tags.map((id) => {
                  const tag = TAG_BY_ID[id]
                  if (!tag) return null
                  const Icon = tag.icon
                  return (
                    <span
                      key={id}
                      className="flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
                    >
                      <Icon size={13} />
                      {tag.label}
                    </span>
                  )
                })}
              </div>
            )}

            {/* Description */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">
                Description
              </h3>
              <p className="text-sm text-gray-600 whitespace-pre-line">
                {listing.description}
              </p>
            </div>

            {/* Landlord contact */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Contact
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                <UserIcon size={16} className="text-gray-400" />
                <Link
                  href={`/users/${listing.user_id}`}
                  className="font-medium transition-colors hover:text-blue-600 hover:underline"
                >
                  {landlord?.name || landlord?.username || 'Subly user'}
                </Link>
                {landlord?.username && (
                  <span className="text-gray-400">@{landlord.username}</span>
                )}
              </div>
              {landlord?.email && (
                <a
                  href={`mailto:${landlord.email}`}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 mb-3"
                >
                  <Mail size={16} />
                  {landlord.email}
                </a>
              )}

              {isOwnListing ? (
                <p className="text-xs text-gray-400">This is your listing.</p>
              ) : !user ? (
                <p className="text-xs text-gray-400">
                  Sign in to message the landlord.
                </p>
              ) : sent ? (
                <p className="text-sm text-green-600">Message sent!</p>
              ) : composing ? (
                <div className="space-y-2">
                  <textarea
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    rows={3}
                    placeholder="Hi, is this still available?"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                  />
                  {sendError && (
                    <p className="text-xs text-red-600">{sendError}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={sendMessage}
                      disabled={sending || !messageBody.trim()}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium py-2 rounded-lg transition disabled:opacity-50"
                    >
                      {sending ? 'Sending…' : 'Send'}
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
                  onClick={() => setComposing(true)}
                  className="flex items-center justify-center gap-2 w-full bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium py-2 rounded-lg transition"
                >
                  <MessageSquare size={16} /> Message landlord
                </button>
              )}
            </div>

            {/* Host / landlord reviews */}
            <LandlordReviews
              subjectId={listing.user_id}
              subjectName={landlord?.name || landlord?.username || 'this host'}
            />

            {/* Listing discussion */}
            <ListingComments listingId={listing.id} />
          </div>
        </div>
      </div>
    </>
  )
}
