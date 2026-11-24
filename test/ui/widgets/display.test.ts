import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ShortId, isEmptyValue, readableJson } from '@/ui/widgets/display'
import type { ResolvedField } from '@/engine'

const t = (key?: string) => key ?? ''

describe('readableJson', () => {
  it('reads a map as its pairs and a list as its items, never as [object Object]', () => {
    expect(readableJson({ department: ['management'], site: ['to', 'mi'] }, '; ')).toBe(
      'department: management; site: to, mi'
    )
    expect(readableJson(['admin', 'staff'], '; ')).toBe('admin, staff')
  })

  it('shows an empty map or list as no value', () => {
    expect(readableJson({}, '; ')).toBe('—')
    expect(readableJson([], '; ')).toBe('—')
  })
})

describe('ShortId', () => {
  const render = (value: unknown) => renderToStaticMarkup(createElement(ShortId, { value, t }))

  it('shows the last 8 characters of a long id, with the whole value on hover and a copy button', () => {
    const html = render('01a20a13-5eeb-7000-91cd-d95e648a9f7d')
    expect(html).toContain('…648a9f7d')
    expect(html).toContain('title="01a20a13-5eeb-7000-91cd-d95e648a9f7d"')
    expect(html).toContain('aria-label="action.copy"')
  })

  it('keeps a short id whole', () => {
    expect(render('INV-2026-42')).toBe('INV-2026-42')
    expect(render(42)).toBe('42')
  })
})

describe('isEmptyValue', () => {
  const field = (name: string, type: ResolvedField['type'], extra: Partial<ResolvedField> = {}): ResolvedField => ({
    name,
    type,
    ...extra
  })

  it('counts a missing value, an empty string, list or map as empty', () => {
    const record = { a: null, b: '', c: [], d: {} }
    for (const name of ['a', 'b', 'c', 'd', 'missing']) expect(isEmptyValue(record, field(name, 'string'))).toBe(true)
  })

  it('keeps a false boolean and a zero as values', () => {
    expect(isEmptyValue({ blocked: false }, field('blocked', 'boolean'))).toBe(false)
    expect(isEmptyValue({ version: 0 }, field('version', 'number'))).toBe(false)
  })

  it('reads a relation through its expanded record or its foreign key', () => {
    const brand = field('brand', 'relation', { relation: { resource: 'brand', foreignKey: 'brandId' } })
    expect(isEmptyValue({ brandId: 'b1' }, brand)).toBe(false)
    expect(isEmptyValue({ brandId: null }, brand)).toBe(true)
  })

  it('counts an image field without images as empty', () => {
    expect(isEmptyValue({ cover: '' }, field('cover', 'image'))).toBe(true)
    expect(isEmptyValue({ cover: '/a.png' }, field('cover', 'image'))).toBe(false)
  })
})
