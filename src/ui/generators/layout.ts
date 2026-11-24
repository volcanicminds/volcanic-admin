/**
 * Shared grid layout helpers for the detail (ShowView) and form (AutoForm) views.
 * The column count comes from the form view block (`form.columns`, or a group's
 * own `columns`), clamped to 1–4 (default 2).
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

const COL_START: Record<number, string> = {
  1: 'md:col-start-1',
  2: 'md:col-start-2',
  3: 'md:col-start-3',
  4: 'md:col-start-4'
}

const ROW_SPAN: Record<number, string> = {
  2: 'md:row-span-2',
  3: 'md:row-span-3',
  4: 'md:row-span-4'
}

/**
 * A page bar pinned to the top or bottom edge of the main area (list toolbar and footer, detail
 * and form headers). It bleeds into the main's padding with negative margins read from the
 * `--page-padding` token, so it spans the full width and sits flush under the app topbar at
 * every breakpoint; the opaque background is load-bearing, content scrolls underneath it.
 */
export const PAGE_BAR = {
  top: 'sticky -top-[var(--page-padding)] z-20 -mx-[var(--page-padding)] border-b bg-background px-[var(--page-padding)] py-4',
  bottom:
    'sticky -bottom-[var(--page-padding)] z-20 -mx-[var(--page-padding)] border-t bg-background px-[var(--page-padding)] py-4'
} as const

/** Clamp the configured column count to a supported value (1–4, default 2). */
export function detailColumns(cols: number | undefined): number {
  const n = Math.round(cols ?? 2)
  return Math.min(4, Math.max(1, Number.isFinite(n) ? n : 2))
}

/** Grid class for a section body: single column on mobile, `cols` from md up. */
export function sectionGridClass(cols: number): string {
  return `grid grid-cols-1 gap-4 ${GRID_COLS[cols] ?? GRID_COLS[2]}`
}

/** Grid class for a detail section: the form's columns, tighter rows (a value is one line, not a control). */
export function detailGridClass(cols: number): string {
  return `grid grid-cols-1 gap-x-8 gap-y-2 ${GRID_COLS[cols] ?? GRID_COLS[2]}`
}

/**
 * Grid placement classes for a single field within a `cols`-wide grid. Image and
 * richtext fields always span the full row; an explicit `form.colSpan` spans that
 * many columns (capped at the grid width). An explicit `form.colStart` forces the
 * field to a 1-based start column (capped at the grid width) — leaving the earlier
 * cells of the row empty and breaking to the next row when that column is taken.
 * An explicit `form.rowSpan` makes the field span that many grid rows (e.g. a tall
 * textarea beside stacked fields). Returns undefined for a plain 1-col, single-row,
 * auto-placed field (the grid default).
 */
export function fieldSpanClass(field: ResolvedField, cols: number): string | undefined {
  const heavy = field.type === 'image' || field.type === 'richtext'
  const raw = heavy ? cols : (field.form?.colSpan ?? 1)
  const span = Math.min(Math.max(Math.round(raw), 1), cols)
  const classes: string[] = []
  if (span > 1) classes.push(COL_SPAN[span])
  if (field.form?.colStart != null) {
    const start = Math.min(Math.max(Math.round(field.form.colStart), 1), cols)
    if (COL_START[start]) classes.push(COL_START[start])
  }
  if (field.form?.rowSpan != null) {
    const rows = Math.min(Math.max(Math.round(field.form.rowSpan), 1), 4)
    if (ROW_SPAN[rows]) classes.push(ROW_SPAN[rows])
  }
  return classes.length ? classes.join(' ') : undefined
}
