import { AlertTriangle, Info } from 'lucide-react'
import { composeNotice, formatNoticeValue, useI18n, type Notice } from '@/engine'
import { Badge } from '@/ui/components/ui/badge'
import { cn } from '@/lib/utils'

/** One notice: its level, its sentence, its time, and whether this reader has seen it. */
export function NoticeItem({ notice, showSeen = false }: { notice: Notice; showSeen?: boolean }) {
  const { t, has, locale } = useI18n()
  const warning = notice.level === 'warning'
  const LevelIcon = warning ? AlertTriangle : Info
  return (
    <li className="flex items-start gap-3 py-3">
      <span
        className={cn(
          'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full',
          warning ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
        )}
      >
        <LevelIcon className="size-4" aria-hidden />
        <span className="sr-only">{t(`notices.level.${notice.level}`)}</span>
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="break-words text-sm">{composeNotice(notice, { t, has, locale })}</p>
        {notice.at && (
          <time dateTime={notice.at} className="block text-xs text-muted-foreground">
            {formatNoticeValue(notice.at, locale)}
          </time>
        )}
      </div>
      {showSeen && !notice.seen && <Badge className="shrink-0">{t('notices.new')}</Badge>}
    </li>
  )
}
