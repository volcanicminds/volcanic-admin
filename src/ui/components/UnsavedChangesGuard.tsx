/**
 * Guards against losing unsaved form edits. For in-app navigation (sidebar links
 * and any internal <a>) it intercepts the click and shows a styled ConfirmDialog
 * instead of navigating; on confirm it proceeds programmatically. For hard
 * navigation (reload, tab close, URL bar) it falls back to the native
 * `beforeunload` prompt — browsers don't allow a custom UI there.
 *
 * A click interceptor (rather than react-router's useBlocker) is used deliberately:
 * the app mounts a declarative <BrowserRouter>, and useBlocker requires a data
 * router. `shouldBlock` is read live at event time, so a programmatic post-save
 * redirect (navigate/back) is never intercepted.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useT } from '@/engine'
import { ConfirmDialog } from './ConfirmDialog'

/** True for links we can navigate to in-app (same-origin, plain left-click target). */
function inAppTarget(href: string | null, target: string | null): href is string {
  return Boolean(href) && !/^([a-z]+:)?\/\//i.test(href!) && !href!.startsWith('#') && (!target || target === '_self')
}

export function UnsavedChangesGuard({ shouldBlock }: { shouldBlock: () => boolean }) {
  const t = useT()
  const navigate = useNavigate()
  const [pending, setPending] = useState<string | null>(null)

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!shouldBlock()) return
      e.preventDefault()
      e.returnValue = ''
    }

    const onClick = (e: MouseEvent) => {
      // Only plain left-clicks that aren't already handled or opening a new tab.
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      if (!shouldBlock()) return
      const anchor = (e.target as HTMLElement | null)?.closest?.('a')
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (!inAppTarget(href, anchor.getAttribute('target'))) return
      if (href === window.location.pathname) return
      // Stop the router's own navigation and ask first.
      e.preventDefault()
      e.stopPropagation()
      setPending(href)
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('click', onClick, true)
    }
  }, [shouldBlock])

  return (
    <ConfirmDialog
      open={pending != null}
      onOpenChange={(open) => {
        if (!open) setPending(null)
      }}
      title={t('unsaved.title')}
      description={t('unsaved.text')}
      confirmLabel={t('unsaved.leave')}
      cancelLabel={t('unsaved.stay')}
      destructive
      onConfirm={() => {
        const to = pending
        setPending(null)
        if (to) navigate(to)
      }}
      onCancel={() => setPending(null)}
    />
  )
}
