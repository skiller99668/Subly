'use client'

import { Heart, MapPin } from 'lucide-react'
import { Listing } from '@/utils/supabase'
import { LISTING_TAGS } from '@/utils/listingTags'
import ListingAddress from './ListingAddress'

interface ListingsListViewProps {
  // When false the component renders nothing (the map shows through instead).
  open: boolean
  // Already filtered + sorted by the parent, so the order matches the map.
  listings: Listing[]
  favorites: Set<string>
  onToggleFavorite: (id: string) => void
  onSelect: (listing: Listing) => void
}

// Quick id → tag lookup so cards can render the same chips the Filters panel uses.
const TAG_BY_ID = new Map(LISTING_TAGS.map((t) => [t.id, t]))

// Format a stored 'YYYY-MM-DD' move-in date as e.g. "Sep 1". Falls back to the
// raw value if it isn't parseable.
function formatMoveIn(date: string): string {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return date
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// Full-screen gallery of the same listings the map is showing — the "List"
// half of the Map/List toggle. Sits below the top bar and beneath the Filters
// and detail panels, so both still open over it. Photo-forward cards carry the
// map's price pin and favorite heart, tying the two views to one dataset.
export default function ListingsListView({
  open,
  listings,
  favorites,
  onToggleFavorite,
  onSelect,
}: ListingsListViewProps) {
  if (!open) return null

  return (
    <div className="fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto bg-slate-50">
      <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6">
        {/* Count header */}
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h1 className="text-lg font-semibold tracking-tight text-slate-900">
            {listings.length} {listings.length === 1 ? 'sublease' : 'subleases'}
          </h1>
          <span className="text-sm text-slate-400">Matching your filters</span>
        </div>

        {listings.length === 0 ? (
          <div className="mx-auto mt-24 max-w-sm text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <MapPin size={22} />
            </div>
            <p className="font-medium text-slate-700">No subleases match your filters</p>
            <p className="mt-1 text-sm text-slate-400">
              Try clearing a filter or two, or search a different area.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listings.map((listing) => {
              const isFav = favorites.has(listing.id)
              const tags = (listing.tags ?? [])
                .map((id) => TAG_BY_ID.get(id))
                .filter((t): t is NonNullable<typeof t> => Boolean(t))

              return (
                <button
                  key={listing.id}
                  onClick={() => onSelect(listing)}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  {/* Photo with the map's price pin + favorite heart overlaid */}
                  <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-slate-100">
                    {listing.images && listing.images.length > 0 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={listing.images[0]}
                        alt={listing.title}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                        No photo
                      </div>
                    )}

                    {/* Price pin — the same pill the map drops at this listing. */}
                    <span className="absolute bottom-3 left-3 flex h-8 items-center rounded-full border-2 border-white bg-blue-600 px-2.5 text-sm font-bold leading-none text-white shadow-lg">
                      ${listing.price}
                      <span className="ml-0.5 text-xs font-semibold opacity-90">/mo</span>
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggleFavorite(listing.id)
                      }}
                      aria-label={isFav ? 'Remove from saved' : 'Save listing'}
                      aria-pressed={isFav}
                      className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-sm backdrop-blur transition hover:bg-white hover:text-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      <Heart size={16} className={isFav ? 'fill-red-500 text-red-500' : ''} />
                    </button>
                  </div>

                  {/* Details */}
                  <div className="flex flex-1 flex-col gap-1 p-3.5">
                    <h2 className="truncate text-[15px] font-semibold text-slate-900">
                      {listing.title}
                    </h2>
                    <p className="truncate text-xs text-slate-500">
                      <ListingAddress listing={listing} />
                    </p>
                    <p className="text-xs text-slate-500">
                      {listing.size} sq ft · Move-in {formatMoveIn(listing.move_in_date)}
                    </p>

                    {tags.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {tags.slice(0, 3).map(({ id, label, icon: Icon }) => (
                          <span
                            key={id}
                            className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                          >
                            <Icon size={11} className="text-slate-400" />
                            {label}
                          </span>
                        ))}
                        {tags.length > 3 && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                            +{tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
