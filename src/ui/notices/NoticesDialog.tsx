/**
 * The notices this reader has not seen, once per page load: closing the dialog marks them seen on
 * the backend, so they do not pop up again on any device the same person opens.
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { sortNotices, useT, type Notice } from '@/engine'
import { Button } from '@/ui/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/ui/components/ui/dialog'
import { NoticeItem } from './NoticeItem'
import { useNotices } from './NoticesProvider'

export function NoticesDialog() {
  const t = useT()
  const navigate = useNavigate()
  const { notices, markSeen } = useNotices()
  const [shown, setShown] = useState<Notice[]>([])
  // Ids already shown in this page load: a refused mark must not open the dialog again.
  const popped = useRef(new Set<string>())

  useEffect(() => {
    if (shown.length) return
    const fresh = notices.filter((n) => !n.seen && !popped.current.has(n.id))
    if (fresh.length) setShown(sortNotices(fresh))
  }, [notices, shown.length])

  function close(next?: string) {
    const ids = shown.map((n) => n.id)
    ids.forEach((id) => popped.current.add(id))
    setShown([])
    markSeen(ids).catch(() => toast.error(t('notices.error.seen')))
    if (next) navigate(next)
  }

  return (
    <Dialog open={shown.length > 0} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('notices.dialog.title')}</DialogTitle>
          <DialogDescription className="sr-only">{t('notices.title')}</DialogDescription>
        </DialogHeader>
        <ul className="max-h-[60vh] divide-y overflow-y-auto">
          {shown.map((n) => (
            <NoticeItem key={n.id} notice={n} />
          ))}
        </ul>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => close('/notices')}>
            {t('notices.dialog.all')}
          </Button>
          <Button type="button" onClick={() => close()}>
            {t('notices.dialog.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
