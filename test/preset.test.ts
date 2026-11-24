import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import preset from '../tailwind-preset.js'

type Base = Record<string, Record<string, unknown>>

/** What the preset's own plugins add to the base layer, with a stub for Tailwind's plugin API. */
function baseRules(): Base {
  const rules: Base = {}
  const api = {
    addBase: (r: Base) => Object.assign(rules, r),
    theme: (path: string) => (path === 'screens.md' ? '768px' : undefined)
  }
  // Only the preset's local plugin is a bare function; the packaged ones are { handler } objects.
  for (const plugin of preset.plugins ?? []) if (typeof plugin === 'function') plugin(api as never)
  return rules
}

describe('tailwind preset', () => {
  it('emits the theme tokens of both themes, so any sheet applying it carries them', () => {
    const rules = baseRules()
    expect(rules[':root']['--primary']).toBe('22 92% 36%')
    expect(rules['.dark']['--primary']).toBe('24 95% 53%')
    expect(rules[':root']['--page-padding']).toBe('1rem')
    expect(rules['@media (min-width: 768px)']).toEqual({ ':root': { '--page-padding': '1.5rem' } })
  })

  it('is the only place the tokens are written: the admin sheet declares none of its own', () => {
    const css = readFileSync(new URL('../src/globals.css', import.meta.url), 'utf8')
    expect(css).not.toMatch(/--[a-z-]+\s*:/)
  })
})
