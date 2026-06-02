'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Map, { Marker, MapRef } from 'react-map-gl'
import Supercluster from 'supercluster'
import { MapPin } from 'lucide-react'
import 'mapbox-gl/dist/mapbox-gl.css'
import TopMenu from './TopMenu'
import PostLeasePanel from './PostLeasePanel'
import ListingDetailPanel from './ListingDetailPanel'
import MyListingsPanel from './MyListingsPanel'
import LocationListingsPanel, { ListingGroup } from './LocationListingsPanel'
import { useAuth } from '@/app/providers'
import { getSupabaseBrowserClient, Listing } from '@/utils/supabase'

const MCGILL_CENTER = {
  lat: 45.5047,
  lng: -73.5772,
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
  // When a pin holding several listings is clicked, show the group panel.
  const [selectedGroup, setSelectedGroup] = useState<ListingGroup | null>(null)
  // Current viewport bounds + zoom, used to compute clusters.
  const [viewport, setViewport] = useState<{
    bounds: [number, number, number, number]
    zoom: number
  } | null>(null)
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

  // Supercluster index of all listings. Points at the same address always
  // cluster together; as you zoom out, nearby listings merge into bigger
  // clusters. Rebuilt whenever the listings change.
  const clusterIndex = useMemo(() => {
    const index = new Supercluster<{ listing: Listing }>({
      // Small radius → pins only merge when they nearly fully overlap; partial
      // overlap stays as separate pins. Same-address listings (0px apart) still
      // always cluster.
      radius: 12,
      maxZoom: 22,
    })
    index.load(
      listings.map((listing) => ({
        type: 'Feature' as const,
        properties: { listing },
        geometry: {
          type: 'Point' as const,
          coordinates: [listing.lng, listing.lat],
        },
      }))
    )
    return index
  }, [listings])

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
            syncViewport()
          }}
          onMove={syncViewport}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        >
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

      <LocationListingsPanel
        group={selectedGroup}
        onClose={() => setSelectedGroup(null)}
        onSelect={(listing) => setDetailListing(listing)}
      />

      <ListingDetailPanel
        listing={detailListing}
        onClose={() => setDetailListing(null)}
      />
    </div>
  )
}
