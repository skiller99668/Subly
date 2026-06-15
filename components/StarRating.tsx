'use client'

import { Star } from 'lucide-react'

interface StarRatingProps {
  /** Current value, 0–5. Fractions are rounded for display. */
  value: number
  /** Provide to make the stars an interactive 1–5 picker. */
  onChange?: (value: number) => void
  size?: number
  className?: string
}

// Reusable star display / picker. Read-only when `onChange` is omitted.
export default function StarRating({
  value,
  onChange,
  size = 18,
  className = '',
}: StarRatingProps) {
  const interactive = typeof onChange === 'function'
  const rounded = Math.round(value)

  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= rounded
        const icon = (
          <Star
            size={size}
            className={filled ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}
          />
        )

        if (!interactive) {
          return <span key={star}>{icon}</span>
        }

        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange!(star)}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
            className="transition hover:scale-110"
          >
            {icon}
          </button>
        )
      })}
    </div>
  )
}
