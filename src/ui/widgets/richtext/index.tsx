/**
 * Lazy entry for the rich-text widget. `React.lazy` + dynamic import keep TipTap /
 * ProseMirror out of the main bundle — it loads only when a `richtext` field is
 * actually rendered. Registered under the `rich-text` id (see widgets/defaults).
 */
import { lazy, Suspense, type ComponentType } from 'react'
import type { WidgetProps } from '../types'
import { editorMaxHeight, editorMinHeight, TOOLBAR_REM } from './height'

const RichTextEditor = lazy(() => import('./RichTextEditor'))

/** Matches the editor's resting height (body + toolbar), capped the same way, so the
 *  layout doesn't jump when the real editor swaps in — `form.rows` included. */
function EditorFallback({ rows, maxRows }: { rows?: number; maxRows?: number }) {
  const body = editorMinHeight(rows) ?? '8rem'
  return (
    <div
      className="animate-pulse rounded-md border bg-muted/30"
      style={{
        height: `calc(${body} + ${TOOLBAR_REM}rem)`,
        maxHeight: editorMaxHeight(rows, maxRows)
      }}
    />
  )
}

export function RichTextWidget(props: WidgetProps) {
  return (
    <Suspense
      fallback={<EditorFallback rows={props.field.form?.rows} maxRows={props.field.form?.maxRows} />}
    >
      <RichTextEditor {...props} />
    </Suspense>
  )
}

/** Widget-registry entries shipped by the engine for rich text. */
export const richtextWidgets: Record<string, ComponentType<WidgetProps>> = {
  'rich-text': RichTextWidget
}
