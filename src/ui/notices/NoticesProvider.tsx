/**
 * The reader's notices for the authenticated shell: read once on entering it and again on a tenant
 * switch or a visit to the page. `available` is false when the backend gives this reader none to
 * read (no `notices` capability, no route): the page, the nav entry and the pop-up stay hidden and
 * nothing is reported.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useDataProvider } from '@refinedev/core'
import { loadNotices, markNoticesSeen, useTenant, type Notice, type NoticeRequest } from '@/engine'
import { useAdminConfig } from '@/ui/config'

interface NoticesValue {
  /** `undefined` until the first answer. */
  available: boolean | undefined
  notices: Notice[]
  failed: string[]
  unseen: number
  refresh: () => Promise<void>
  /** Throws when the backend refuses; the notices stay unseen then. */
  markSeen: (ids: string[]) => Promise<void>
}

const NoticesContext = createContext<NoticesValue>({
  available: false,
  notices: [],
  failed: [],
  unseen: 0,
  refresh: async () => {},
  markSeen: async () => {}
})

export function NoticesProvider({ children }: { children: ReactNode }) {
  const dataProvider = useDataProvider()
  const { plane } = useAdminConfig()
  const { currentTenantId } = useTenant()
  const [available, setAvailable] = useState<boolean>()
  const [notices, setNotices] = useState<Notice[]>([])
  const [failed, setFailed] = useState<string[]>([])

  const request = useMemo<NoticeRequest | undefined>(() => {
    const custom = dataProvider().custom
    return custom ? (req) => custom(req) : undefined
  }, [dataProvider])

  const refresh = useCallback(async () => {
    const list = request ? await loadNotices(request, plane) : null
    setAvailable(list !== null)
    setNotices(list?.notices ?? [])
    setFailed(list?.failed ?? [])
  }, [request, plane])

  // The notices belong to the tenant the console works on: a switch reads them again.
  useEffect(() => {
    void refresh()
  }, [refresh, currentTenantId])

  const markSeen = useCallback(
    async (ids: string[]) => {
      if (!request || ids.length === 0) return
      await markNoticesSeen(request, plane, ids)
      const marked = new Set(ids)
      setNotices((list) => list.map((n) => (marked.has(n.id) ? { ...n, seen: true } : n)))
    },
    [request, plane]
  )

  const value = useMemo<NoticesValue>(
    () => ({ available, notices, failed, unseen: notices.filter((n) => !n.seen).length, refresh, markSeen }),
    [available, notices, failed, refresh, markSeen]
  )

  return <NoticesContext.Provider value={value}>{children}</NoticesContext.Provider>
}

export function useNotices(): NoticesValue {
  return useContext(NoticesContext)
}
