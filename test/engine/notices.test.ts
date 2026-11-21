import { describe, expect, it } from 'vitest'
import {
  composeNotice,
  formatNoticeValue,
  loadNotices,
  markNoticesSeen,
  sortNotices,
  type Notice,
  type NoticeRequest
} from '@/engine/notices'

const notice = (over: Partial<Notice> = {}): Notice => ({
  source: 'rag',
  id: 'rag:waiting',
  kind: 'waiting',
  level: 'warning',
  data: { count: 3, days: 7 },
  seen: false,
  ...over
})

// A translator over one dictionary, with the engine's `{field}` interpolation.
function translator(dict: Record<string, string>, locale = 'en') {
  return {
    locale,
    has: (key: string) => key in dict,
    t: (key?: string, vars?: Record<string, string | number>) =>
      (dict[key ?? ''] ?? key ?? '').replace(/\{(\w+)\}/g, (_, k) => String(vars?.[k] ?? `{${k}}`))
  }
}

describe('composeNotice', () => {
  it('fills the sentence of notice.<source>.<kind> from data', () => {
    const text = composeNotice(notice(), translator({ 'notice.rag.waiting': '{count} cases past {days} days' }))
    expect(text).toBe('3 cases past 7 days')
  })

  it('takes the plural form of data.count over the plain key', () => {
    const dict = {
      'notice.rag.waiting': 'plain',
      'notice.rag.waiting.one': 'one case',
      'notice.rag.waiting.other': '{count} cases'
    }
    expect(composeNotice(notice({ data: { count: 1 } }), translator(dict))).toBe('one case')
    expect(composeNotice(notice({ data: { count: 4 } }), translator(dict))).toBe('4 cases')
  })

  it('names source and kind when no dictionary knows the notice', () => {
    const text = composeNotice(notice({ source: 'billing', kind: 'overdue' }), translator({ 'notices.fallback': '{source}: {kind}' }))
    expect(text).toBe('billing: overdue')
  })

  it('formats instants in the locale, joins lists, and leaves an object placeholder as written', () => {
    const at = '2026-11-21T09:30:00.000Z'
    const text = composeNotice(
      notice({ data: { since: at, sources: ['a.pdf', 'b.pdf'], reasons: { stale: 2 } } }),
      translator({ 'notice.rag.waiting': '{since} | {sources} | {reasons}' }, 'it')
    )
    expect(text).toBe(`${formatNoticeValue(at, 'it')} | a.pdf, b.pdf | {reasons}`)
    expect(text).not.toContain('2026-11-21T')
  })
})

describe('formatNoticeValue', () => {
  it('keeps a calendar date on its day in every zone', () => {
    expect(formatNoticeValue('2026-12-31', 'en')).toBe(new Date(Date.UTC(2026, 11, 31)).toLocaleDateString('en', { dateStyle: 'medium', timeZone: 'UTC' }))
  })

  it('leaves a plain string alone', () => {
    expect(formatNoticeValue('bge-m3', 'it')).toBe('bge-m3')
  })
})

describe('sortNotices', () => {
  it('puts the unseen first, then warnings, then the newest', () => {
    const list = [
      notice({ id: 'a', seen: true, level: 'warning', at: '2026-11-21T10:00:00Z' }),
      notice({ id: 'b', level: 'info', at: '2026-11-21T11:00:00Z' }),
      notice({ id: 'c', level: 'warning', at: '2026-11-20T10:00:00Z' }),
      notice({ id: 'd', level: 'warning', at: '2026-11-21T10:00:00Z' })
    ]
    expect(sortNotices(list).map((n) => n.id)).toEqual(['d', 'c', 'b', 'a'])
  })
})

describe('the seen flow', () => {
  it('reads the plane route, and a refused read means no notices to show', async () => {
    const urls: string[] = []
    const ok: NoticeRequest = async ({ url }) => (urls.push(url), { data: { notices: [notice()], failed: [] } })
    expect((await loadNotices(ok, 'control'))?.notices).toHaveLength(1)
    expect(urls).toEqual(['/system/notices'])

    const forbidden: NoticeRequest = async () => ({ data: { statusCode: 403, code: 'FORBIDDEN' } })
    expect(await loadNotices(forbidden, 'tenant')).toBeNull()
    const broken: NoticeRequest = async () => {
      throw new Error('network')
    }
    expect(await loadNotices(broken, 'tenant')).toBeNull()
  })

  it('posts the ids in batches the backend accepts', async () => {
    const posts: { url: string; ids: string[] }[] = []
    const request: NoticeRequest = async ({ url, payload }) => {
      posts.push({ url, ids: (payload as { ids: string[] }).ids })
      return { data: undefined }
    }
    const ids = Array.from({ length: 205 }, (_, i) => `rag:${i}`)
    await markNoticesSeen(request, 'tenant', ids)
    expect(posts.map((p) => p.ids.length)).toEqual([100, 100, 5])
    expect(posts.every((p) => p.url === '/notices/seen')).toBe(true)
  })

  it('throws when the backend refuses the mark', async () => {
    const refused: NoticeRequest = async () => ({ data: { statusCode: 400 } })
    await expect(markNoticesSeen(refused, 'tenant', ['rag:waiting'])).rejects.toThrow()
  })
})
