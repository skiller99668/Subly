'use client'

import { useState, useEffect } from 'react'
import { X, MapPin, DollarSign, Ruler, Calendar, ImagePlus } from 'lucide-react'
import { useAuth } from '@/app/providers'
import { getSupabaseBrowserClient, Listing } from '@/utils/supabase'
import { GeoResult } from '@/utils/geocode'
import LocationSearchInput from './LocationSearchInput'

interface PostLeasePanelProps {
  open: boolean
  onClose: () => void
  // Fly the map to a location as the user picks it in the form.
  onLocationPreview: (lng: number, lat: number, zoom: number) => void
  // Called after a successful create/update with the listing's coordinates.
  onPosted: (listing: { lat: number; lng: number }) => void
  // Returns the current map center so suggestions can be sorted by proximity.
  getProximity?: () => { lng: number; lat: number } | undefined
  // When set, the panel edits this listing instead of creating a new one.
  listing?: Listing | null
}

export default function PostLeasePanel({
  open,
  onClose,
  onLocationPreview,
  onPosted,
  getProximity,
  listing,
}: PostLeasePanelProps) {
  const { user } = useAuth()
  const supabase = getSupabaseBrowserClient()
  const isEditing = !!listing

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [size, setSize] = useState('')
  const [moveInDate, setMoveInDate] = useState('')
  const [location, setLocation] = useState<{
    lng: number
    lat: number
    name: string
  } | null>(null)
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Prefill (edit) or reset (create) whenever the panel opens.
  useEffect(() => {
    if (!open) return
    if (listing) {
      setTitle(listing.title)
      setDescription(listing.description)
      setPrice(String(listing.price))
      setSize(String(listing.size))
      setMoveInDate(listing.move_in_date)
      setLocation({
        lng: listing.lng,
        lat: listing.lat,
        name: listing.address ?? '',
      })
      setExistingImages(listing.images ?? [])
    } else {
      setTitle('')
      setDescription('')
      setPrice('')
      setSize('')
      setMoveInDate('')
      setLocation(null)
      setExistingImages([])
    }
    setFiles([])
    setError('')
  }, [open, listing])

  const handleLocationSelect = (result: GeoResult) => {
    setLocation({ lng: result.lng, lat: result.lat, name: result.name })
    onLocationPreview(result.lng, result.lat, Math.max(result.zoom, 15))
  }

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)])
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const removeExistingImage = (url: string) => {
    setExistingImages((prev) => prev.filter((u) => u !== url))
  }

  // Upload newly-added images to the user's folder and return their public URLs.
  const uploadImages = async (): Promise<string[]> => {
    const urls: string[] = []
    for (const file of files) {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${user!.id}/${crypto.randomUUID()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('listing-images')
        .upload(path, file)
      if (upErr) throw new Error(`Image upload failed: ${upErr.message}`)
      const { data } = supabase.storage.from('listing-images').getPublicUrl(path)
      urls.push(data.publicUrl)
    }
    return urls
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!location) {
      setError('Please choose a location.')
      return
    }
    if (!title || !description || !price || !size || !moveInDate) {
      setError('Please fill in all fields.')
      return
    }

    setSubmitting(true)
    try {
      const uploaded = files.length > 0 ? await uploadImages() : []
      const images = [...existingImages, ...uploaded]

      const payload = {
        title,
        description,
        price,
        size,
        lat: location.lat,
        lng: location.lng,
        move_in_date: moveInDate,
        address: location.name || null,
        images,
      }

      const res = await fetch(
        isEditing ? `/api/listings/${listing!.id}` : '/api/listings',
        {
          method: isEditing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to save listing.')
        setSubmitting(false)
        return
      }

      onPosted({ lat: location.lat, lng: location.lng })
      onClose()
    } catch (err: any) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <>
      {/* Dimmed backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-[60]"
        onClick={onClose}
        aria-hidden
      />

      {/* Slide-in panel */}
      <div className="fixed inset-y-0 right-0 z-[61] w-full sm:max-w-xl bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">
            {isEditing ? 'Edit Listing' : 'Post a Lease'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            aria-label="Close"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Form body */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-6"
        >
          {/* Location */}
          <section>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <MapPin size={16} /> Location
            </label>
            <LocationSearchInput
              onSelect={handleLocationSelect}
              placeholder="Type an address to preview it on the map..."
              getProximity={getProximity}
            />
            {location && (
              <p className="mt-2 text-xs text-gray-500">
                {location.name
                  ? `Selected: ${location.name}`
                  : 'Using the saved location. Search above to set the address.'}
              </p>
            )}
          </section>

          {/* Title */}
          <section>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Listing title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Bright 1-bedroom near McGill"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </section>

          {/* Price + Size */}
          <section className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <DollarSign size={16} /> Price /month
              </label>
              <input
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="1200"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Ruler size={16} /> Size (sq ft)
              </label>
              <input
                type="number"
                min="0"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="600"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </section>

          {/* Move-in date */}
          <section>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <Calendar size={16} /> Move-in date
            </label>
            <input
              type="date"
              value={moveInDate}
              onChange={(e) => setMoveInDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </section>

          {/* Description */}
          <section>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Describe the space, amenities, lease terms..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </section>

          {/* Photos */}
          <section>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <ImagePlus size={16} /> Photos
            </label>

            {/* Existing images (edit mode) */}
            {existingImages.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-2">
                {existingImages.map((url) => (
                  <div key={url} className="relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt="Listing"
                      className="w-full h-20 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(url)}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"
                      aria-label="Remove photo"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 transition">
              <ImagePlus size={20} className="text-gray-400" />
              <span className="text-xs text-gray-500 mt-1">
                Click to add photos
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFiles}
                className="hidden"
              />
            </label>

            {/* Newly added files */}
            {files.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                {files.map((file, i) => (
                  <div key={i} className="relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Preview ${i + 1}`}
                      className="w-full h-20 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"
                      aria-label="Remove photo"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
        </form>

        {/* Sticky footer */}
        <div className="px-6 py-4 border-t">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50"
          >
            {submitting
              ? 'Saving…'
              : isEditing
              ? 'Save changes'
              : 'Post Listing'}
          </button>
        </div>
      </div>
    </>
  )
}
