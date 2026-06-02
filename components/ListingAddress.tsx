'use client'

import { useState, useEffect } from 'react'
import { Listing } from '@/utils/supabase'
import { reverseGeocode } from '@/utils/geocode'

// Renders a listing's address: the stored value when present, otherwise a
// reverse-geocoded fallback (for listings created before addresses were saved).
// Returns the address as text; the caller styles/wraps it.
export default function ListingAddress({ listing }: { listing: Listing }) {
  const [address, setAddress] = useState(listing.address ?? '')

  useEffect(() => {
    if (listing.address) {
      setAddress(listing.address)
      return
    }
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token) return

    let cancelled = false
    reverseGeocode(listing.lng, listing.lat, token).then((result) => {
      if (!cancelled && result) setAddress(result)
    })
    return () => {
      cancelled = true
    }
  }, [listing])

  return <>{address}</>
}
