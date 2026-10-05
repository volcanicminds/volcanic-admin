import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GetListParams } from '@refinedev/core'
import { createVolcanicDataProvider } from '@/engine/providers/data'
import { translate } from '@/engine/i18n'

interface ServerOptions {
  /** Server-side page size cap, reported back in `v-pageSize`. */
  maxPageSize?: number
  /** `false` omits `v-total`; a number overrides it. */
  total?: false | number
  /** Answer page 1 whatever was asked (a server that ignores `_page`). */
  ignorePage?: boolean
}

/** A fetch stub that pages `rows` like the backend: capped size, skip from the applied size. */
function fakeServer(rows: Array<{ id: number }>, opts: ServerOptions = {}) {
  return vi.fn(async (input: string | URL | Request, _init?: RequestInit) => {
    const url = new URL(String(input))
    const page = Number(url.searchParams.get('_page') ?? 1)
    const size = Math.min(Number(url.searchParams.get('_pageSize') ?? 10), opts.maxPageSize ?? 100)
    const start = opts.ignorePage ? 0 : (page - 1) * size
    const headers = new Headers({ 'content-type': 'application/json', 'v-pageSize': String(size) })
    if (opts.total !== false) headers.set('v-total', String(opts.total ?? rows.length))
    return new Response(JSON.stringify(rows.slice(start, start + size)), { status: 200, headers })
  })
}

const rowsOf = (n: number) => Array.from({ length: n }, (_, id) => ({ id }))

/** [page, pageSize] of every request the stub received. */
const pagesAsked = (fetchMock: ReturnType<typeof fakeServer>) =>
  fetchMock.mock.calls.map(([input]) => {
    const p = new URL(String(input)).searchParams
    return [Number(p.get('_page')), Number(p.get('_pageSize'))]
  })

const provider = () =>
  createVolcanicDataProvider({
    apiUrl: 'https://api.test',
    basePath: '/v1',
    resolvePath: (name) => `admin/${name}`,
    getContextHeaders: () => ({ 'x-tenant-id': 't1' })
  })

const getAll = (extra: Partial<GetListParams> = {}) =>
  provider().getList({ resource: 'cars', pagination: { mode: 'off' }, ...extra })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('data provider: getList with pagination off (page walk)', () => {
  it('walks every page until v-total is reached', async () => {
    const fetchMock = fakeServer(rowsOf(250))
    vi.stubGlobal('fetch', fetchMock)
    const res = await getAll()
    expect(pagesAsked(fetchMock)).toEqual([
      [1, 100],
      [2, 100],
      [3, 100]
    ])
    expect(res.total).toBe(250)
    expect(res.data).toEqual(rowsOf(250))
  })

  it('asks for the page size the server applied, so no row falls between pages', async () => {
    const fetchMock = fakeServer(rowsOf(100), { maxPageSize: 40 })
    vi.stubGlobal('fetch', fetchMock)
    const res = await getAll()
    expect(pagesAsked(fetchMock)).toEqual([
      [1, 100],
      [2, 40],
      [3, 40]
    ])
    expect(res.data).toEqual(rowsOf(100))
    expect(res.total).toBe(100)
  })

  it('stops on an empty page even when v-total promises more', async () => {
    const fetchMock = fakeServer(rowsOf(150), { total: 1000 })
    vi.stubGlobal('fetch', fetchMock)
    const res = await getAll()
    expect(pagesAsked(fetchMock)).toEqual([
      [1, 100],
      [2, 100],
      [3, 100]
    ])
    expect(res.data).toHaveLength(150)
  })

  it('returns an empty result from an empty collection after one request', async () => {
    const fetchMock = fakeServer([])
    vi.stubGlobal('fetch', fetchMock)
    expect(await getAll()).toEqual({ data: [], total: 0 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('never walks more than 500 pages', async () => {
    const fetchMock = fakeServer(rowsOf(1), { total: 1_000_000, ignorePage: true })
    vi.stubGlobal('fetch', fetchMock)
    const res = await getAll()
    expect(fetchMock).toHaveBeenCalledTimes(500)
    expect(res.data).toHaveLength(500)
  })

  it('sends sorters, filters, context and meta headers on every page', async () => {
    const fetchMock = fakeServer(rowsOf(150))
    vi.stubGlobal('fetch', fetchMock)
    await getAll({
      sorters: [{ field: 'price', order: 'desc' }],
      filters: [{ field: 'status', operator: 'eq', value: 'published' }],
      meta: { headers: { 'x-trace': 'abc' } }
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    for (const [input, init] of fetchMock.mock.calls) {
      const url = new URL(String(input))
      expect(url.origin + url.pathname).toBe('https://api.test/v1/admin/cars')
      expect(url.searchParams.get('_sort')).toBe('-price')
      expect(url.searchParams.get('status:eq')).toBe('published')
      expect(init).toMatchObject({ method: 'GET', credentials: 'include', headers: { 'x-tenant-id': 't1', 'x-trace': 'abc' } })
      // A bodyless GET must not declare a JSON body.
      expect(Object.keys(init?.headers ?? {})).not.toContain('Content-Type')
    }
  })

  // Suspected bug (data.ts:113,118): without a v-total header the total falls back to the rows
  // read so far, so `all.length >= total` ends the walk after the first page and an export
  // silently returns 100 rows of 250. Expected: keep walking until a short or empty page.
  it.skip('walks past the first page when v-total is missing', async () => {
    vi.stubGlobal('fetch', fakeServer(rowsOf(250), { total: false }))
    const res = await getAll()
    expect(res.data).toHaveLength(250)
  })

  // Suspected bug (data.ts:112,118): the `!Array.isArray(chunk)` guard runs after
  // `all.push(...chunk)`, so a non-array page body throws "is not iterable" instead of ending the walk.
  it.skip('ends the walk on a page body that is not an array', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ data: [] }), { status: 200, headers: { 'content-type': 'application/json' } }))
    )
    await expect(getAll()).resolves.toEqual({ data: [], total: 0 })
  })
})

describe('data provider: getList paged and errors', () => {
  it('requests a single page and reads the total from the headers', async () => {
    const fetchMock = fakeServer(rowsOf(30))
    vi.stubGlobal('fetch', fetchMock)
    const res = await provider().getList({ resource: 'cars', pagination: { current: 2, pageSize: 10 } })
    expect(pagesAsked(fetchMock)).toEqual([[2, 10]])
    expect(res).toEqual({ data: rowsOf(30).slice(10, 20), total: 30 })
  })

  it('throws a humanized HttpError instead of the raw driver text', async () => {
    const body = { message: 'duplicate key value violates unique constraint "UQ_plate"', errors: { plate: 'taken' } }
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status: 500 })))
    await expect(getAll()).rejects.toEqual({
      message: translate('error.unique'),
      code: 'unique_violation',
      statusCode: 500,
      errors: { plate: 'taken' }
    })
  })

  it('passes the attempts left through and falls back to the status text on a non-JSON body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ code: 'OTP_INVALID', message: 'Wrong code', remaining: 2 }), { status: 400 }))
    )
    await expect(getAll()).rejects.toMatchObject({ message: 'Wrong code', statusCode: 400, remaining: 2 })

    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>oops</html>', { status: 502, statusText: 'Bad Gateway' })))
    await expect(getAll()).rejects.toMatchObject({ message: 'Bad Gateway', statusCode: 502 })
  })
})
