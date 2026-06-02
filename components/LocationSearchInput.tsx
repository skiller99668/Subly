'use client'

import { useState, useEffect } from 'react'
import { geocodePlaces, GeoResult } from '@/utils/geocode'

interface LocationSearchInputProps {
  onSelect: (result: GeoResult) => void
  placeholder?: string
  // Returns the current map center so suggestions can be sorted by proximity.
  getProximity?: () => { lng: number; lat: number } | undefined
}

// Self-contained address/place search box with a debounced results dropdown.
// Used by the post-lease form so typing a location previews it on the map.
export default function LocationSearchInput({
  onSelect,
  placeholder = 'Search an address...',
  getProximity,
}: LocationSearchInputProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeoResult[]>([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 3) {
      setResults([])
      return
    }
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token) return

    setSearching(true)
    const timer = setTimeout(async () => {
      try {
        setResults(await geocodePlaces(q, token, getProximity?.()))
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const handleSelect = (result: GeoResult) => {
    onSelect(result)
    setQuery(result.name)
    setResults([])
    setOpen(false)
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {open && query.trim().length >= 3 && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {searching && (
            <div className="text-sm text-gray-400 p-2">Searching…</div>
          )}
          {!searching && results.length === 0 && (
            <div className="text-sm text-gray-400 p-2">No matches found</div>
          )}
          {results.map((result, i) => (
            <button
              key={`${result.lng},${result.lat},${i}`}
              type="button"
              onClick={() => handleSelect(result)}
              className="w-full text-left text-sm text-gray-600 p-2 hover:bg-gray-50"
            >
              📍 {result.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
