// Shared Mapbox geocoding used by the top-menu search and the post-lease form.

export interface GeoResult {
  name: string
  lng: number
  lat: number
  zoom: number
  // Whether this is a precise address/POI (vs. a city/neighborhood/region).
  isAddress: boolean
}

// Pick a sensible zoom for the selected place — tighter for a precise address,
// wider for a city or region (so "subleases in Montreal" frames the whole city).
const zoomForType = (placeTypes: string[]): number => {
  if (placeTypes.includes('address') || placeTypes.includes('poi')) return 16
  if (placeTypes.includes('neighborhood') || placeTypes.includes('locality')) return 14
  if (placeTypes.includes('place')) return 12
  if (placeTypes.includes('region')) return 9
  if (placeTypes.includes('country')) return 5
  return 13
}

// McGill fallback when we don't know where the user is looking.
const DEFAULT_PROXIMITY = { lng: -73.5772, lat: 45.5047 }

// Cheap equirectangular distance² between two points — good enough for ordering
// suggestions at local scale (corrects longitude for latitude).
const distanceSq = (
  a: { lng: number; lat: number },
  b: { lng: number; lat: number }
): number => {
  const dLat = a.lat - b.lat
  const dLng = (a.lng - b.lng) * Math.cos((b.lat * Math.PI) / 180)
  return dLat * dLat + dLng * dLng
}

// Forward-geocode a free-text query, biased toward (and sorted by distance from)
// `proximity` — the point the user is currently looking at, or McGill by default.
export async function geocodePlaces(
  query: string,
  token: string,
  proximity?: { lng: number; lat: number }
): Promise<GeoResult[]> {
  const prox = proximity ?? DEFAULT_PROXIMITY
  const res = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      query
    )}.json?access_token=${token}&autocomplete=true&limit=5` +
      `&types=place,locality,neighborhood,region,address&proximity=${prox.lng},${prox.lat}`
  )
  const json = await res.json()
  const results: GeoResult[] = (json.features ?? []).map((f: any) => {
    const placeTypes: string[] = f.place_type ?? []
    return {
      name: f.place_name as string,
      lng: f.center[0] as number,
      lat: f.center[1] as number,
      zoom: zoomForType(placeTypes),
      isAddress: placeTypes.includes('address') || placeTypes.includes('poi'),
    }
  })

  // Order nearest-first relative to where the user is looking.
  results.sort((a, b) => distanceSq(a, prox) - distanceSq(b, prox))
  return results
}
