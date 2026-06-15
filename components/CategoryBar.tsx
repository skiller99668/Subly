'use client'

import { SlidersHorizontal } from 'lucide-react'
import { LISTING_TAGS } from '@/utils/listingTags'

interface CategoryBarProps {
  // Currently-active tag ids (AND-filter: a listing must have all of them).
  active: string[]
  onToggle: (id: string) => void
  onClear: () => void
}

// Airbnb-style horizontal category strip that sits under the top menu and
// filters the map by student attribute tags. "All" clears every selection.
export default function CategoryBar({ active, onToggle, onClear }: CategoryBarProps) {
  return (
    <div className="absolute top-16 left-0 right-0 z-40 pointer-events-none">
      <div className="mx-auto max-w-full px-3 py-2">
        <div className="pointer-events-auto flex items-center gap-2 overflow-x-auto rounded-full bg-white/95 px-2 py-1.5 shadow-md ring-1 ring-black/5 backdrop-blur [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* All / clear */}
          <button
            onClick={onClear}
            aria-pressed={active.length === 0}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
              active.length === 0
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <SlidersHorizontal size={14} />
            All
          </button>

          <span className="h-5 w-px shrink-0 bg-gray-200" aria-hidden />

          {LISTING_TAGS.map(({ id, label, icon: Icon }) => {
            const on = active.includes(id)
            return (
              <button
                key={id}
                onClick={() => onToggle(id)}
                aria-pressed={on}
                title={label}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  on
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
