// Browser-geolocation capture shared across the app. The landing page asks for
// the visitor's location once and stashes it here; the map reads it to spawn at
// that spot — even for signed-out visitors who have no saved profile location.
const STORAGE_KEY = 'subly.userLocation'

export interface StoredLocation {
  lng: number
  lat: number
  ts: number // epoch ms, so we can ignore stale fixes
}

// Persist a fix to localStorage. Best-effort: private-mode/quota errors are
// swallowed since the location is a nice-to-have, not load-bearing.
export function saveLocation(lng: number, lat: number): void {
  if (typeof window === 'undefined') return
  try {
    const value: StoredLocation = { lng, lat, ts: Date.now() }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

// Read a previously captured fix, or null if absent/malformed/too old.
export function readLocation(maxAgeMs = 1000 * 60 * 60 * 24): StoredLocation | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredLocation>
    if (typeof parsed.lng !== 'number' || typeof parsed.lat !== 'number') return null
    if (typeof parsed.ts !== 'number') return null
    if (maxAgeMs > 0 && Date.now() - parsed.ts > maxAgeMs) return null
    return { lng: parsed.lng, lat: parsed.lat, ts: parsed.ts }
  } catch {
    return null
  }
}

// Ask the browser for the current position and persist it on success.
// Resolves to the fix (or null if unavailable/denied) — never rejects.
export function requestAndSaveLocation(): Promise<StoredLocation | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        saveLocation(pos.coords.longitude, pos.coords.latitude)
        resolve({ lng: pos.coords.longitude, lat: pos.coords.latitude, ts: Date.now() })
      },
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    )
  })
}
