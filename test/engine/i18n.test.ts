import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { defaultDictionaries } from '@/engine/i18n'

// Every literal key the engine and the ui translate, read from the sources: the mock app ships
// its own dictionary, so a key missing from the defaults only shows up in a real project, as
// the humanized key ("Page Info"). Resource labels (`res.*`) come from the project's manifest.
function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name)
    if (e.isDirectory()) return sources(path)
    return /\.tsx?$/.test(e.name) ? [path] : []
  })
}

const KEY = /\bt\(\s*['"]([a-zA-Z][\w.-]*)['"]/g
const used = new Set(
  [...sources('src/engine'), ...sources('src/ui'), 'src/VolcanicAdmin.tsx']
    .flatMap((file) => [...readFileSync(file, 'utf8').matchAll(KEY)].map((m) => m[1]))
    .filter((key) => !key.startsWith('res.'))
)

describe('defaultDictionaries', () => {
  it('reads the keys the sources translate', () => {
    expect(used.size).toBeGreaterThan(50)
  })

  for (const locale of ['en', 'it']) {
    it(`translates in '${locale}' every key the engine and the ui use`, () => {
      expect([...used].filter((key) => !(key in defaultDictionaries[locale]))).toEqual([])
    })
  }

  it('gives both locales the same keys', () => {
    const en = Object.keys(defaultDictionaries.en).sort()
    expect(Object.keys(defaultDictionaries.it).sort()).toEqual(en)
  })
})
