'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Map, { Marker, MapRef, Source, Layer } from 'react-map-gl'
import Supercluster from 'supercluster'
import { MapPin, LocateFixed } from 'lucide-react'
import 'mapbox-gl/dist/mapbox-gl.css'
import TopMenu from './TopMenu'
import CategoryBar from './CategoryBar'
import PostLeasePanel from './PostLeasePanel'
import ListingDetailPanel from './ListingDetailPanel'
import MyListingsPanel from './MyListingsPanel'
import SavedListingsPanel from './SavedListingsPanel'
import MessagesPanel from './MessagesPanel'
import AreaListingsPanel from './AreaListingsPanel'
import LocationListingsPanel, { ListingGroup } from './LocationListingsPanel'
import { useAuth } from '@/app/providers'
import { getSupabaseBrowserClient, Listing } from '@/utils/supabase'
import {
  ListingFilters,
  EMPTY_FILTERS,
  countActiveFilters,
  filterListings,
  sortListings,
  distanceKm,
  circlePolygon,
} from '@/utils/filters'

// Fallback map center, used only for non-signed-in users and when geolocation
// is unavailable. Signed-in users spawn at their own GPS location on load.
const DEFAULT_CENTER = {
  lat: 45.5019,
  lng: -73.5674,
  zoom: 12,
}

// How wide an "area" to search, based on how specific the searched place is.
function radiusKmForZoom(zoom: number): number {
  if (zoom >= 15) return 2 // a precise address
  if (zoom >= 13) return 6 // neighborhood
  if (zoom >= 11) return 15 // city
  return 50 // region / broad
}

export default function MapComponent() {
  const { user, loading: authLoading } = useAuth()
  const supabase = getSupabaseBrowserClient()
  const mapRef = useRef<MapRef | null>(null)
  // Ensures the map auto-centers only once (on first load), not on every
  // user/auth change.
  const hasCenteredRef = useRef(false)
  const [listings, setListings] = useState<Listing[]>([])
  const [detailListing, setDetailListing] = useState<Listing | null>(null)
  const [postOpen, setPostOpen] = useState(false)
  const [editingListing, setEditingListing] = useState<Listing | null>(null)
  const [myListingsOpen, setMyListingsOpen] = useState(false)
  const [messagesOpen, setMessagesOpen] = useState(false)
  const [unreadTotal, setUnreadTotal] = useState(0)
  // Favorited listing IDs, the "favorites only" map filter, and saved panel.
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [savedOpen, setSavedOpen] = useState(false)
  // Active student-attribute category filters (AND semantics).
  const [activeTags, setActiveTags] = useState<string[]>([])
  // Applied price/size/date/proximity filters from the top-menu Filters panel.
  const [appliedFilters, setAppliedFilters] = useState<ListingFilters>(EMPTY_FILTERS)
  // When a pin holding several listings is clicked, show the group panel.
  const [selectedGroup, setSelectedGroup] = useState<ListingGroup | null>(null)
  // Current viewport bounds + zoom, used to compute clusters.
  const [viewport, setViewport] = useState<{
    bounds: [number, number, number, number]
    zoom: number
  } | null>(null)
  // Pin dropped at the most recently searched address (Google-Maps style).
  const [searchedPin, setSearchedPin] = useState<{ lng: number; lat: number } | null>(null)
  // The searched place that drives the left "nearby leases" panel.
  const [areaSearch, setAreaSearch] = useState<{
    lng: number
    lat: number
    name: string
    zoom: number
  } | null>(null)
  // Resolved center to fly to once known (null = stay on the default view).
  const [pendingCenter, setPendingCenter] = useState<{
    lng: number
    lat: number
    zoom: number
  } | null>(null)

  // The signed-in user's own listings, for the "My Listings" panel.
  const myListings = user
    ? listings.filter((l) => l.user_id === user.id)
    : []

  // The user's favorited listings, for the "Saved" panel.
  const savedListings = listings.filter((l) => favorites.has(l.id))

  // Listings shown on the map after applying the Filters panel (price/size/
  // date/proximity), the favorites toggle, and the active category tags
  // (a listing must carry every selected tag).
  const visibleListings = useMemo(() => {
    let result = filterListings(listings, appliedFilters)
    if (favoritesOnly) result = result.filter((l) => favorites.has(l.id))
    if (activeTags.length > 0) {
      result = result.filter((l) =>
        activeTags.every((t) => l.tags?.includes(t))
      )
    }
    return result
  }, [listings, appliedFilters, favoritesOnly, favorites, activeTags])

  // Listings near the searched place for the left panel: the active filters
  // also apply here, then the area radius, then the chosen sort order.
  const areaListings = useMemo(() => {
    if (!areaSearch) return []
    const radius = radiusKmForZoom(areaSearch.zoom)
    const nearby = filterListings(listings, appliedFilters).filter(
      (l) => distanceKm(areaSearch.lng, areaSearch.lat, l.lng, l.lat) <= radius
    )
    return sortListings(nearby, appliedFilters.sortBy, {
      lng: areaSearch.lng,
      lat: areaSearch.lat,
    })
  }, [areaSearch, listings, appliedFilters])

  // GeoJSON circle for the proximity filter, drawn on the map when active.
  const filterCircle = useMemo(
    () =>
      appliedFilters.near && appliedFilters.radiusKm != null
        ? circlePolygon(
            appliedFilters.near.lng,
            appliedFilters.near.lat,
            appliedFilters.radiusKm
          )
        : null,
    [appliedFilters.near, appliedFilters.radiusKm]
  )

  // Supercluster index of all listings. Points at the same address always
  // cluster together; as you zoom out, nearby listings merge into bigger
  // clusters. Rebuilt whenever the listings change.
  const clusterIndex = useMemo(() => {
    const index = new Supercluster<{ listing: Listing }>({
      // Small radius → pins only merge when they nearly fully overlap; partial
      // overlap stays as separate pins. Same-address listings (0px apart) still
      // always cluster.
      radius: 20,
      maxZoom: 22,
    })
    index.load(
      visibleListings.map((listing) => ({
        type: 'Feature' as const,
        properties: { listing },
        geometry: {
          type: 'Point' as const,
          coordinates: [listing.lng, listing.lat],
        },
      }))
    )
    return index
  }, [visibleListings])

  // The clusters/points visible in the current viewport.
  const clusters = useMemo(() => {
    if (!viewport) return []
    return clusterIndex.getClusters(viewport.bounds, Math.round(viewport.zoom))
  }, [clusterIndex, viewport])

  // Recompute the viewport (bounds + zoom) from the live map.
  const syncViewport = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    const b = map.getBounds()
    if (!b) return
    setViewport({
      bounds: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
      zoom: map.getZoom(),
    })
  }, [])

  // Open the group panel with every listing inside a clicked cluster.
  const openCluster = useCallback(
    (clusterId: number, lng: number, lat: number) => {
      const leaves = clusterIndex.getLeaves(clusterId, Infinity)
      setSelectedGroup({
        key: `cluster-${clusterId}`,
        lng,
        lat,
        listings: leaves.map((leaf) => leaf.properties.listing),
      })
    },
    [clusterIndex]
  )

  const fetchListings = useCallback(async () => {
    try {
      const response = await fetch('/api/listings')
      if (response.ok) {
        setListings(await response.json())
      }
    } catch (err) {
      console.error('Failed to fetch listings:', err)
    }
  }, [])

  useEffect(() => {
    fetchListings()
  }, [fetchListings])

  // Load the user's favorited listing IDs.
  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavorites(new Set())
      return
    }
    const { data } = await supabase
      .from('favorites')
      .select('listing_id')
      .eq('user_id', user.id)
    setFavorites(new Set((data ?? []).map((f) => f.listing_id as string)))
  }, [user, supabase])

  useEffect(() => {
    fetchFavorites()
  }, [fetchFavorites])

  // Add/remove a favorite (optimistic), requires sign-in.
  const toggleFavorite = useCallback(
    async (listingId: string) => {
      if (!user) return
      const isFav = favorites.has(listingId)
      setFavorites((prev) => {
        const next = new Set(prev)
        if (isFav) next.delete(listingId)
        else next.add(listingId)
        return next
      })
      if (isFav) {
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('listing_id', listingId)
      } else {
        await supabase
          .from('favorites')
          .insert({ user_id: user.id, listing_id: listingId })
      }
    },
    [user, favorites, supabase]
  )

  // Total unread messages, for the top-menu badge.
  const refreshUnread = useCallback(async () => {
    if (!user) {
      setUnreadTotal(0)
      return
    }
    try {
      const res = await fetch('/api/messages')
      if (res.ok) {
        const convos = await res.json()
        setUnreadTotal(
          convos.reduce(
            (sum: number, c: { unreadCount?: number }) => sum + (c.unreadCount || 0),
            0
          )
        )
      }
    } catch {
      // ignore
    }
  }, [user])

  // Poll the unread count periodically so the badge stays current.
  useEffect(() => {
    refreshUnread()
    const id = setInterval(refreshUnread, 20000)
    return () => clearInterval(id)
  }, [refreshUnread])

  const flyTo = useCallback((lng: number, lat: number, zoom = 14) => {
    mapRef.current?.flyTo({ center: [lng, lat], zoom, duration: 1500 })
  }, [])

  // Current map center, used to bias/sort search suggestions by proximity.
  const getMapCenter = useCallback(() => {
    const c = mapRef.current?.getCenter()
    return c ? { lng: c.lng, lat: c.lat } : undefined
  }, [])

  // Recenter the map on the user's current location, on demand.
  const recenterToMe = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => flyTo(pos.coords.longitude, pos.coords.latitude, 15),
      () => {
        // Permission denied / unavailable — do nothing.
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }, [flyTo])

  // Decide where to center the map — ONCE, on first load (after auth resolves):
  //   • Not signed in  → stay on the default view.
  //   • Signed in      → their current location (geolocation), falling back to
  //     a saved profile location, then the default center.
  // Guarded so it never re-centers on later user/auth changes (token refresh,
  // tab focus), which previously yanked the map back periodically.
  useEffect(() => {
    if (authLoading || hasCenteredRef.current) return
    hasCenteredRef.current = true

    // Non-signed-in users just stay on the default view.
    if (!user) return

    // Fallback if geolocation is denied/unavailable: saved profile location,
    // otherwise the default center (initial view state).
    const useFallback = async () => {
      const { data } = await supabase
        .from('users')
        .select('location_lat, location_lng')
        .eq('id', user.id)
        .single()
      if (data?.location_lat != null && data?.location_lng != null) {
        setPendingCenter({
          lng: data.location_lng,
          lat: data.location_lat,
          zoom: 13,
        })
      }
    }

    // Primary: the user's current location — their spawn point on load.
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          setPendingCenter({
            lng: pos.coords.longitude,
            lat: pos.coords.latitude,
            zoom: 14,
          }),
        () => useFallback(),
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
      )
    } else {
      useFallback()
    }
  }, [authLoading, user, supabase])

  // Apply the resolved center once it's known and the map is mounted.
  useEffect(() => {
    if (pendingCenter) {
      flyTo(pendingCenter.lng, pendingCenter.lat, pendingCenter.zoom)
    }
  }, [pendingCenter, flyTo])

  // Manual city/area selection from the search bar: recenter and (if signed in)
  // persist it to the profile so it becomes the default next visit.
  const handleLocationSelect = useCallback(
    async (lng: number, lat: number, name: string, zoom = 14, dropPin = false) => {
      flyTo(lng, lat, zoom)
      // Only pin precise addresses; clear any prior pin for city/area searches.
      setSearchedPin(dropPin ? { lng, lat } : null)
      // Open the left panel with leases near the searched place.
      setAreaSearch({ lng, lat, name, zoom })
      if (user) {
        await supabase
          .from('users')
          .update({ location_name: name, location_lat: lat, location_lng: lng })
          .eq('id', user.id)
      }
    },
    [flyTo, user, supabase]
  )

  // While filling out the post form, preview the chosen spot on the map.
  const handleLocationPreview = useCallback(
    (lng: number, lat: number, zoom: number) => {
      flyTo(lng, lat, zoom)
      setSearchedPin({ lng, lat })
    },
    [flyTo]
  )

  // After a successful post: refresh markers, fly to the new listing, clear pin.
  const handlePosted = useCallback(
    (listing: { lat: number; lng: number }) => {
      fetchListings()
      flyTo(listing.lng, listing.lat, 15)
      setSearchedPin(null)
    },
    [fetchListings, flyTo]
  )

  return (
    <div className="w-full h-screen relative">
      <TopMenu
        onLocationSelect={handleLocationSelect}
        onPostLease={() => {
          setEditingListing(null)
          setPostOpen(true)
          // Make way for the post form's own location preview.
          setAreaSearch(null)
          setSearchedPin(null)
        }}
        onMyListings={() => setMyListingsOpen(true)}
        onMessages={() => setMessagesOpen(true)}
        onSavedSearches={() => setSavedOpen(true)}
        onToggleFavoritesOnly={() => setFavoritesOnly((v) => !v)}
        favoritesOnly={favoritesOnly}
        onSearchClose={() => {
          // Keep the pin if a search result panel is open; clear stray pins otherwise.
          if (!areaSearch) setSearchedPin(null)
        }}
        unreadCount={unreadTotal}
        getProximity={getMapCenter}
        onApplyFilters={setAppliedFilters}
        activeFilterCount={countActiveFilters(appliedFilters)}
      />
      <CategoryBar
        active={activeTags}
        onToggle={(id) =>
          setActiveTags((prev) =>
            prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
          )
        }
        onClear={() => setActiveTags([])}
      />
      <div className="w-full h-full pt-16">
        <Map
          ref={mapRef}
          initialViewState={{
            longitude: DEFAULT_CENTER.lng,
            latitude: DEFAULT_CENTER.lat,
            zoom: DEFAULT_CENTER.zoom,
          }}
          onLoad={() => {
            // If the center resolved before the map finished loading, apply it now.
            if (pendingCenter) {
              flyTo(pendingCenter.lng, pendingCenter.lat, pendingCenter.zoom)
            }
            syncViewport()
          }}
          onMove={syncViewport}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        >
          {/* Proximity filter radius (sits beneath the pins) */}
          {filterCircle && appliedFilters.near && (
            <>
              <Source id="filter-radius" type="geojson" data={filterCircle}>
                <Layer
                  id="filter-radius-fill"
                  type="fill"
                  paint={{ 'fill-color': '#3b82f6', 'fill-opacity': 0.08 }}
                />
                <Layer
                  id="filter-radius-line"
                  type="line"
                  paint={{
                    'line-color': '#3b82f6',
                    'line-width': 1.5,
                    'line-dasharray': [2, 2],
                  }}
                />
              </Source>
              <Marker
                longitude={appliedFilters.near.lng}
                latitude={appliedFilters.near.lat}
                anchor="center"
              >
                <div className="w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow" />
              </Marker>
            </>
          )}

          {clusters.map((feature) => {
            const [lng, lat] = feature.geometry.coordinates
            const props = feature.properties

            // A cluster of several listings → count pin that opens the panel.
            if ('cluster' in props) {
              const count = props.point_count
              const size = 32 + Math.min(count, 30)
              return (
                <Marker
                  key={`cluster-${props.cluster_id}`}
                  longitude={lng}
                  latitude={lat}
                  anchor="center"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      openCluster(props.cluster_id, lng, lat)
                    }}
                    style={{ width: size, height: size }}
                    className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-full border-2 border-white shadow-lg transition cursor-pointer"
                    aria-label={`${count} listings in this area`}
                  >
                    {count}
                  </button>
                </Marker>
              )
            }

            // A single listing → price pin that opens its detail.
            const listing = props.listing
            return (
              <Marker
                key={listing.id}
                longitude={lng}
                latitude={lat}
                anchor="bottom"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setDetailListing(listing)
                  }}
                  className="group flex items-center h-8 px-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full border-2 border-white shadow-lg transition-all cursor-pointer"
                  aria-label={listing.title}
                >
                  <span className="font-bold text-sm leading-none">$</span>
                  {/* Expands on hover to reveal the rent */}
                  <span className="max-w-0 overflow-hidden whitespace-nowrap text-xs font-semibold group-hover:max-w-[90px] group-hover:ml-1 transition-all duration-200">
                    {listing.price}/mo
                  </span>
                </button>
              </Marker>
            )
          })}

          {searchedPin && (
            <Marker
              longitude={searchedPin.lng}
              latitude={searchedPin.lat}
              anchor="bottom"
            >
              <MapPin
                size={36}
                fill="#ef4444"
                strokeWidth={1.5}
                className="text-red-500 drop-shadow-md"
              />
            </Marker>
          )}
        </Map>

        {/* Recenter on my location */}
        <button
          onClick={recenterToMe}
          className="absolute bottom-8 right-4 z-10 p-3 bg-white rounded-full shadow-lg hover:bg-gray-50 transition"
          title="Recenter on my location"
          aria-label="Recenter on my location"
        >
          <LocateFixed size={20} className="text-gray-700" />
        </button>
      </div>

      <MyListingsPanel
        open={myListingsOpen}
        onClose={() => setMyListingsOpen(false)}
        listings={myListings}
        onAdd={() => {
          setEditingListing(null)
          setPostOpen(true)
        }}
        onEdit={(listing) => {
          setEditingListing(listing)
          setPostOpen(true)
        }}
        onChanged={fetchListings}
      />

      <PostLeasePanel
        open={postOpen}
        onClose={() => {
          setPostOpen(false)
          setEditingListing(null)
          setSearchedPin(null)
        }}
        onLocationPreview={handleLocationPreview}
        onPosted={handlePosted}
        getProximity={getMapCenter}
        listing={editingListing}
      />

      <AreaListingsPanel
        location={areaSearch}
        listings={areaListings}
        onClose={() => {
          setAreaSearch(null)
          setSearchedPin(null)
        }}
        onSelect={(listing) => setDetailListing(listing)}
      />

      <LocationListingsPanel
        group={selectedGroup}
        onClose={() => setSelectedGroup(null)}
        onSelect={(listing) => setDetailListing(listing)}
      />

      <ListingDetailPanel
        listing={detailListing}
        onClose={() => setDetailListing(null)}
        isFavorited={detailListing ? favorites.has(detailListing.id) : false}
        onToggleFavorite={toggleFavorite}
      />

      <SavedListingsPanel
        open={savedOpen}
        onClose={() => setSavedOpen(false)}
        listings={savedListings}
        onSelect={(listing) => setDetailListing(listing)}
        onToggleFavorite={toggleFavorite}
      />

      <MessagesPanel
        open={messagesOpen}
        onClose={() => {
          setMessagesOpen(false)
          refreshUnread()
        }}
        onActivity={refreshUnread}
      />
    </div>
  )
}
