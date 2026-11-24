import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ShortId, readableJson } from '@/ui/widgets/display'

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
