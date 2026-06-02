import { createBrowserClient } from "@supabase/auth-helpers-nextjs"
import type { SupabaseClient } from "@supabase/supabase-js"

// Lazily-created, cookie-based browser client (a singleton per tab). Cookie
// storage is what lets server route handlers read the same session. Created
// lazily so importing the types below from server code never instantiates it.
let browserClient: SupabaseClient | undefined

export function getSupabaseBrowserClient(): SupabaseClient {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return browserClient
}

// Type definitions for database tables
export interface User {
  id: string
  username: string
  email: string
  name: string
  avatar_url?: string
  bio?: string
  location_name?: string
  location_lat?: number
  location_lng?: number
  created_at: string
}

export interface Listing {
  id: string
  user_id: string
  title: string
  description: string
  price: number
  size: number
  lat: number
  lng: number
  move_in_date: string
  images?: string[]
  created_at: string
  user?: User
}

export interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  created_at: string
  read_at?: string
  sender?: User
  receiver?: User
}

export interface Favorite {
  id: string
  user_id: string
  listing_id: string
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: "message" | "listing" | "favorite"
  related_listing_id?: string
  related_user_id?: string
  created_at: string
  read_at?: string
}
