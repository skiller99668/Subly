// Student-oriented attributes a poster can truthfully self-apply to a listing.
// This is the single source of truth shared by the post form, the listing
// detail view, and the map's category filter bar — add a tag here and it shows
// up everywhere automatically.

import {
  Users,
  PersonStanding,
  GraduationCap,
  School,
  Sofa,
  Plug,
  Dog,
  Heart,
  type LucideIcon,
} from 'lucide-react'

export interface ListingTag {
  id: string
  label: string
  icon: LucideIcon
  description: string
}

export const LISTING_TAGS: ListingTag[] = [
  {
    id: 'roommate',
    label: 'Roommate wanted',
    icon: Users,
    description: 'Looking for someone to share the place',
  },
  {
    id: 'women_only',
    label: 'Women only',
    icon: PersonStanding,
    description: 'Open to women tenants only',
  },
  {
    id: 'students_welcome',
    label: 'Students welcome',
    icon: GraduationCap,
    description: 'Student-friendly host',
  },
  {
    id: 'near_campus',
    label: 'Near campus',
    icon: School,
    description: 'Walkable or a short commute to school',
  },
  {
    id: 'furnished',
    label: 'Furnished',
    icon: Sofa,
    description: 'Comes furnished',
  },
  {
    id: 'utilities_included',
    label: 'Utilities included',
    icon: Plug,
    description: 'Rent covers utilities',
  },
  {
    id: 'pet_friendly',
    label: 'Pet friendly',
    icon: Dog,
    description: 'Pets allowed',
  },
  {
    id: 'lgbtq_friendly',
    label: 'LGBTQ+ friendly',
    icon: Heart,
    description: 'Inclusive & welcoming',
  },
]

// Quick lookup by id, for rendering a stored tag's label/icon.
export const TAG_BY_ID: Record<string, ListingTag> = Object.fromEntries(
  LISTING_TAGS.map((tag) => [tag.id, tag])
)
