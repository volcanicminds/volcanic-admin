/**
 * Lazy entry for the rich-text widget. `React.lazy` + dynamic import keep TipTap /
 * ProseMirror out of the main bundle — it loads only when a `richtext` field is
 * actually rendered. Registered under the `rich-text` id (see widgets/defaults).
 */
import { lazy, Suspense, type ComponentType } from 'react'
import type { WidgetProps } from '../types'

const RichTextEditor = lazy(() => import('./RichTextEditor'))

/** Matches the editor's collapsed height so the layout doesn't jump while loading. */
function EditorFallback() {
  return <div className="h-[calc(8rem+2.5rem)] animate-pulse rounded-md border bg-muted/30" />
}

export function RichTextWidget(props: WidgetProps) {
  return (
    <Suspense fallback={<EditorFallback />}>
      <RichTextEditor {...props} />
    </Suspense>
  )
}

/** Widget-registry entries shipped by the engine for rich text. */
export const richtextWidgets: Record<string, ComponentType<WidgetProps>> = {
  'rich-text': RichTextWidget
}
