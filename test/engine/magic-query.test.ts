import { describe, expect, it } from 'vitest'
import type { CrudFilter, CrudFilters } from '@refinedev/core'
import { buildMagicQuery, readTotal, searchFilter } from '@/engine/magic-query'

/** The query string as ordered [key, value] pairs, decoded. */
const pairs = (qs: string) => [...new URLSearchParams(qs).entries()]

const f = (field: string, operator: string, value: unknown) => ({ field, operator, value }) as CrudFilter

describe('buildMagicQuery: pagination and sort', () => {
  it('emits nothing for empty arguments', () => {
    expect(buildMagicQuery({})).toBe('')
  })

  it('emits the underscore-prefixed page and page size', () => {
    expect(buildMagicQuery({ pagination: { current: 2, pageSize: 25 } })).toBe('_page=2&_pageSize=25')
    expect(buildMagicQuery({ pagination: { current: 3, pageSize: 10, mode: 'server' } })).toBe('_page=3&_pageSize=10')
  })

  it('omits absent page values and all paging when pagination is off', () => {
    expect(buildMagicQuery({ pagination: { pageSize: 10 } })).toBe('_pageSize=10')
    expect(buildMagicQuery({ pagination: { current: 0, pageSize: 0 } })).toBe('')
    expect(buildMagicQuery({ pagination: { current: 2, pageSize: 25, mode: 'off' } })).toBe('')
  })

  it('emits one comma-separated _sort with a leading - for descending', () => {
    const qs = buildMagicQuery({
      sorters: [
        { field: 'name', order: 'asc' },
        { field: 'price', order: 'desc' }
      ]
    })
    expect(pairs(qs)).toEqual([['_sort', 'name,-price']])
    expect(buildMagicQuery({ sorters: [] })).toBe('')
  })
})

describe('buildMagicQuery: operators and values', () => {
  it.each([
    ['eq', 'eq'],
    ['ne', 'neq'],
    ['lt', 'lt'],
    ['gt', 'gt'],
    ['lte', 'le'],
    ['gte', 'ge'],
    ['in', 'in'],
    ['nin', 'nin'],
    ['overlap', 'arrayOverlaps'],
    ['arrayContains', 'arrayContains'],
    ['contains', 'containsi'],
    ['containss', 'contains'],
    ['ncontains', 'ncontainsi'],
    ['ncontainss', 'ncontains'],
    ['startswith', 'startsi'],
    ['startswiths', 'starts'],
    ['endswith', 'endsi'],
    ['endswiths', 'ends'],
    ['between', 'between']
  ])('maps the Refine operator %s to %s', (refineOp, mqOp) => {
    expect(pairs(buildMagicQuery({ filters: [f('x', refineOp, 'v')] }))).toEqual([[`x:${mqOp}`, 'v']])
  })

  it('drops operators the map does not know', () => {
    expect(buildMagicQuery({ filters: [f('x', 'raw', 'DROP TABLE'), f('y', 'eq', 1)] })).toBe('y%3Aeq=1')
  })

  it('drops conditions with nothing in them, but keeps 0 and false', () => {
    const filters: CrudFilters = [
      f('a', 'eq', undefined),
      f('b', 'eq', null),
      f('c', 'eq', ''),
      f('d', 'in', []),
      f('e', 'eq', 0),
      f('g', 'eq', false)
    ]
    expect(pairs(buildMagicQuery({ filters }))).toEqual([
      ['e:eq', '0'],
      ['g:eq', 'false']
    ])
  })

  it('serializes lists with commas, a range with .. and a date as ISO', () => {
    const when = new Date('2026-01-02T03:04:05.000Z')
    const qs = buildMagicQuery({
      filters: [f('id', 'in', ['a', 'b']), f('price', 'between', [1, 5]), f('createdAt', 'gte', when)]
    })
    expect(pairs(qs)).toEqual([
      ['id:in', 'a,b'],
      ['price:between', '1..5'],
      ['createdAt:ge', '2026-01-02T03:04:05.000Z']
    ])
  })

  it('serializes a range of dates as ISO timestamps', () => {
    const from = new Date('2026-01-01T00:00:00.000Z')
    const to = new Date('2026-01-31T00:00:00.000Z')
    expect(pairs(buildMagicQuery({ filters: [f('createdAt', 'between', [from, to])] }))).toEqual([
      ['createdAt:between', '2026-01-01T00:00:00.000Z..2026-01-31T00:00:00.000Z']
    ])
  })

  it('turns null and nnull into the single v5 null operator with a boolean value', () => {
    const qs = buildMagicQuery({
      filters: [f('a', 'null', true), f('b', 'null', false), f('c', 'null', undefined), f('d', 'nnull', true)]
    })
    expect(pairs(qs)).toEqual([
      ['a:null', 'true'],
      ['b:null', 'false'],
      ['c:null', 'true'],
      ['d:null', 'false']
    ])
  })

  it('keeps every condition on a repeated field', () => {
    expect(pairs(buildMagicQuery({ filters: [f('price', 'gte', 1), f('price', 'lte', 5)] }))).toEqual([
      ['price:ge', '1'],
      ['price:le', '5']
    ])
  })
})

describe('buildMagicQuery: logic', () => {
  it('sends a pure AND tree flat, without aliases or _logic', () => {
    const filters: CrudFilters = [f('a', 'eq', 1), { operator: 'and', value: [f('b', 'eq', 2), f('c', 'eq', 3)] }]
    expect(pairs(buildMagicQuery({ filters }))).toEqual([
      ['a:eq', '1'],
      ['b:eq', '2'],
      ['c:eq', '3']
    ])
  })

  it('aliases every condition and sends the expression when an OR is present', () => {
    const filters: CrudFilters = [
      { operator: 'or', value: [f('name', 'contains', 'x'), f('email', 'contains', 'x')] },
      f('active', 'eq', true),
      f('deletedAt', 'null', true)
    ]
    expect(pairs(buildMagicQuery({ filters, pagination: { current: 1, pageSize: 10 } }))).toEqual([
      ['_page', '1'],
      ['_pageSize', '10'],
      ['name:containsi[c0]', 'x'],
      ['email:containsi[c1]', 'x'],
      ['active:eq[c2]', 'true'],
      ['deletedAt:null[c3]', 'true'],
      ['_logic', '(c0 OR c1) AND c2 AND c3']
    ])
  })

  it('nests groups in the expression', () => {
    const filters: CrudFilters = [
      {
        operator: 'or',
        value: [f('a', 'eq', 1), { operator: 'and', value: [f('b', 'eq', 2), f('c', 'eq', 3)] }]
      }
    ]
    expect(new URLSearchParams(buildMagicQuery({ filters })).get('_logic')).toBe('(c0 OR (c1 AND c2))')
  })

  it('skips a group whose conditions were all dropped, and an OR left with one condition', () => {
    const emptyOr: CrudFilters = [{ operator: 'or', value: [f('a', 'eq', ''), f('b', 'in', [])] }, f('c', 'eq', 1)]
    expect(pairs(buildMagicQuery({ filters: emptyOr }))).toEqual([['c:eq', '1']])

    const loneOr: CrudFilters = [{ operator: 'or', value: [f('a', 'eq', 1), f('b', 'eq', '')] }]
    expect(pairs(buildMagicQuery({ filters: loneOr }))).toEqual([['a:eq', '1']])
  })
})

describe('searchFilter', () => {
  it('returns no filter for blank text or no searchable fields', () => {
    expect(searchFilter('', ['name'])).toEqual([])
    expect(searchFilter('   ', ['name'])).toEqual([])
    expect(searchFilter('abc', [])).toEqual([])
  })

  it('ORs the trimmed term over the fields with a case-insensitive contains by default', () => {
    expect(searchFilter('  ab c ', ['name', 'email'])).toEqual([
      {
        operator: 'or',
        value: [
          { field: 'name', operator: 'contains', value: 'ab c' },
          { field: 'email', operator: 'contains', value: 'ab c' }
        ]
      }
    ])
  })

  it.each([
    ['contains', 'containss'],
    ['containsi', 'contains'],
    ['ncontains', 'ncontainss'],
    ['ncontainsi', 'ncontains'],
    ['starts', 'startswiths'],
    ['startsi', 'startswith'],
    ['ends', 'endswiths'],
    ['endsi', 'endswith'],
    ['eq', 'eq'],
    ['between', 'contains'],
    [undefined, 'contains']
  ])('translates the manifest operator %s to the Refine operator %s', (manifestOp, refineOp) => {
    const [group] = searchFilter('x', ['name'], manifestOp) as Array<{ value: Array<{ operator: string }> }>
    expect(group.value[0].operator).toBe(refineOp)
  })

  it('round-trips through buildMagicQuery to the backend operator the manifest named', () => {
    const qs = buildMagicQuery({ filters: searchFilter('Rossi', ['name', 'city'], 'startsi') })
    expect(pairs(qs)).toEqual([
      ['name:startsi[c0]', 'Rossi'],
      ['city:startsi[c1]', 'Rossi'],
      ['_logic', '(c0 OR c1)']
    ])
    // A single searchable field is just a condition: no OR, no _logic.
    expect(pairs(buildMagicQuery({ filters: searchFilter('Rossi', ['name'], 'contains') }))).toEqual([['name:contains', 'Rossi']])
  })
})

describe('readTotal', () => {
  it('reads v-total, then v-count, then the fallback', () => {
    expect(readTotal(new Headers({ 'v-total': '42', 'v-count': '7' }), 1)).toBe(42)
    expect(readTotal(new Headers({ 'v-count': '7' }), 1)).toBe(7)
    expect(readTotal(new Headers(), 3)).toBe(3)
  })

  it('keeps a real zero and falls back on a non-numeric total', () => {
    expect(readTotal(new Headers({ 'v-total': '0' }), 5)).toBe(0)
    expect(readTotal(new Headers({ 'v-total': 'abc' }), 5)).toBe(5)
  })
})
