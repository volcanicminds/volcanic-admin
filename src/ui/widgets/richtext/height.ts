/**
 * Height rules for the rich-text editor, shared by the editor itself and by the
 * lazy-loading placeholder.
 *
 * Kept in its own module ON PURPOSE: the placeholder lives in the eagerly-loaded
 * `index.tsx`, so importing these from `RichTextEditor.tsx` would drag TipTap /
 * ProseMirror into the main bundle and defeat the lazy chunk.
 *
 * The editor box has a ceiling because without one it grows with every line typed:
 * the field gets taller than the window and its own toolbar scrolls off the top,
 * exactly when a long text needs it most. Past the ceiling the box scrolls its own
 * content and the toolbar stays put (it is sticky inside the box).
 */

/** One prose-sm line, in rem — `rows`/`maxRows` are counted in these. */
export const ROW_REM = 1.5
/** Rendered height of the toolbar strip (icon buttons + padding). */
export const TOOLBAR_REM = 2.5
/** Ceiling when neither `maxRows` nor `rows` is declared. */
export const DEFAULT_MAX_ROWS = 20
/** Hard ceiling relative to the window: whatever the row counts ask for, the editor
 *  and its toolbar must still fit on screen — on a laptop 24 rows already don't. */
export const VIEWPORT_CAP = '70vh'

/** Height ceiling of the whole editor box, toolbar included. */
export function editorMaxHeight(
  rows: number | undefined,
  maxRows: number | undefined,
  withToolbar = true
): string {
  const cap = maxRows ?? rows ?? DEFAULT_MAX_ROWS
  const chrome = withToolbar ? ` + ${TOOLBAR_REM}rem` : ''
  return `min(calc(${cap * ROW_REM}rem${chrome}), ${VIEWPORT_CAP})`
}

/**
 * Resting height of the editable area for a declared `rows`, clamped to the same
 * viewport ceiling — otherwise a tall `rows` on a short screen would show a
 * scrollbar over empty space. Undefined = keep the widget's default min-height.
 */
export function editorMinHeight(rows: number | undefined, withToolbar = true): string | undefined {
  if (!rows) return undefined
  const chrome = withToolbar ? ` - ${TOOLBAR_REM}rem` : ''
  return `min(${rows * ROW_REM}rem, calc(${VIEWPORT_CAP}${chrome}))`
}
