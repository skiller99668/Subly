'use client'

import { X } from 'lucide-react'
import { Listing } from '@/utils/supabase'
import ListingAddress from './ListingAddress'

// Listings sharing (almost) the same coordinates, grouped under one pin.
export interface ListingGroup {
  key: string
  lng: number
  lat: number
  listings: Listing[]
}

interface LocationListingsPanelProps {
  group: ListingGroup | null
  onClose: () => void
  onSelect: (listing: Listing) => void
}

// Side panel listing every sublease posted at one location (e.g. an apartment
// building or multiple rooms in the same unit). Clicking one opens its detail.
export default function LocationListingsPanel({
  group,
  onClose,
  onSelect,
}: LocationListingsPanelProps) {
  if (!group) return null

  return (
    <>
      {/* Dimmed backdrop — click outside to close */}
      <div
        className="fixed inset-0 bg-black/30 z-[58]"
        onClick={onClose}
        aria-hidden
      />

      {/* Slide-in panel */}
      <div className="fixed inset-y-0 right-0 z-[59] w-full sm:max-w-lg bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              Listings in this area
            </h2>
            <p className="text-sm text-gray-500">
              {group.listings.length} available
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            aria-label="Close"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {group.listings.map((listing) => (
            <button
              key={listing.id}
              onClick={() => onSelect(listing)}
              className="flex gap-3 p-3 w-full text-left border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-gray-50 transition"
            >
              {/* Thumbnail */}
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

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-gray-800 truncate">
                  {listing.title}
                </h3>
                <p className="text-xs text-gray-500 truncate">
                  <ListingAddress listing={listing} />
                </p>
                <p className="text-sm font-bold text-gray-900">
                  ${listing.price}
                  <span className="font-normal text-gray-500">/mo</span>
                </p>
                <p className="text-xs text-gray-500">
                  {listing.size} sq ft · Move-in {listing.move_in_date}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
