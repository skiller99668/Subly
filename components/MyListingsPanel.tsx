'use client'

import { useState } from 'react'
import { X, Plus, Pencil, Trash2 } from 'lucide-react'
import { Listing } from '@/utils/supabase'
import ListingAddress from './ListingAddress'

interface MyListingsPanelProps {
  open: boolean
  onClose: () => void
  listings: Listing[]
  onAdd: () => void
  onEdit: (listing: Listing) => void
  // Refresh listings after a delete.
  onChanged: () => void
}

export default function MyListingsPanel({
  open,
  onClose,
  listings,
  onAdd,
  onEdit,
  onChanged,
}: MyListingsPanelProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  if (!open) return null

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this listing? This cannot be undone.')) return
    setDeletingId(id)
    setError('')
    try {
      const res = await fetch(`/api/listings/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to delete listing.')
      } else {
        onChanged()
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete listing.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      {/* Dimmed backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-[58]"
        onClick={onClose}
        aria-hidden
      />

      {/* Slide-in panel */}
      <div className="fixed inset-y-0 right-0 z-[59] w-full sm:max-w-lg bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">My Listings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            aria-label="Close"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Add button */}
        <div className="px-6 py-4 border-b">
          <button
            onClick={onAdd}
            className="flex items-center justify-center gap-2 w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 rounded-lg transition"
          >
            <Plus size={18} /> Add a new listing
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error && (
            <div className="p-3 mb-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {listings.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-10">
              You haven&apos;t posted any listings yet.
            </p>
          ) : (
            <div className="space-y-3">
              {listings.map((listing) => (
                <div
                  key={listing.id}
                  className="flex gap-3 p-3 border border-gray-200 rounded-lg"
                >
                  {/* Thumbnail */}
                  <div className="w-20 h-20 shrink-0 rounded-md overflow-hidden bg-gray-100">
                    {listing.images && listing.images.length > 0 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={listing.images[0]}
                        alt={listing.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">
                        No photo
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-gray-800 truncate">
                      {listing.title}
                    </h3>
                    <p className="text-xs text-gray-500 truncate">
                      <ListingAddress listing={listing} />
                    </p>
                    <p className="text-sm text-gray-600">
                      ${listing.price}/mo · {listing.size} sq ft
                    </p>
                    <p className="text-xs text-gray-400">
                      Move-in: {listing.move_in_date}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => onEdit(listing)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition"
                      aria-label="Edit listing"
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(listing.id)}
                      disabled={deletingId === listing.id}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
                      aria-label="Delete listing"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
