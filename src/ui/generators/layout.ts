/**
 * Shared grid layout helpers for the detail (ShowView) and form (AutoForm) views.
 * The column count is a per-resource hint (`spec.detailColumns`, 1–4, default 2).
 *
 * Class names are looked up from static maps rather than built dynamically so the
 * Tailwind JIT sees every literal it must generate (dynamically composed class
 * strings would be purged from the build).
 */
import type { ResolvedField } from '@/engine'

const GRID_COLS: Record<number, string> = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4'
}

const COL_SPAN: Record<number, string> = {
  2: 'md:col-span-2',
  3: 'md:col-span-3',
  4: 'md:col-span-4'
}

/** Clamp the configured column count to a supported value (1–4, default 2). */
export function detailColumns(cols: number | undefined): number {
  const n = Math.round(cols ?? 2)
  return Math.min(4, Math.max(1, Number.isFinite(n) ? n : 2))
}

/** Grid class for a section body: single column on mobile, `cols` from md up. */
export function sectionGridClass(cols: number): string {
  return `grid grid-cols-1 gap-4 ${GRID_COLS[cols] ?? GRID_COLS[2]}`
}

/**
 * Column span class for a single field within a `cols`-wide grid. Image and
 * richtext fields always span the full row; an explicit `form.colSpan` spans that
 * many columns (capped at the grid width). Returns undefined for a plain 1-col
 * field (the grid default).
 */
export function fieldSpanClass(field: ResolvedField, cols: number): string | undefined {
  const heavy = field.type === 'image' || field.type === 'richtext'
  const raw = heavy ? cols : (field.form?.colSpan ?? 1)
  const span = Math.min(Math.max(Math.round(raw), 1), cols)
  return span > 1 ? COL_SPAN[span] : undefined
}
