'use client'

import { X, Heart } from 'lucide-react'
import { Listing } from '@/utils/supabase'
import ListingAddress from './ListingAddress'

interface SavedListingsPanelProps {
  open: boolean
  onClose: () => void
  listings: Listing[]
  onSelect: (listing: Listing) => void
  onToggleFavorite: (listingId: string) => void
}

// Panel of the user's saved (favorited) listings — same card UI as My Listings.
export default function SavedListingsPanel({
  open,
  onClose,
  listings,
  onSelect,
  onToggleFavorite,
}: SavedListingsPanelProps) {
  if (!open) return null

  return (
    <>
      {/* Dimmed backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-[58]"
        onClick={onClose}
        aria-hidden
      />

      {/* Slide-in panel */}
      <div className="fixed inset-y-0 right-0 z-[59] w-full sm:max-w-lg bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">Saved Listings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            aria-label="Close"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {listings.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-10">
              You haven&apos;t saved any listings yet. Tap the heart on a listing
              to save it.
            </p>
          ) : (
            <div className="space-y-3">
              {listings.map((listing) => (
                <div
                  key={listing.id}
                  className="flex gap-3 p-3 border border-gray-200 rounded-lg"
                >
                  {/* Thumbnail + info (click to view) */}
                  <button
                    onClick={() => onSelect(listing)}
                    className="flex gap-3 flex-1 min-w-0 text-left"
                  >
                    <div className="w-20 h-20 shrink-0 rounded-md overflow-hidden bg-gray-100">
                      {listing.images && listing.images.length > 0 ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={listing.images[0]}
                          alt={listing.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">
                          No photo
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-gray-800 truncate">
                        {listing.title}
                      </h3>
                      <p className="text-xs text-gray-500 truncate">
                        <ListingAddress listing={listing} />
                      </p>
                      <p className="text-sm text-gray-600">
                        ${listing.price}/mo · {listing.size} sq ft
                      </p>
                      <p className="text-xs text-gray-400">
                        Move-in: {listing.move_in_date}
                      </p>
                    </div>
                  </button>

                  {/* Unfavorite */}
                  <button
                    onClick={() => onToggleFavorite(listing.id)}
                    className="p-2 h-fit text-red-500 hover:bg-gray-100 rounded-lg transition"
                    aria-label="Remove from saved"
                    title="Remove from saved"
                  >
                    <Heart size={18} className="fill-red-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
