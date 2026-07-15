/**
 * Lazy entry for the rich-text widget. `React.lazy` + dynamic import keep TipTap /
 * ProseMirror out of the main bundle — it loads only when a `richtext` field is
 * actually rendered. Registered under the `rich-text` id (see widgets/defaults).
 */
import { lazy, Suspense, type ComponentType } from 'react'
import type { WidgetProps } from '../types'

const RichTextEditor = lazy(() => import('./RichTextEditor'))

/** Matches the editor's collapsed height (body + 2.5rem toolbar) so the layout
 *  doesn't jump while loading — including when `form.rows` makes it taller. */
function EditorFallback({ rows }: { rows?: number }) {
  const body = rows ? `${rows * 1.5}rem` : '8rem'
  return (
    <div
      className="animate-pulse rounded-md border bg-muted/30"
      style={{ height: `calc(${body} + 2.5rem)` }}
    />
  )
}

export function RichTextWidget(props: WidgetProps) {
  return (
    <Suspense fallback={<EditorFallback rows={props.field.form?.rows} />}>
      <RichTextEditor {...props} />
    </Suspense>
  )
}

/** Widget-registry entries shipped by the engine for rich text. */
export const richtextWidgets: Record<string, ComponentType<WidgetProps>> = {
  'rich-text': RichTextWidget
}
