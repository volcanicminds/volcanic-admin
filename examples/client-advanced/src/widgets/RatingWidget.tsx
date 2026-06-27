/**
 * Custom field widget — registered as `rating`. Used wherever the manifest sets
 * a field's `form.widget` to "rating". Receives the standard WidgetProps.
 */
import type { WidgetProps } from '@volcanicminds/admin'

export function RatingWidget({ value, onChange, disabled }: WidgetProps) {
  const current = Number(value ?? 0)
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n)}
          className="text-xl leading-none text-primary disabled:opacity-50"
          aria-label={`${n}`}
        >
          {n <= current ? '★' : '☆'}
        </button>
      ))}
    </div>
  )
}
