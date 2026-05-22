'use client'

import { useState } from 'react'
import Map, { Marker, Popup } from 'react-map-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import TopMenu from './TopMenu'

interface Listing {
  id: string
  lat: number
  lng: number
  title: string
  price: number
  moveInDate: string
  description: string
}

const MCGILL_CENTER = {
  lat: 45.5047,
  lng: -73.5772,
}

const SAMPLE_LISTINGS: Listing[] = [
  {
    id: '1',
    lat: 45.505,
    lng: -73.576,
    title: 'Cozy 1BR on Milton Street',
    price: 650,
    moveInDate: 'June 1, 2026',
    description: 'Great location, close to McGill',
  },
  {
    id: '2',
    lat: 45.507,
    lng: -73.578,
    title: 'Shared 2BR Apartment',
    price: 500,
    moveInDate: 'May 25, 2026',
    description: 'Spacious shared apartment',
  },
  {
    id: '3',
    lat: 45.503,
    lng: -73.575,
    title: 'Studio near Campus',
    price: 550,
    moveInDate: 'June 15, 2026',
    description: 'Perfect for students',
  },
  {
    id: '4',
    lat: 45.508,
    lng: -73.574,
    title: 'Bright 1BR with Balcony',
    price: 700,
    moveInDate: 'July 1, 2026',
    description: 'Modern amenities, natural light',
  },
]

export default function MapComponent() {
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null)

  const handleMapClick = (e: any) => {
    if (!e.features || e.features.length === 0) {
      setSelectedListing(null)
    }
  }

  return (
    <div className="w-full h-screen relative">
      <TopMenu />
      <div className="w-full h-full pt-16">
        <Map
          initialViewState={{
            longitude: MCGILL_CENTER.lng,
            latitude: MCGILL_CENTER.lat,
            zoom: 14,
          }}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          onClick={handleMapClick}
        >
          {SAMPLE_LISTINGS.map((listing) => (
            <Marker
              key={listing.id}
              longitude={listing.lng}
              latitude={listing.lat}
              anchor="bottom"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedListing(listing)
                }}
                className="w-8 h-8 bg-blue-500 rounded-full border-2 border-white shadow-lg hover:bg-blue-600 transition cursor-pointer flex items-center justify-center text-white text-sm font-bold"
                aria-label={`Listing ${listing.id}`}
              >
                $
              </button>
            </Marker>
          ))}

          {selectedListing && (
            <Popup
              longitude={selectedListing.lng}
              latitude={selectedListing.lat}
              anchor="bottom"
              onClose={() => setSelectedListing(null)}
              closeButton={false}
              closeOnClick={false}
            >
              <div className="p-3">
                <h3 className="font-bold text-sm mb-2">{selectedListing.title}</h3>
                <p className="text-xs text-gray-600 mb-1">
                  <strong>${selectedListing.price}/month</strong>
                </p>
                <p className="text-xs text-gray-600 mb-2">
                  Move-in: {selectedListing.moveInDate}
                </p>
                <p className="text-xs text-gray-700">{selectedListing.description}</p>
                <button className="mt-2 w-full bg-blue-500 text-white text-xs py-1 rounded hover:bg-blue-600 transition">
                  View Details
                </button>
              </div>
            </Popup>
          )}
        </Map>
      </div>
    </div>
  )
}
