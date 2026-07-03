'use client'

import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  rating: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  interactive?: boolean
  onChange?: (rating: number) => void
  className?: string
}

const SIZE_CLASSES = {
  sm: 'size-3.5',
  md: 'size-5',
  lg: 'size-6',
}

export function StarRating({
  rating,
  max = 5,
  size = 'md',
  interactive = false,
  onChange,
  className,
}: StarRatingProps) {
  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {Array.from({ length: max }, (_, i) => {
        const starValue = i + 1
        const filled = starValue <= rating
        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            className={cn(
              'relative inline-flex shrink-0 transition-colors',
              interactive && 'cursor-pointer hover:scale-110',
              !interactive && 'cursor-default',
            )}
            onClick={() => interactive && onChange?.(starValue)}
          >
            <Star
              className={cn(
                SIZE_CLASSES[size],
                filled
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-transparent text-muted-foreground/40',
              )}
            />
          </button>
        )
      })}
    </div>
  )
}

/** Read-only stars rendered as text characters */
export function StarRatingText({ rating, max = 5, className }: { rating: number; max?: number; className?: string }) {
  return (
    <span className={cn('text-amber-400 tracking-wide', className)}>
      {Array.from({ length: max }, (_, i) => (i < rating ? '★' : '☆')).join('')}
    </span>
  )
}