/**
 * A `datetime-local` input holds a wall-clock time with no zone and no seconds
 * ("2026-12-31T10:00"), which a server validating `format: 'date-time'` refuses. The
 * form keeps the full ISO instant, as the server sends and expects it; the input shows
 * it in the browser's zone.
 */

const pad = (n: number) => String(n).padStart(2, '0')

/** An instant as a `datetime-local` value in the browser's zone; '' for none or an invalid one. */
export function toLocalInput(value: unknown): string {
  if (typeof value !== 'string' || !value) return ''
  const at = new Date(value)
  if (Number.isNaN(at.getTime())) return ''
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}T${pad(at.getHours())}:${pad(at.getMinutes())}`
}

/** The instant a `datetime-local` value names in the browser's zone, as ISO; '' stays '', so the form sends null. */
export function fromLocalInput(local: string): string {
  if (!local) return ''
  const at = new Date(local)
  return Number.isNaN(at.getTime()) ? '' : at.toISOString()
}
