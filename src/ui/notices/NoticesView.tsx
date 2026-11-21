/** Every current notice of this reader, seen or not, newest unseen first. */
import { useEffect, useState } from 'react'
import { NavigateToResource } from '@refinedev/react-router'
import { toast } from 'sonner'
import { sortNotices, useT } from '@/engine'
import { Button } from '@/ui/components/ui/button'
import { Card, CardContent } from '@/ui/components/ui/card'
import { NoticeItem } from './NoticeItem'
import { useNotices } from './NoticesProvider'

export function NoticesView() {
  const t = useT()
  const { available, notices, failed, unseen, refresh, markSeen } = useNotices()
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void refresh()
  }, [refresh])

  if (available === false) return <NavigateToResource />

  async function markAll() {
    setBusy(true)
    try {
      await markSeen(notices.filter((n) => !n.seen).map((n) => n.id))
    } catch {
      toast.error(t('notices.error.seen'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t('notices.title')}</h1>
        <Button type="button" variant="outline" size="sm" disabled={busy || unseen === 0} onClick={markAll}>
          {t('notices.markAll')}
        </Button>
      </div>
      {failed.length > 0 && (
        <p role="status" className="text-sm text-muted-foreground">
          {t('notices.failed', { sources: failed.join(', ') })}
        </p>
      )}
      <Card>
        <CardContent className="py-2">
          {available === undefined ? (
            <p className="py-3 text-sm text-muted-foreground">{t('state.loading')}</p>
          ) : notices.length === 0 ? (
            <p className="py-3 text-sm text-muted-foreground">{t('notices.empty')}</p>
          ) : (
            <ul className="divide-y">
              {sortNotices(notices).map((n) => (
                <NoticeItem key={n.id} notice={n} showSeen />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
