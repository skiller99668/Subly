'use client'

import { X, MapPin } from 'lucide-react'
import { Listing } from '@/utils/supabase'
import ListingAddress from './ListingAddress'

interface AreaListingsPanelProps {
  // The searched place (null = panel closed).
  location: { name: string } | null
  // Listings near the searched location, ordered by the active Filters sort.
  listings: Listing[]
  onClose: () => void
  onSelect: (listing: Listing) => void
}

// Left-hand panel (Google-Maps style) that lists leases near a searched place.
// Non-modal: the map stays visible and interactive on the right.
export default function AreaListingsPanel({
  location,
  listings,
  onClose,
  onSelect,
}: AreaListingsPanelProps) {
  if (!location) return null

  return (
    <div className="fixed top-16 bottom-0 left-0 z-[55] w-full sm:w-96 bg-white shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 px-5 py-4 border-b">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-gray-800">Nearby leases</h2>
          <p className="flex items-center gap-1 text-sm text-gray-500 truncate">
            <MapPin size={14} className="shrink-0 text-gray-400" />
            <span className="truncate">{location.name}</span>
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition shrink-0"
          aria-label="Close"
        >
          <X size={20} className="text-gray-600" />
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {listings.length === 0 ? (
          <div className="text-center mt-12 px-4">
            <p className="text-gray-700 font-medium">No leases here yet</p>
            <p className="text-sm text-gray-400 mt-1">
              There aren&apos;t any subleases near this spot. Try a different
              area, or be the first to post one here.
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-3">
              {listings.length} {listings.length === 1 ? 'lease' : 'leases'} in
              this area
            </p>
            <div className="space-y-3">
              {listings.map((listing) => (
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
          </>
        )}
      </div>
    </div>
  )
}
