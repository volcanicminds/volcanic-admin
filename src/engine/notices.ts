/**
 * The administrators' notices: what the backend's `GET /notices` (tenant plane) or
 * `GET /system/notices` (control plane) answers, and the sentence the console composes for each.
 *
 * A notice carries no text, only `source`, `kind` and `data`: the sentence comes from the
 * dictionary key `notice.<source>.<kind>`, with `{field}` filled from `data`. When `data.count` is
 * a number the plural form `notice.<source>.<kind>.<category>` (`one`, `other`, as
 * `Intl.PluralRules` names them for the locale) wins over the plain key. A key no dictionary holds
 * gives a sentence naming the source and the kind, so a source the console does not know yet still
 * shows up.
 */
import type { Plane } from './auth/endpoints.js'

export type NoticeLevel = 'info' | 'warning'

export interface Notice {
  source: string
  /** `<source>:<id>`, the value `POST .../seen` takes back. */
  id: string
  kind: string
  level: NoticeLevel
  /** Full ISO instant. */
  at?: string
  data?: Record<string, unknown>
  seen: boolean
}

export interface NoticeList {
  notices: Notice[]
  /** The sources that could not answer: their notices are missing, not cleared. */
  failed: string[]
}

export const NOTICES_PATH: Record<Plane, string> = {
  tenant: '/notices',
  control: '/system/notices'
}

/** The most ids one `POST .../seen` takes: the backend refuses a longer list. */
export const SEEN_BATCH = 100

/** The data provider's `custom`, reduced to what the notices need. */
export type NoticeRequest = (req: { url: string; method: 'get' | 'post'; payload?: unknown }) => Promise<{ data: unknown }>

export function isNoticeList(body: unknown): body is NoticeList {
  if (!body || typeof body !== 'object') return false
  const { notices, failed } = body as Record<string, unknown>
  return Array.isArray(notices) && Array.isArray(failed)
}

/**
 * The reader's notices, or `null` when this console has none to show: the request wrapper hands a
 * refused answer back as its body instead of throwing, so a 403 (no `notices` capability), a
 * backend without the route and a failure all arrive as a body that is not a list.
 */
export async function loadNotices(request: NoticeRequest, plane: Plane): Promise<NoticeList | null> {
  try {
    const { data } = await request({ url: NOTICES_PATH[plane], method: 'get' })
    return isNoticeList(data) ? data : null
  } catch {
    return null
  }
}

/** Marks the notices seen, in batches the backend accepts. Throws when one is refused. */
export async function markNoticesSeen(request: NoticeRequest, plane: Plane, ids: string[]): Promise<void> {
  for (let i = 0; i < ids.length; i += SEEN_BATCH) {
    const { data } = await request({
      url: `${NOTICES_PATH[plane]}/seen`,
      method: 'post',
      payload: { ids: ids.slice(i, i + SEEN_BATCH) }
    })
    // The route answers 204, which the wrapper turns into `undefined`; any body is a refusal.
    if (data !== undefined) throw new Error(`POST ${NOTICES_PATH[plane]}/seen was refused`)
  }
}

/** Unseen first, then warnings, then the newest. */
export function sortNotices(notices: Notice[]): Notice[] {
  const rank = (n: Notice) => (n.seen ? 2 : 0) + (n.level === 'warning' ? 0 : 1)
  return [...notices].sort((a, b) => rank(a) - rank(b) || (b.at ?? '').localeCompare(a.at ?? ''))
}

const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/
const DAY = /^\d{4}-\d{2}-\d{2}$/

/** An instant in the reader's zone and locale; a calendar date stays that day in every zone. */
export function formatNoticeValue(value: unknown, locale: string): string | undefined {
  if (value == null) return ''
  if (typeof value === 'number') return value.toLocaleString(locale)
  if (typeof value === 'string') {
    if (INSTANT.test(value)) {
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? value : date.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })
    }
    if (DAY.test(value)) {
      const date = new Date(`${value}T00:00:00Z`)
      return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(locale, { dateStyle: 'medium', timeZone: 'UTC' })
    }
    return value
  }
  if (typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map((v) => formatNoticeValue(v, locale) ?? '').join(', ')
  // An object has no single sentence form: its placeholder stays as written.
  return undefined
}

export function noticeVars(data: Notice['data'], locale: string): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const [key, value] of Object.entries(data ?? {})) {
    const text = formatNoticeValue(value, locale)
    if (text !== undefined) vars[key] = text
  }
  return vars
}

export interface NoticeTranslator {
  t: (key?: string, vars?: Record<string, string | number>) => string
  has: (key: string) => boolean
  locale: string
}

export function composeNotice(notice: Notice, { t, has, locale }: NoticeTranslator): string {
  const key = `notice.${notice.source}.${notice.kind}`
  const vars = noticeVars(notice.data, locale)
  const count = notice.data?.count
  const plural = typeof count === 'number' ? `${key}.${new Intl.PluralRules(locale).select(count)}` : undefined
  if (plural && has(plural)) return t(plural, vars)
  if (has(key)) return t(key, vars)
  return t('notices.fallback', { source: notice.source, kind: notice.kind })
}
