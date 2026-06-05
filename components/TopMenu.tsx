'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { geocodePlaces, GeoResult } from '@/utils/geocode'
import {
  Search,
  Sliders,
  Share2,
  Heart,
  MessageSquare,
  Plus,
  BarChart3,
  Menu,
  Bell,
  MapIcon,
  List,
  X,
  RotateCcw,
  Calendar,
  DollarSign,
  Ruler,
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
  minPrice: number
  maxPrice: number
  minSize: number
  maxSize: number
  distanceToMcGill: number
  moveInDateStart: string
  moveInDateEnd: string
  sortBy: 'newest' | 'price-low' | 'price-high' | 'distance' | 'rating'
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
  unreadCount?: number
  // Returns the current map center so suggestions can be sorted by proximity.
  getProximity?: () => { lng: number; lat: number } | undefined
}

const RECENTS_KEY = 'subly.recentSearches'
const MAX_RECENTS = 6

export default function TopMenu({
  onLocationSelect,
  onPostLease,
  onMyListings,
  onMessages,
  onSearchClose,
  unreadCount = 0,
  getProximity,
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

  const [filters, setFilters] = useState<Filters>({
    minPrice: 400,
    maxPrice: 1000,
    minSize: 300,
    maxSize: 1500,
    distanceToMcGill: 5,
    moveInDateStart: '',
    moveInDateEnd: '',
    sortBy: 'newest',
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<GeoResult[]>([])
  const [searching, setSearching] = useState(false)
  const [recentSearches, setRecentSearches] = useState<GeoResult[]>([])

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

  const resetFilters = () => {
    setFilters({
      minPrice: 400,
      maxPrice: 1000,
      minSize: 300,
      maxSize: 1500,
      distanceToMcGill: 5,
      moveInDateStart: '',
      moveInDateEnd: '',
      sortBy: 'newest',
    })
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
        // Close all menus
        setMenu({
          searchOpen: false,
          filtersOpen: false,
          compareMode: false,
          showFavoritesOnly: false,
          listView: false,
          notificationsOpen: false,
          accountMenuOpen: false,
          savedSearchesOpen: false,
        })
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={menuRef} className="absolute top-0 left-0 right-0 z-50">
      {/* Top Menu Bar */}
      <div className="bg-white shadow-md">
        <div className="flex items-center justify-between px-4 py-3 gap-4">
          {/* Left Side Menu Items */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <button
                onClick={() => toggleMenu('searchOpen')}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
                title="Search"
              >
                <Search size={20} className="text-gray-700" />
              </button>
              {menu.searchOpen && (
                <div className="absolute top-12 left-0 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                  <input
                    type="text"
                    placeholder="Find subleases in a city or area..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  {searchQuery.trim().length >= 3 ? (
                    /* Live geocoding results */
                    <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
                      {searching && (
                        <div className="text-sm text-gray-400 p-2">Searching…</div>
                      )}
                      {!searching && searchResults.length === 0 && (
                        <div className="text-sm text-gray-400 p-2">No matches found</div>
                      )}
                      {searchResults.map((result, i) => (
                        <button
                          key={`${result.lng},${result.lat},${i}`}
                          onClick={() => selectLocation(result)}
                          className="w-full text-left text-sm text-gray-600 p-2 hover:bg-gray-50 rounded"
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
                          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                            Recent
                          </span>
                          <button
                            onClick={clearRecents}
                            className="text-xs text-gray-400 hover:text-red-500 transition"
                          >
                            Clear all
                          </button>
                        </div>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {recentSearches.map((result, i) => (
                            <div
                              key={`${result.lng},${result.lat},${i}`}
                              className="group flex items-center rounded hover:bg-gray-50"
                            >
                              <button
                                onClick={() => selectLocation(result)}
                                className="flex-1 text-left text-sm text-gray-600 p-2 truncate"
                              >
                                🕘 {result.name}
                              </button>
                              <button
                                onClick={() => removeRecent(result.name)}
                                aria-label={`Remove ${result.name}`}
                                className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 transition"
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
                className="p-2 hover:bg-gray-100 rounded-lg transition flex items-center gap-1"
                title="Filters"
              >
                <Sliders size={20} className="text-gray-700" />
                <span className="text-sm font-medium text-gray-700">Filters</span>
              </button>
              {menu.filtersOpen && (
                <div className="absolute top-12 left-0 w-96 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-h-96 overflow-y-auto">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-800">Filters</h3>
                    <button
                      onClick={resetFilters}
                      className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
                    >
                      <RotateCcw size={14} /> Reset
                    </button>
                  </div>

                  {/* Price Range */}
                  <div className="mb-4">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      <DollarSign size={16} /> Price Range
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.minPrice}
                        onChange={(e) =>
                          setFilters({ ...filters, minPrice: parseInt(e.target.value) })
                        }
                        className="w-1/2 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.maxPrice}
                        onChange={(e) =>
                          setFilters({ ...filters, maxPrice: parseInt(e.target.value) })
                        }
                        className="w-1/2 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  </div>

                  {/* Size Range */}
                  <div className="mb-4">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      <Ruler size={16} /> Size (sq ft)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.minSize}
                        onChange={(e) =>
                          setFilters({ ...filters, minSize: parseInt(e.target.value) })
                        }
                        className="w-1/2 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.maxSize}
                        onChange={(e) =>
                          setFilters({ ...filters, maxSize: parseInt(e.target.value) })
                        }
                        className="w-1/2 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  </div>

                  {/* Distance to McGill */}
                  <div className="mb-4">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      📍 Distance to McGill
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="10"
                      step="0.5"
                      value={filters.distanceToMcGill}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          distanceToMcGill: parseFloat(e.target.value),
                        })
                      }
                      className="w-full"
                    />
                    <div className="text-xs text-gray-600 mt-1">
                      {filters.distanceToMcGill} km
                    </div>
                  </div>

                  {/* Move-in Date */}
                  <div className="mb-4">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
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
                        className="w-1/2 px-2 py-1 border border-gray-300 rounded text-sm"
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
                        className="w-1/2 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  </div>

                  {/* Sort By */}
                  <div className="mb-4">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
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
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="newest">Newest Posted</option>
                      <option value="price-low">Price: Low to High</option>
                      <option value="price-high">Price: High to Low</option>
                      <option value="distance">Closest to McGill</option>
                      <option value="rating">Best Rated</option>
                    </select>
                  </div>

                  <button className="w-full bg-blue-500 text-white py-2 rounded-lg font-medium text-sm hover:bg-blue-600 transition">
                    Apply Filters
                  </button>
                </div>
              )}
            </div>

            {/* Compare */}
            <button
              onClick={() => toggleMenu('compareMode')}
              className={`p-2 hover:bg-gray-100 rounded-lg transition flex items-center gap-1 ${
                menu.compareMode ? 'bg-blue-100' : ''
              }`}
              title="Compare listings"
            >
              <Share2
                size={20}
                className={menu.compareMode ? 'text-blue-600' : 'text-gray-700'}
              />
              {compareCount > 0 && (
                <span className="text-xs font-bold text-blue-600">{compareCount}</span>
              )}
            </button>

            {/* Favorites */}
            <button
              onClick={() => toggleMenu('showFavoritesOnly')}
              className={`p-2 hover:bg-gray-100 rounded-lg transition ${
                menu.showFavoritesOnly ? 'bg-red-100' : ''
              }`}
              title="Show favorites only"
            >
              <Heart
                size={20}
                className={menu.showFavoritesOnly ? 'text-red-600 fill-red-600' : 'text-gray-700'}
              />
            </button>

            {/* View Toggle (List/Map) */}
            <div className="border-l border-gray-300 pl-2 flex gap-1">
              <button
                onClick={() => setMenu({ ...menu, listView: false })}
                className={`p-2 rounded-lg transition ${
                  !menu.listView ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-700'
                }`}
                title="Map view"
              >
                <MapIcon size={20} />
              </button>
              <button
                onClick={() => setMenu({ ...menu, listView: true })}
                className={`p-2 rounded-lg transition ${
                  menu.listView ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-700'
                }`}
                title="List view"
              >
                <List size={20} />
              </button>
            </div>
          </div>

          {/* Logo/Brand (Center) */}
          <div className="text-center font-bold text-lg text-blue-600">Subly</div>

          {/* Right Side Menu Items */}
          <div className="flex items-center gap-2">
            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => toggleMenu('notificationsOpen')}
                className="p-2 hover:bg-gray-100 rounded-lg transition relative"
                title="Notifications"
              >
                <Bell size={20} className="text-gray-700" />
                {notifications > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {notifications}
                  </span>
                )}
              </button>
              {menu.notificationsOpen && (
                <div className="absolute top-12 right-0 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                  <h3 className="font-bold mb-3 text-gray-800">Notifications</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    <div className="text-sm p-2 bg-blue-50 rounded cursor-pointer hover:bg-blue-100">
                      <p className="font-medium">New matching listing</p>
                      <p className="text-xs text-gray-600">2-bed near McGill posted 1h ago</p>
                    </div>
                    <div className="text-sm p-2 bg-blue-50 rounded cursor-pointer hover:bg-blue-100">
                      <p className="font-medium">Landlord responded</p>
                      <p className="text-xs text-gray-600">Your inquiry about listing #234</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Messages */}
            <button
              onClick={() => onMessages?.()}
              className="p-2 hover:bg-gray-100 rounded-lg transition relative"
              title="Messages"
            >
              <MessageSquare size={20} className="text-gray-700" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Post a Lease Button */}
            <button 
              onClick={handlePostLease}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition flex items-center gap-2 font-medium"
            >
              <Plus size={20} /> Post a Lease
            </button>

            {/* Login/Account Button */}
            {!user ? (
              <button
                onClick={() => router.push('/auth')}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition font-medium"
              >
                Sign In
              </button>
            ) : (
              <div className="relative">
                <button
                  onClick={() => toggleMenu('accountMenuOpen')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                  title="Account"
                >
                  <Menu size={20} className="text-gray-700" />
                </button>
                {menu.accountMenuOpen && (
                  <div className="absolute top-12 right-0 w-56 bg-white border border-gray-200 rounded-lg shadow-lg p-2">
                    <div className="px-4 py-2 text-sm font-semibold text-gray-700 border-b mb-2">
                      👤 {user.user_metadata?.username ||
                        user.user_metadata?.name ||
                        user.email}
                    </div>
                    <button
                      onClick={() => {
                        onMyListings?.()
                        setMenu((prev) => ({ ...prev, accountMenuOpen: false }))
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 rounded"
                    >
                      📋 My Listings
                    </button>
                    <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 rounded">
                      ❤️ Saved Searches
                    </button>
                    <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 rounded">
                      ⚙️ Settings
                    </button>
                    <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 rounded">
                      ❓ Help & Support
                    </button>
                    <hr className="my-2" />
                    <button
                      onClick={async () => {
                        await signOut()
                        router.push("/")
                        router.refresh()
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 rounded text-red-600"
                    >
                      🚪 Logout
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
