// Shared listing-filter model used by the map and the top-menu Filters panel,
// so both agree on what "active filters" mean and how they're applied.
import type { Feature, Polygon } from 'geojson'
import { Listing } from './supabase'

export type SortBy = 'newest' | 'price-low' | 'price-high' | 'distance' | 'rating'
export type RadiusUnit = 'km' | 'mi' | 'walk'

export interface ListingFilters {
  minPrice: number | null
  maxPrice: number | null
  minSize: number | null
  maxSize: number | null
  moveInStart: string | null // 'YYYY-MM-DD'
  moveInEnd: string | null
  // Proximity center; the distance filter only applies when both are set.
  near: { lng: number; lat: number; name: string } | null
  radiusKm: number | null
  sortBy: SortBy
}

export const EMPTY_FILTERS: ListingFilters = {
  minPrice: null,
  maxPrice: null,
  minSize: null,
  maxSize: null,
  moveInStart: null,
  moveInEnd: null,
  near: null,
  radiusKm: null,
  sortBy: 'newest',
}

// --- Distance ---------------------------------------------------------------

// Great-circle distance in km between two lng/lat points.
export function distanceKm(aLng: number, aLat: number, bLng: number, bLat: number): number {
  const R = 6371
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLng = ((bLng - aLng) * Math.PI) / 180
  const lat1 = (aLat * Math.PI) / 180
  const lat2 = (bLat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// --- Radius-unit conversions ------------------------------------------------
// Walk time is an *estimate*: average walking speed with a street-detour factor
// so a straight-line radius approximates real on-foot minutes. (Exact
// door-to-door times would need a routing API call per listing.)
export const WALK_KMH = 4.8
export const WALK_DETOUR = 1.3
const MI_PER_KM = 0.621371

export const kmFromMiles = (mi: number) => mi / MI_PER_KM
export const kmFromWalkMinutes = (min: number) => (min * (WALK_KMH / 60)) / WALK_DETOUR

export function radiusToKm(radius: number, unit: RadiusUnit): number {
  if (unit === 'mi') return kmFromMiles(radius)
  if (unit === 'walk') return kmFromWalkMinutes(radius)
  return radius
}

// --- Filtering / sorting ----------------------------------------------------

// How many distinct filter groups are active — drives the button's count badge.
export function countActiveFilters(f: ListingFilters): number {
  let n = 0
  if (f.minPrice != null || f.maxPrice != null) n++
  if (f.minSize != null || f.maxSize != null) n++
  if (f.moveInStart || f.moveInEnd) n++
  if (f.near && f.radiusKm != null) n++
  return n
}

export function filterListings(listings: Listing[], f: ListingFilters): Listing[] {
  return listings.filter((l) => {
    if (f.minPrice != null && l.price < f.minPrice) return false
    if (f.maxPrice != null && l.price > f.maxPrice) return false
    if (f.minSize != null && l.size < f.minSize) return false
    if (f.maxSize != null && l.size > f.maxSize) return false
    if (f.moveInStart && l.move_in_date < f.moveInStart) return false
    if (f.moveInEnd && l.move_in_date > f.moveInEnd) return false
    if (f.near && f.radiusKm != null) {
      if (distanceKm(f.near.lng, f.near.lat, l.lng, l.lat) > f.radiusKm) return false
    }
    return true
  })
}

export function sortListings(
  listings: Listing[],
  sortBy: SortBy,
  center?: { lng: number; lat: number }
): Listing[] {
  const arr = [...listings]
  switch (sortBy) {
    case 'price-low':
      return arr.sort((a, b) => a.price - b.price)
    case 'price-high':
      return arr.sort((a, b) => b.price - a.price)
    case 'distance':
      if (!center) return arr
      return arr.sort(
        (a, b) =>
          distanceKm(center.lng, center.lat, a.lng, a.lat) -
          distanceKm(center.lng, center.lat, b.lng, b.lat)
      )
    case 'rating': // no per-listing rating aggregate yet — fall back to newest
    case 'newest':
    default:
      return arr.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  }
}

// GeoJSON polygon approximating a radius around a point, for drawing the
// proximity filter area on the map.
export function circlePolygon(
  lng: number,
  lat: number,
  radiusKm: number,
  points = 64
): Feature<Polygon> {
  const coords: [number, number][] = []
  const R = 6371
  const d = radiusKm / R
  const lat1 = (lat * Math.PI) / 180
  const lng1 = (lng * Math.PI) / 180
  for (let i = 0; i <= points; i++) {
    const brng = (2 * Math.PI * i) / points
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng)
    )
    const lng2 =
      lng1 +
      Math.atan2(
        Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
        Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
      )
    coords.push([(lng2 * 180) / Math.PI, (lat2 * 180) / Math.PI])
  }
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [coords] },
  }
}
