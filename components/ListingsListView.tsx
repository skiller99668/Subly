'use client'

import { useEffect, useState } from 'react'
import { Heart, MapPin, LayoutGrid, LayoutList } from 'lucide-react'
import { Listing } from '@/utils/supabase'
import { LISTING_TAGS, ListingTag } from '@/utils/listingTags'
import ListingAddress from './ListingAddress'

type Layout = 'grid' | 'list'

interface ListingsListViewProps {
  // When false the component renders nothing (the map shows through instead).
  open: boolean
  // Already filtered + sorted by the parent, so the order matches the map.
  listings: Listing[]
  favorites: Set<string>
  onToggleFavorite: (id: string) => void
  onSelect: (listing: Listing) => void
  // When the left Filters sidebar is open, shrink so its content stays visible
  // beside the sidebar (≥sm) instead of hiding behind it.
  sidebarOpen?: boolean
}

const LAYOUT_KEY = 'subly.listLayout'

// Quick id → tag lookup so cards can render the same chips the Filters panel uses.
const TAG_BY_ID = new Map(LISTING_TAGS.map((t) => [t.id, t]))

// Format a stored 'YYYY-MM-DD' move-in date as e.g. "Sep 1". Falls back to the
// raw value if it isn't parseable.
function formatMoveIn(date: string): string {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return date
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function resolveTags(listing: Listing): ListingTag[] {
  return (listing.tags ?? [])
    .map((id) => TAG_BY_ID.get(id))
    .filter((t): t is ListingTag => Boolean(t))
}

// The blue "$/mo" pill — the same shape the map drops as a pin, reused here so
// the two views read as one dataset. `compact` is the smaller list-row variant.
function PricePin({ price, compact = false }: { price: number; compact?: boolean }) {
  return (
    <span
      className={`absolute flex items-center rounded-full border-2 border-white bg-blue-600 font-bold leading-none text-white shadow-lg ${
        compact ? 'bottom-2 left-2 h-7 px-2 text-xs' : 'bottom-3 left-3 h-8 px-2.5 text-sm'
      }`}
    >
      ${price}
      <span className="ml-0.5 text-xs font-semibold opacity-90">/mo</span>
    </span>
  )
}

// Save/unsave toggle. Always a sibling of the card's click target (never nested
// inside it) and layered above it, so we never produce a <button> in a <button>.
function FavoriteButton({
  isFav,
  onToggle,
}: {
  isFav: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      aria-label={isFav ? 'Remove from saved' : 'Save listing'}
      aria-pressed={isFav}
      className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-sm backdrop-blur transition hover:bg-white hover:text-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      <Heart size={16} className={isFav ? 'fill-red-500 text-red-500' : ''} />
    </button>
  )
}

function TagChips({ tags, max = 3 }: { tags: ListingTag[]; max?: number }) {
  if (tags.length === 0) return null
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {tags.slice(0, max).map(({ id, label, icon: Icon }) => (
        <span
          key={id}
          className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
        >
          <Icon size={11} className="text-slate-400" />
          {label}
        </span>
      ))}
      {tags.length > max && (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
          +{tags.length - max}
        </span>
      )}
    </div>
  )
}

// Photo-forward card for the grid layout.
function GridCard({
  listing,
  isFav,
  onToggleFavorite,
  onSelect,
}: {
  listing: Listing
  isFav: boolean
  onToggleFavorite: (id: string) => void
  onSelect: (listing: Listing) => void
}) {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <button
        type="button"
        onClick={() => onSelect(listing)}
        aria-label={`View ${listing.title}`}
        className="absolute inset-0 z-10 rounded-2xl focus:outline-none"
      />

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

        <PricePin price={listing.price} />
        <FavoriteButton isFav={isFav} onToggle={() => onToggleFavorite(listing.id)} />
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3.5">
        <h2 className="truncate text-[15px] font-semibold text-slate-900">{listing.title}</h2>
        <p className="truncate text-xs text-slate-500">
          <ListingAddress listing={listing} />
        </p>
        <p className="text-xs text-slate-500">
          {listing.size} sq ft · Move-in {formatMoveIn(listing.move_in_date)}
        </p>
        <TagChips tags={resolveTags(listing)} />
      </div>
    </div>
  )
}

// Horizontal row for the list layout: thumbnail left, details (incl. a snippet
// of the description) right. Roomier than the grid, so it shows more per item.
function ListRow({
  listing,
  isFav,
  onToggleFavorite,
  onSelect,
}: {
  listing: Listing
  isFav: boolean
  onToggleFavorite: (id: string) => void
  onSelect: (listing: Listing) => void
}) {
  return (
    <div className="group relative flex gap-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow-md focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500">
      <button
        type="button"
        onClick={() => onSelect(listing)}
        aria-label={`View ${listing.title}`}
        className="absolute inset-0 z-10 rounded-2xl focus:outline-none"
      />

      <div className="relative h-28 w-40 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-32 sm:w-52">
        {listing.images && listing.images.length > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.images[0]}
            alt={listing.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
            No photo
          </div>
        )}
        <PricePin price={listing.price} compact />
      </div>

      <div className="flex min-w-0 flex-1 flex-col py-0.5 pr-9">
        <h2 className="truncate text-[15px] font-semibold text-slate-900">{listing.title}</h2>
        <p className="truncate text-xs text-slate-500">
          <ListingAddress listing={listing} />
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          {listing.size} sq ft · Move-in {formatMoveIn(listing.move_in_date)}
        </p>
        {listing.description && (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-600">
            {listing.description}
          </p>
        )}
        <TagChips tags={resolveTags(listing)} />
      </div>

      <FavoriteButton isFav={isFav} onToggle={() => onToggleFavorite(listing.id)} />
    </div>
  )
}

// Full-screen view of the same listings the map is showing — the "List" half of
// the Map/List toggle. Sits below the top bar and beneath the Filters and detail
// panels, so both still open over it. Offers two layouts: a photo-forward grid
// and a roomier single-column list; the choice persists across visits.
export default function ListingsListView({
  open,
  listings,
  favorites,
  onToggleFavorite,
  onSelect,
  sidebarOpen = false,
}: ListingsListViewProps) {
  const [layout, setLayout] = useState<Layout>('list')

  // Restore the saved layout after mount (reading storage during render would
  // risk a hydration mismatch).
  useEffect(() => {
    const saved = localStorage.getItem(LAYOUT_KEY)
    if (saved === 'grid' || saved === 'list') setLayout(saved)
  }, [])

  const chooseLayout = (next: Layout) => {
    setLayout(next)
    try {
      localStorage.setItem(LAYOUT_KEY, next)
    } catch {
      // Private mode / quota — non-fatal, just don't persist.
    }
  }

  if (!open) return null

  const toggleBtn = (value: Layout, Icon: typeof LayoutGrid, label: string) => {
    const active = layout === value
    return (
      <button
        type="button"
        onClick={() => chooseLayout(value)}
        aria-pressed={active}
        title={label}
        aria-label={label}
        className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
          active
            ? 'bg-blue-50 text-blue-600'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
        <Icon size={18} />
      </button>
    )
  }

  return (
    <div className="fixed inset-x-0 bottom-0 top-16 z-40 bg-slate-50">
      {/* Solid background above fills the whole map area, so the map never
          shows through. Only the scroll area below shifts to clear the
          Filters sidebar — the vacated strip stays blank, not see-through. */}
      <div
        className={`h-full overflow-y-auto transition-[padding] duration-200 motion-reduce:transition-none ${
          sidebarOpen ? 'sm:pl-96' : ''
        }`}
      >
        <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6">
        {/* Header: count + layout toggle */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold tracking-tight text-slate-900">
            {listings.length} {listings.length === 1 ? 'sublease' : 'subleases'}
          </h1>
          <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
            {toggleBtn('grid', LayoutGrid, 'Grid view')}
            {toggleBtn('list', LayoutList, 'List view')}
          </div>
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
        ) : layout === 'grid' ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listings.map((listing) => (
              <GridCard
                key={listing.id}
                listing={listing}
                isFav={favorites.has(listing.id)}
                onToggleFavorite={onToggleFavorite}
                onSelect={onSelect}
              />
            ))}
          </div>
        ) : (
          <div className="mx-auto flex max-w-4xl flex-col gap-3">
            {listings.map((listing) => (
              <ListRow
                key={listing.id}
                listing={listing}
                isFav={favorites.has(listing.id)}
                onToggleFavorite={onToggleFavorite}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
