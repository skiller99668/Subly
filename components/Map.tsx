'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Map, { Marker, Popup, MapRef } from 'react-map-gl'
import { MapPin } from 'lucide-react'
import 'mapbox-gl/dist/mapbox-gl.css'
import TopMenu from './TopMenu'
import PostLeasePanel from './PostLeasePanel'
import ListingDetailPanel from './ListingDetailPanel'
import MyListingsPanel from './MyListingsPanel'
import { useAuth } from '@/app/providers'
import { getSupabaseBrowserClient, Listing } from '@/utils/supabase'

const MCGILL_CENTER = {
  lat: 45.5047,
  lng: -73.5772,
}

// Listings sharing (almost) the same coordinates, grouped under one pin.
interface ListingGroup {
  key: string
  lng: number
  lat: number
  listings: Listing[]
}

export default function MapComponent() {
  const { user } = useAuth()
  const supabase = getSupabaseBrowserClient()
  const mapRef = useRef<MapRef | null>(null)
  const [listings, setListings] = useState<Listing[]>([])
  const [detailListing, setDetailListing] = useState<Listing | null>(null)
  const [postOpen, setPostOpen] = useState(false)
  const [editingListing, setEditingListing] = useState<Listing | null>(null)
  const [myListingsOpen, setMyListingsOpen] = useState(false)
  // When a pin holding several listings is clicked, show a picker popup.
  const [selectedGroup, setSelectedGroup] = useState<ListingGroup | null>(null)
  // Pin dropped at the most recently searched address (Google-Maps style).
  const [searchedPin, setSearchedPin] = useState<{ lng: number; lat: number } | null>(null)
  // Resolved center to fly to once known (null = stay on the McGill default).
  const [pendingCenter, setPendingCenter] = useState<{
    lng: number
    lat: number
    zoom: number
  } | null>(null)

  // The signed-in user's own listings, for the "My Listings" panel.
  const myListings = user
    ? listings.filter((l) => l.user_id === user.id)
    : []

  // Group listings that sit at (essentially) the same coordinates so an
  // apartment building / multiple sublet rooms share one pin.
  const listingGroups = useMemo<ListingGroup[]>(() => {
    // Plain object keyed by coordinate (the JS Map constructor is shadowed by
    // the react-map-gl <Map> import in this file).
    const groups: Record<string, ListingGroup> = {}
    for (const listing of listings) {
      const key = `${listing.lat.toFixed(5)},${listing.lng.toFixed(5)}`
      if (groups[key]) {
        groups[key].listings.push(listing)
      } else {
        groups[key] = {
          key,
          lng: listing.lng,
          lat: listing.lat,
          listings: [listing],
        }
      }
    }
    return Object.values(groups)
  }, [listings])

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

  const flyTo = useCallback((lng: number, lat: number, zoom = 14) => {
    mapRef.current?.flyTo({ center: [lng, lat], zoom, duration: 1500 })
  }, [])

  // Current map center, used to bias/sort search suggestions by proximity.
  const getMapCenter = useCallback(() => {
    const c = mapRef.current?.getCenter()
    return c ? { lng: c.lng, lat: c.lat } : undefined
  }, [])

  // Decide where to center the map on load:
  //   1. A location the user manually saved to their profile (their choice wins)
  //   2. The browser's geolocation (auto-prompt)
  //   3. The McGill default (if nothing else is available / permission denied)
  useEffect(() => {
    let cancelled = false

    const resolveLocation = async () => {
      // 1) Saved profile location.
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('location_lat, location_lng')
          .eq('id', user.id)
          .single()

        if (
          !cancelled &&
          data?.location_lat != null &&
          data?.location_lng != null
        ) {
          setPendingCenter({
            lng: data.location_lng,
            lat: data.location_lat,
            zoom: 13,
          })
          return
        }
      }

      // 2) Browser geolocation.
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!cancelled) {
              setPendingCenter({
                lng: pos.coords.longitude,
                lat: pos.coords.latitude,
                zoom: 14,
              })
            }
          },
          () => {
            // Denied or unavailable — keep the McGill default.
          },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
        )
      }
    }

    resolveLocation()
    return () => {
      cancelled = true
    }
  }, [user, supabase])

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
        }}
        onMyListings={() => setMyListingsOpen(true)}
        getProximity={getMapCenter}
      />
      <div className="w-full h-full pt-16">
        <Map
          ref={mapRef}
          initialViewState={{
            longitude: MCGILL_CENTER.lng,
            latitude: MCGILL_CENTER.lat,
            zoom: 14,
          }}
          onLoad={() => {
            // If the center resolved before the map finished loading, apply it now.
            if (pendingCenter) {
              flyTo(pendingCenter.lng, pendingCenter.lat, pendingCenter.zoom)
            }
          }}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        >
          {listingGroups.map((group) => {
            const multiple = group.listings.length > 1
            const minPrice = Math.min(...group.listings.map((l) => l.price))
            return (
              <Marker
                key={group.key}
                longitude={group.lng}
                latitude={group.lat}
                anchor="bottom"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (multiple) {
                      setSelectedGroup(group)
                    } else {
                      setDetailListing(group.listings[0])
                    }
                  }}
                  className="group flex items-center h-8 px-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full border-2 border-white shadow-lg transition-all cursor-pointer"
                  aria-label={
                    multiple
                      ? `${group.listings.length} listings here`
                      : group.listings[0].title
                  }
                >
                  <span className="font-bold text-sm leading-none">
                    {multiple ? group.listings.length : '$'}
                  </span>
                  {/* Expands on hover to reveal the rent / count */}
                  <span className="max-w-0 overflow-hidden whitespace-nowrap text-xs font-semibold group-hover:max-w-[140px] group-hover:ml-1 transition-all duration-200">
                    {multiple ? `listings from $${minPrice}` : `${group.listings[0].price}/mo`}
                  </span>
                </button>
              </Marker>
            )
          })}

          {selectedGroup && (
            <Popup
              longitude={selectedGroup.lng}
              latitude={selectedGroup.lat}
              anchor="bottom"
              onClose={() => setSelectedGroup(null)}
              closeOnClick={false}
              closeButton={false}
              maxWidth="240px"
            >
              <div className="w-52 p-1">
                <p className="text-xs font-semibold text-gray-500 px-1 mb-1">
                  {selectedGroup.listings.length} listings here
                </p>
                <div className="max-h-60 overflow-y-auto">
                  {selectedGroup.listings.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => {
                        setDetailListing(l)
                        setSelectedGroup(null)
                      }}
                      className="w-full text-left p-2 hover:bg-gray-50 rounded"
                    >
                      <div className="text-sm font-medium text-gray-800 truncate">
                        {l.title}
                      </div>
                      <div className="text-xs text-gray-600">
                        ${l.price}/mo · {l.size} sq ft
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </Popup>
          )}

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
        }}
        onLocationPreview={handleLocationPreview}
        onPosted={handlePosted}
        getProximity={getMapCenter}
        listing={editingListing}
      />

      <ListingDetailPanel
        listing={detailListing}
        onClose={() => setDetailListing(null)}
      />
    </div>
  )
}
