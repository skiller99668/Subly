'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { geocodePlaces, GeoResult } from '@/utils/geocode'
import {
  ListingFilters,
  EMPTY_FILTERS,
  RadiusUnit,
  SortBy,
  radiusToKm,
} from '@/utils/filters'
import { LISTING_TAGS } from '@/utils/listingTags'
import {
  Search,
  Sliders,
  Share2,
  Heart,
  MessagesSquare,
  Plus,
  BarChart3,
  Bell,
  MapIcon,
  List,
  X,
  RotateCcw,
  Calendar,
  DollarSign,
  Ruler,
  MapPin,
  ChevronDown,
  LogOut,
} from 'lucide-react'

interface MenuState {
  searchOpen: boolean
  filtersOpen: boolean
  compareMode: boolean
  showFavoritesOnly: boolean
  listView: boolean
  notificationsOpen: boolean
  accountMenuOpen: boolean
  savedSearchesOpen: boolean
}

interface Filters {
  // Null = no bound (so an empty input doesn't exclude anything).
  minPrice: number | null
  maxPrice: number | null
  minSize: number | null
  maxSize: number | null
  // Proximity: a chosen center plus a radius expressed in the chosen unit.
  near: { lng: number; lat: number; name: string } | null
  radius: number
  radiusUnit: RadiusUnit
  moveInDateStart: string
  moveInDateEnd: string
  sortBy: SortBy
}

interface TopMenuProps {
  onLocationSelect?: (
    lng: number,
    lat: number,
    name: string,
    zoom?: number,
    dropPin?: boolean
  ) => void
  onPostLease?: () => void
  onMyListings?: () => void
  onMessages?: () => void
  onSearchClose?: () => void
  onSavedSearches?: () => void
  onToggleFavoritesOnly?: () => void
  favoritesOnly?: boolean
  unreadCount?: number
  // Returns the current map center so suggestions can be sorted by proximity.
  getProximity?: () => { lng: number; lat: number } | undefined
  // Push the applied price/size/date/proximity filters up to the map.
  onApplyFilters?: (filters: ListingFilters) => void
  // Number of active filter groups, for the button's count badge.
  activeFilterCount?: number
  // Student attribute tag chips (moved into the Filters sidebar).
  activeTags?: string[]
  onToggleTag?: (id: string) => void
  onClearTags?: () => void
}

const RECENTS_KEY = 'subly.recentSearches'
const MAX_RECENTS = 6

// Slider bounds per radius unit (walk = estimated minutes on foot).
const RADIUS_CONFIG: Record<
  RadiusUnit,
  { min: number; max: number; step: number; label: string }
> = {
  km: { min: 0.5, max: 25, step: 0.5, label: 'km' },
  mi: { min: 0.5, max: 15, step: 0.5, label: 'mi' },
  walk: { min: 5, max: 60, step: 5, label: 'min walk' },
}

const DEFAULT_FILTERS: Filters = {
  minPrice: null,
  maxPrice: null,
  minSize: null,
  maxSize: null,
  near: null,
  radius: 15,
  radiusUnit: 'walk',
  moveInDateStart: '',
  moveInDateEnd: '',
  sortBy: 'newest',
}

export default function TopMenu({
  onLocationSelect,
  onPostLease,
  onMyListings,
  onMessages,
  onSearchClose,
  onSavedSearches,
  onToggleFavoritesOnly,
  favoritesOnly = false,
  unreadCount = 0,
  getProximity,
  onApplyFilters,
  activeFilterCount = 0,
  activeTags = [],
  onToggleTag,
  onClearTags,
}: TopMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [menu, setMenu] = useState<MenuState>({
    searchOpen: false,
    filtersOpen: false,
    compareMode: false,
    showFavoritesOnly: false,
    listView: false,
    notificationsOpen: false,
    accountMenuOpen: false,
    savedSearchesOpen: false,
  })

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<GeoResult[]>([])
  const [searching, setSearching] = useState(false)
  const [recentSearches, setRecentSearches] = useState<GeoResult[]>([])

  // Proximity ("Near a location") geocoding state for the Filters panel.
  const [nearQuery, setNearQuery] = useState('')
  const [nearResults, setNearResults] = useState<GeoResult[]>([])
  const [nearSearching, setNearSearching] = useState(false)

  // Load recent searches from localStorage on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENTS_KEY)
      if (raw) setRecentSearches(JSON.parse(raw))
    } catch {
      // ignore malformed storage
    }
  }, [])

  // Clear the dropped map pin when the search dropdown is dismissed — but not
  // when it closed because the user just selected a place (we keep that pin).
  const prevSearchOpen = useRef(false)
  const justSelected = useRef(false)
  useEffect(() => {
    if (prevSearchOpen.current && !menu.searchOpen) {
      if (justSelected.current) {
        justSelected.current = false
      } else {
        onSearchClose?.()
      }
    }
    prevSearchOpen.current = menu.searchOpen
  }, [menu.searchOpen, onSearchClose])
  // Placeholder counters until compare/messages/notifications are wired up.
  const [compareCount] = useState(0)
  const [notifications] = useState(2)

  // Debounced Mapbox geocoding for the "find subleases in <place>" search.
  useEffect(() => {
    const q = searchQuery.trim()
    if (q.length < 3) {
      setSearchResults([])
      return
    }
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token) return

    setSearching(true)
    const timer = setTimeout(async () => {
      try {
        setSearchResults(await geocodePlaces(q, token, getProximity?.()))
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Debounced geocoding for the Filters panel's "Near a location" picker.
  useEffect(() => {
    const q = nearQuery.trim()
    if (q.length < 3) {
      setNearResults([])
      return
    }
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token) return

    setNearSearching(true)
    const timer = setTimeout(async () => {
      try {
        setNearResults(await geocodePlaces(q, token, getProximity?.()))
      } catch {
        setNearResults([])
      } finally {
        setNearSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [nearQuery])

  const persistRecents = (next: GeoResult[]) => {
    setRecentSearches(next)
    try {
      localStorage.setItem(RECENTS_KEY, JSON.stringify(next))
    } catch {
      // ignore storage failures (private mode, quota, etc.)
    }
  }

  const removeRecent = (name: string) => {
    persistRecents(recentSearches.filter((r) => r.name !== name))
  }

  const clearRecents = () => persistRecents([])

  const selectLocation = (result: GeoResult) => {
    // Keep the dropped pin for this selection (don't clear on dropdown close).
    justSelected.current = true
    onLocationSelect?.(
      result.lng,
      result.lat,
      result.name,
      result.zoom,
      result.isAddress
    )
    // Move this search to the front of the recents list (deduped, capped).
    const deduped = recentSearches.filter((r) => r.name !== result.name)
    persistRecents([result, ...deduped].slice(0, MAX_RECENTS))
    setSearchQuery('')
    setSearchResults([])
    setMenu((prev) => ({ ...prev, searchOpen: false }))
  }

  const toggleMenu = (key: keyof MenuState) => {
    setMenu((prev) => ({
      ...prev,
      [key]: !prev[key],
      // Close other menus
      ...(key !== 'searchOpen' && { searchOpen: false }),
      ...(key !== 'filtersOpen' && { filtersOpen: false }),
      ...(key !== 'notificationsOpen' && { notificationsOpen: false }),
      ...(key !== 'accountMenuOpen' && { accountMenuOpen: false }),
      ...(key !== 'savedSearchesOpen' && { savedSearchesOpen: false }),
    }))
  }

  // Translate the panel's draft state into the map's filter model.
  const buildFilters = (): ListingFilters => ({
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    minSize: filters.minSize,
    maxSize: filters.maxSize,
    moveInStart: filters.moveInDateStart || null,
    moveInEnd: filters.moveInDateEnd || null,
    near: filters.near,
    radiusKm: filters.near ? radiusToKm(filters.radius, filters.radiusUnit) : null,
    sortBy: filters.sortBy,
  })

  const applyFilters = () => {
    onApplyFilters?.(buildFilters())
    setMenu((prev) => ({ ...prev, filtersOpen: false }))
  }

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS)
    setNearQuery('')
    setNearResults([])
    onApplyFilters?.(EMPTY_FILTERS)
    onClearTags?.()
  }

  // Switching units keeps the radius within the new unit's slider bounds.
  const setRadiusUnit = (unit: RadiusUnit) => {
    const cfg = RADIUS_CONFIG[unit]
    setFilters((f) => ({
      ...f,
      radiusUnit: unit,
      radius: Math.min(Math.max(f.radius, cfg.min), cfg.max),
    }))
  }

  const selectNear = (result: GeoResult) => {
    setFilters((f) => ({
      ...f,
      near: { lng: result.lng, lat: result.lat, name: result.name },
    }))
    setNearQuery('')
    setNearResults([])
  }

  const useMapCenterAsNear = () => {
    const c = getProximity?.()
    if (c) {
      setFilters((f) => ({
        ...f,
        near: { lng: c.lng, lat: c.lat, name: 'Map center' },
      }))
    }
  }

  const handlePostLease = () => {
    if (!user) {
      router.push('/auth')
    } else {
      onPostLease?.()
    }
  }

  // Handle click outside to close menus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        // Close transient dropdowns, but keep the Filters slide-over open so
        // the map and the rest of the UI stay fully interactive while it's up.
        setMenu((prev) => ({
          searchOpen: false,
          filtersOpen: prev.filtersOpen,
          compareMode: prev.compareMode,
          showFavoritesOnly: prev.showFavoritesOnly,
          listView: prev.listView,
          notificationsOpen: false,
          accountMenuOpen: false,
          savedSearchesOpen: false,
        }))
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={menuRef} className="absolute top-0 left-0 right-0 z-50">
      {/* Top Menu Bar */}
      <div className="border-b border-slate-200/70 bg-white/85 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-5">
          {/* Left Side Menu Items */}
          <div className="flex items-center gap-1">
            {/* Home */}
            <Link
              href="/"
              className="mr-1 flex items-center gap-2 rounded-lg pr-2.5 transition-colors"
              title="Back to home"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600">
                <MapPin className="h-4 w-4 text-white" strokeWidth={2.5} />
              </span>
              <span className="hidden text-[17px] font-semibold tracking-tight text-slate-900 sm:inline">
                Subly
              </span>
            </Link>

            {/* Search */}
            <div className="relative">
              <button
                onClick={() => toggleMenu('searchOpen')}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                title="Search"
              >
                <Search size={18} />
              </button>
              {menu.searchOpen && (
                <div className="absolute top-12 left-0 w-80 bg-white border border-slate-200 rounded-lg shadow-lg p-4">
                  <input
                    type="text"
                    placeholder="Find subleases in a city or area..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  {searchQuery.trim().length >= 3 ? (
                    /* Live geocoding results */
                    <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
                      {searching && (
                        <div className="text-sm text-slate-400 p-2">Searching…</div>
                      )}
                      {!searching && searchResults.length === 0 && (
                        <div className="text-sm text-slate-400 p-2">No matches found</div>
                      )}
                      {searchResults.map((result, i) => (
                        <button
                          key={`${result.lng},${result.lat},${i}`}
                          onClick={() => selectLocation(result)}
                          className="w-full text-left text-sm text-slate-600 p-2 hover:bg-slate-50 rounded"
                        >
                          📍 {result.name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    /* Recent searches */
                    recentSearches.length > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between px-1 mb-1">
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                            Recent
                          </span>
                          <button
                            onClick={clearRecents}
                            className="text-xs text-slate-400 hover:text-red-500 transition"
                          >
                            Clear all
                          </button>
                        </div>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {recentSearches.map((result, i) => (
                            <div
                              key={`${result.lng},${result.lat},${i}`}
                              className="group flex items-center rounded hover:bg-slate-50"
                            >
                              <button
                                onClick={() => selectLocation(result)}
                                className="flex-1 text-left text-sm text-slate-600 p-2 truncate"
                              >
                                🕘 {result.name}
                              </button>
                              <button
                                onClick={() => removeRecent(result.name)}
                                aria-label={`Remove ${result.name}`}
                                className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 transition"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            {/* Filters */}
            <div className="relative">
              <button
                onClick={() => toggleMenu('filtersOpen')}
                className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                title="Filters"
              >
                <Sliders size={18} />
                <span className="text-sm font-medium">Filters</span>
                {activeFilterCount + activeTags.length > 0 && (
                  <span className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                    {activeFilterCount + activeTags.length}
                  </span>
                )}
              </button>
              {menu.filtersOpen && createPortal(
                <div className="fixed top-16 bottom-0 left-0 z-[55] flex w-full flex-col bg-white shadow-2xl sm:w-96">
                  {/* Sidebar header */}
                  <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                    <h3 className="text-lg font-semibold text-slate-900">Filters</h3>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={resetFilters}
                        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                      >
                        <RotateCcw size={14} /> Reset
                      </button>
                      <button
                        onClick={() =>
                          setMenu((prev) => ({ ...prev, filtersOpen: false }))
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Close filters"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Scrollable filter body */}
                  <div className="flex-1 overflow-y-auto px-5 py-4">
                  {/* Tags */}
                  <div className="mb-5">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                      <Sliders size={16} /> Tags
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {LISTING_TAGS.map(({ id, label, icon: Icon }) => {
                        const on = activeTags.includes(id)
                        return (
                          <button
                            key={id}
                            onClick={() => onToggleTag?.(id)}
                            aria-pressed={on}
                            title={label}
                            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                              on
                                ? 'border-blue-600 bg-blue-600 text-white'
                                : 'border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-50'
                            }`}
                          >
                            <Icon size={14} />
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Price Range */}
                  <div className="mb-4">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                      <DollarSign size={16} /> Price Range
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.minPrice ?? ''}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            minPrice: e.target.value === '' ? null : Number(e.target.value),
                          })
                        }
                        className="w-1/2 px-2 py-1 border border-slate-300 rounded text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.maxPrice ?? ''}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            maxPrice: e.target.value === '' ? null : Number(e.target.value),
                          })
                        }
                        className="w-1/2 px-2 py-1 border border-slate-300 rounded text-sm"
                      />
                    </div>
                  </div>

                  {/* Size Range */}
                  <div className="mb-4">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                      <Ruler size={16} /> Size (sq ft)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.minSize ?? ''}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            minSize: e.target.value === '' ? null : Number(e.target.value),
                          })
                        }
                        className="w-1/2 px-2 py-1 border border-slate-300 rounded text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.maxSize ?? ''}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            maxSize: e.target.value === '' ? null : Number(e.target.value),
                          })
                        }
                        className="w-1/2 px-2 py-1 border border-slate-300 rounded text-sm"
                      />
                    </div>
                  </div>

                  {/* Proximity to a location */}
                  <div className="mb-4">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                      <MapPin size={16} /> Near a location
                    </label>

                    {filters.near ? (
                      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-blue-50 rounded-lg">
                        <span className="text-sm text-blue-700 truncate">
                          📍 {filters.near.name}
                        </span>
                        <button
                          onClick={() => setFilters({ ...filters, near: null })}
                          className="text-blue-400 hover:text-blue-600 shrink-0"
                          aria-label="Clear location"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="text"
                          placeholder="Search a campus, address, or area…"
                          value={nearQuery}
                          onChange={(e) => setNearQuery(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {nearQuery.trim().length >= 3 && (
                          <div className="mt-1 border border-slate-200 rounded-lg max-h-40 overflow-y-auto">
                            {nearSearching && (
                              <div className="text-sm text-slate-400 p-2">Searching…</div>
                            )}
                            {!nearSearching && nearResults.length === 0 && (
                              <div className="text-sm text-slate-400 p-2">
                                No matches found
                              </div>
                            )}
                            {nearResults.map((result, i) => (
                              <button
                                key={`${result.lng},${result.lat},${i}`}
                                onClick={() => selectNear(result)}
                                className="w-full text-left text-sm text-slate-600 p-2 hover:bg-slate-50"
                              >
                                📍 {result.name}
                              </button>
                            ))}
                          </div>
                        )}
                        <button
                          onClick={useMapCenterAsNear}
                          className="mt-1.5 text-xs text-blue-500 hover:text-blue-600"
                        >
                          Use current map center
                        </button>
                      </div>
                    )}

                    {/* Radius + unit — only meaningful once a center is chosen */}
                    <div
                      className={`mt-3 ${
                        filters.near ? '' : 'opacity-50 pointer-events-none'
                      }`}
                    >
                      <div className="flex gap-1 mb-2">
                        {(['km', 'mi', 'walk'] as RadiusUnit[]).map((unit) => (
                          <button
                            key={unit}
                            onClick={() => setRadiusUnit(unit)}
                            className={`flex-1 text-xs py-1 rounded border transition ${
                              filters.radiusUnit === unit
                                ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                                : 'border-slate-300 text-slate-600 hover:border-slate-400'
                            }`}
                          >
                            {RADIUS_CONFIG[unit].label}
                          </button>
                        ))}
                      </div>
                      <input
                        type="range"
                        min={RADIUS_CONFIG[filters.radiusUnit].min}
                        max={RADIUS_CONFIG[filters.radiusUnit].max}
                        step={RADIUS_CONFIG[filters.radiusUnit].step}
                        value={filters.radius}
                        onChange={(e) =>
                          setFilters({ ...filters, radius: parseFloat(e.target.value) })
                        }
                        className="w-full"
                      />
                      <div className="text-xs text-slate-600 mt-1">
                        {filters.near
                          ? `Within ${filters.radius} ${
                              RADIUS_CONFIG[filters.radiusUnit].label
                            }${
                              filters.radiusUnit === 'km'
                                ? ''
                                : ` (~${radiusToKm(
                                    filters.radius,
                                    filters.radiusUnit
                                  ).toFixed(1)} km)`
                            } of ${filters.near.name}`
                          : 'Pick a location to filter by distance'}
                      </div>
                      {filters.radiusUnit === 'walk' && filters.near && (
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Walk time is estimated from distance.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Move-in Date */}
                  <div className="mb-4">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                      <Calendar size={16} /> Move-in Date Range
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={filters.moveInDateStart}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            moveInDateStart: e.target.value,
                          })
                        }
                        className="w-1/2 px-2 py-1 border border-slate-300 rounded text-sm"
                      />
                      <input
                        type="date"
                        value={filters.moveInDateEnd}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            moveInDateEnd: e.target.value,
                          })
                        }
                        className="w-1/2 px-2 py-1 border border-slate-300 rounded text-sm"
                      />
                    </div>
                  </div>

                  {/* Sort By */}
                  <div className="mb-4">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                      <BarChart3 size={16} /> Sort By
                    </label>
                    <select
                      value={filters.sortBy}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          sortBy: e.target.value as Filters['sortBy'],
                        })
                      }
                      className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                    >
                      <option value="newest">Newest Posted</option>
                      <option value="price-low">Price: Low to High</option>
                      <option value="price-high">Price: High to Low</option>
                      <option value="distance">Closest first</option>
                      <option value="rating">Best Rated</option>
                    </select>
                  </div>

                  </div>

                  {/* Sticky footer */}
                  <div className="border-t border-slate-200 px-5 py-3">
                    <button
                      onClick={applyFilters}
                      className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-blue-700 transition"
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>,
                document.body
              )}
            </div>

            {/* Compare */}
            <button
              onClick={() => toggleMenu('compareMode')}
              className={`flex h-9 items-center justify-center gap-1 rounded-lg px-2 transition-colors ${
                menu.compareMode
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
              title="Compare listings"
            >
              <Share2 size={18} />
              {compareCount > 0 && (
                <span className="text-xs font-bold text-blue-600">{compareCount}</span>
              )}
            </button>

            {/* Favorites */}
            <button
              onClick={() => onToggleFavoritesOnly?.()}
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                favoritesOnly
                  ? 'bg-red-50 text-red-600'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
              title="Show favorites only"
            >
              <Heart size={18} className={favoritesOnly ? 'fill-red-600' : ''} />
            </button>

            {/* View Toggle (List/Map) */}
            <div className="ml-1 flex gap-1 border-l border-slate-200 pl-2">
              <button
                onClick={() => setMenu({ ...menu, listView: false })}
                className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                  !menu.listView
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
                title="Map view"
              >
                <MapIcon size={18} />
              </button>
              <button
                onClick={() => setMenu({ ...menu, listView: true })}
                className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                  menu.listView
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
                title="List view"
              >
                <List size={18} />
              </button>
            </div>
          </div>

          {/* Right Side Menu Items */}
          <div className="flex items-center gap-2">
            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => toggleMenu('notificationsOpen')}
                className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                title="Notifications"
              >
                <Bell size={18} />
                {notifications > 0 && (
                  <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-blue-500 ring-2 ring-white" />
                )}
              </button>
              {menu.notificationsOpen && (
                <div className="absolute top-12 right-0 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto py-1.5">
                    <div className="flex gap-2.5 px-4 py-2.5 transition-colors hover:bg-slate-50">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                        <Bell className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800">New matching listing</p>
                        <p className="text-xs text-slate-500">A room near campus was posted 1h ago</p>
                      </div>
                    </div>
                    <div className="flex gap-2.5 px-4 py-2.5 transition-colors hover:bg-slate-50">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                        <MessagesSquare className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800">Host responded</p>
                        <p className="text-xs text-slate-500">Reply to your inquiry about a listing</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Messages */}
            <button
              onClick={() => onMessages?.()}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              title="Messages"
            >
              <MessagesSquare size={18} />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-semibold text-white ring-2 ring-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Post a Lease Button */}
            <button
              onClick={handlePostLease}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-700"
            >
              <Plus size={18} /> <span className="hidden sm:inline">Post a Lease</span>
            </button>

            {/* Login/Account Button */}
            {!user ? (
              <button
                onClick={() => router.push('/auth')}
                className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                Sign In
              </button>
            ) : (
              <div className="relative">
                <button
                  onClick={() => toggleMenu('accountMenuOpen')}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white py-1.5 pl-1.5 pr-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300"
                  title="Account"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-xs font-semibold text-white">
                    {(
                      user.user_metadata?.username ||
                      user.user_metadata?.name ||
                      user.email ||
                      'U'
                    )
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform ${
                      menu.accountMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {menu.accountMenuOpen && (
                  <div className="absolute top-12 right-0 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg">
                    <div className="border-b border-slate-100 px-4 py-2.5">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {user.user_metadata?.username ||
                          user.user_metadata?.name ||
                          user.email}
                      </p>
                      {user.email && (
                        <p className="truncate text-xs text-slate-500">{user.email}</p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        onMyListings?.()
                        setMenu((prev) => ({ ...prev, accountMenuOpen: false }))
                      }}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <List size={16} className="text-slate-400" /> My listings
                    </button>
                    <button
                      onClick={() => {
                        onSavedSearches?.()
                        setMenu((prev) => ({ ...prev, accountMenuOpen: false }))
                      }}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <Heart size={16} className="text-slate-400" /> Saved listings
                    </button>
                    <div className="my-1 border-t border-slate-100" />
                    <button
                      onClick={async () => {
                        await signOut()
                        router.push('/')
                        router.refresh()
                      }}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                    >
                      <LogOut size={16} /> Sign out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Hamburger Menu (hidden on larger screens) */}
      <style jsx>{`
        @media (max-width: 768px) {
          .hidden-mobile {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}
