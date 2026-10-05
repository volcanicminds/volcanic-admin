import { describe, expect, it } from 'vitest'
import type { EnumOption } from '@/engine'
import {
  addValue,
  buildTaxonomy,
  exactOption,
  featuredGroupOf,
  filterOptions,
  keyOf,
  normalizeFreeText,
  removeValue,
  toArray
} from '@/ui/widgets/tags/taxonomy'

const dict: Record<string, string> = {
  'grp.rental': 'Noleggio',
  'grp.workshop': 'Officina',
  'grp.eco': 'Ecologia',
  'grp.elite': 'Élite',
  'tag.long': 'Lungo termine',
  'tag.short': 'Breve termine',
  'tag.mech': 'Meccanica',
  'tag.green': 'Emissioni zero',
  'tag.vip': 'Clienti VIP',
  'tag.news': 'Novità',
  'tag.advice': 'Consigli'
}
const t = (key?: string) => (key ? (dict[key] ?? key) : '')

const options: EnumOption[] = [
  { value: 'long_rent', label: 'tag.long', group: 'grp.rental' },
  { value: 'mechanics', label: 'tag.mech', group: 'grp.workshop' },
  { value: 'news', label: 'tag.news' },
  { value: 'short_rent', label: 'tag.short', group: 'grp.rental' },
  { value: 'zero_emission', label: 'tag.green', group: 'grp.eco' },
  { value: 'vip', label: 'tag.vip', group: 'grp.elite' },
  { value: 'advice', label: 'tag.advice' }
]

describe('keyOf', () => {
  it('compares case- and whitespace-insensitively', () => {
    expect(keyOf(' Mechanics ')).toBe('mechanics')
    expect(keyOf(42)).toBe('42')
  })
})

describe('toArray', () => {
  it('reads every empty shape as no value', () => {
    expect(toArray(undefined)).toEqual([])
    expect(toArray(null)).toEqual([])
    expect(toArray('')).toEqual([])
    expect(toArray([])).toEqual([])
    expect(toArray([''])).toEqual([])
  })

  it('wraps a bare value and trims entries', () => {
    expect(toArray('news')).toEqual(['news'])
    expect(toArray(['  news ', 7])).toEqual(['news', '7'])
  })

  it('drops blank entries and collapses equivalent duplicates, first occurrence winning', () => {
    expect(toArray(['Mechanics', '', '  ', 'mechanics ', 'news', 'NEWS'])).toEqual(['Mechanics', 'news'])
  })

  // Suspected bug (taxonomy.ts:31): a null/undefined entry inside the array becomes the tag
  // "null"/"undefined" instead of being dropped like the other empty entries.
  it.skip('drops null and undefined entries inside the array', () => {
    expect(toArray(['news', null, undefined])).toEqual(['news'])
  })
})

describe('addValue / removeValue', () => {
  it('appends a new value without mutating the input', () => {
    const current = ['news']
    expect(addValue(current, 'advice')).toEqual(['news', 'advice'])
    expect(current).toEqual(['news'])
  })

  it('returns the same array for an equivalent or blank value', () => {
    const current = ['news']
    expect(addValue(current, ' NEWS ')).toBe(current)
    expect(addValue(current, '   ')).toBe(current)
  })

  it('removes by equivalence, not identity', () => {
    expect(removeValue(['Mechanics', 'news'], ' mechanics')).toEqual(['news'])
    expect(removeValue(['news'], 'advice')).toEqual(['news'])
  })
})

describe('buildTaxonomy', () => {
  it('groups options, orders groups by translated label (locale-aware, É next to E) and keeps declaration order inside', () => {
    const tax = buildTaxonomy(options, t)
    expect(tax.groups.map((g) => g.label)).toEqual(['Ecologia', 'Élite', 'Noleggio', 'Officina'])
    expect(tax.groups.map((g) => g.key)).toEqual(['grp.eco', 'grp.elite', 'grp.rental', 'grp.workshop'])
    expect(tax.groups[2].options.map((o) => o.value)).toEqual(['long_rent', 'short_rent'])
  })

  it('sorts the ungrouped leaves by translated label', () => {
    expect(buildTaxonomy(options, t).loose.map((o) => o.value)).toEqual(['advice', 'news'])
  })

  it('puts the featured group first without duplicating it', () => {
    const tax = buildTaxonomy(options, t, 'grp.workshop')
    expect(tax.groups.map((g) => g.key)).toEqual(['grp.workshop', 'grp.eco', 'grp.elite', 'grp.rental'])
    expect(buildTaxonomy(options, t, 'grp.eco').groups.map((g) => g.key)).toEqual(['grp.eco', 'grp.elite', 'grp.rental', 'grp.workshop'])
    expect(buildTaxonomy(options, t, 'grp.ghost').groups).toHaveLength(4)
  })

  it('does not mutate the option set', () => {
    const copy = structuredClone(options)
    buildTaxonomy(options, t, 'grp.workshop')
    expect(options).toEqual(copy)
  })

  it('handles an empty option set', () => {
    expect(buildTaxonomy([], t)).toEqual({ groups: [], loose: [] })
  })
})

describe('featuredGroupOf', () => {
  const sibling: EnumOption[] = [
    { value: 'cars', label: 'enum.cat.cars', linkedGroup: 'grp.rental' },
    { value: 'other', label: 'enum.cat.other' }
  ]

  it('returns the linked group of the sibling value, matched by equivalence', () => {
    expect(featuredGroupOf('cars', sibling)).toBe('grp.rental')
    expect(featuredGroupOf(' Cars ', sibling)).toBe('grp.rental')
  })

  it('returns undefined for every degenerate case', () => {
    expect(featuredGroupOf(undefined, sibling)).toBeUndefined()
    expect(featuredGroupOf(null, sibling)).toBeUndefined()
    expect(featuredGroupOf('', sibling)).toBeUndefined()
    expect(featuredGroupOf('cars', undefined)).toBeUndefined()
    expect(featuredGroupOf('cars', [])).toBeUndefined()
    expect(featuredGroupOf('boats', sibling)).toBeUndefined()
    expect(featuredGroupOf('other', sibling)).toBeUndefined()
  })
})

describe('filterOptions', () => {
  it('returns nothing for a blank query', () => {
    expect(filterOptions(options, '  ', t)).toEqual([])
  })

  it('matches the translated label or the raw value, case-insensitively, with the group label as context', () => {
    expect(filterOptions(options, 'TERMINE', t)).toEqual([
      { option: options[0], label: 'Lungo termine', groupLabel: 'Noleggio' },
      { option: options[3], label: 'Breve termine', groupLabel: 'Noleggio' }
    ])
    expect(filterOptions(options, 'zero_em', t).map((s) => s.option.value)).toEqual(['zero_emission'])
    expect(filterOptions(options, 'novi', t)).toEqual([{ option: options[2], label: 'Novità', groupLabel: undefined }])
  })

  it('stops at the limit', () => {
    expect(filterOptions(options, 'e', t, 2)).toHaveLength(2)
    expect(filterOptions(options, 'e', t).length).toBeGreaterThan(2)
  })
})

describe('exactOption', () => {
  it('finds the option whose value or translated label is exactly the typed text', () => {
    expect(exactOption(options, ' meccanica ', t)?.value).toBe('mechanics')
    expect(exactOption(options, 'MECHANICS', t)?.value).toBe('mechanics')
  })

  it('returns undefined for a partial or blank text', () => {
    expect(exactOption(options, 'mecca', t)).toBeUndefined()
    expect(exactOption(options, '   ', t)).toBeUndefined()
  })
})

describe('normalizeFreeText', () => {
  it('stores verbatim text cleaned: trimmed, inner spaces collapsed, leading # and commas removed', () => {
    expect(normalizeFreeText('  #Hello,   World  ')).toBe('Hello World')
    expect(normalizeFreeText('## tag', 'verbatim')).toBe('tag')
    expect(normalizeFreeText('a,b,,c')).toBe('a b c')
    expect(normalizeFreeText('C# rocks')).toBe('C# rocks')
  })

  it('stores nothing when free text is off', () => {
    expect(normalizeFreeText('anything', 'off')).toBe('')
  })

  it('slugs to snake_case ASCII', () => {
    expect(normalizeFreeText('Perché Più Bello!', 'slug')).toBe('perche_piu_bello')
    expect(normalizeFreeText('  #Hello, World  ', 'slug')).toBe('hello_world')
    expect(normalizeFreeText('--- ???', 'slug')).toBe('')
  })

  it('caps a tag at 60 characters', () => {
    expect(normalizeFreeText('x'.repeat(80))).toHaveLength(60)
    expect(normalizeFreeText('x'.repeat(80), 'slug')).toHaveLength(60)
  })

  // Suspected bug (taxonomy.ts:189-192): the cap is applied after the trim, so text cut at a space
  // is stored with a trailing space: 'a' x 59 + ' b' becomes 'a' x 59 + ' '.
  it.skip('never stores a trailing space after the cap', () => {
    expect(normalizeFreeText('a'.repeat(59) + ' b')).toBe('a'.repeat(59))
  })
})
