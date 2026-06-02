import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Type definitions for database tables
export interface User {
  id: string
  username: string
  email: string
  name: string
  avatar_url?: string
  bio?: string
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
