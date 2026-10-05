import { describe, expect, it } from 'vitest'
import { deepMerge, mergeManifest } from '@/engine/merge'
import type { ResourceOverride } from '@/engine/merge'
import type { FieldSpec, Manifest, ResourceSpec } from '@/engine'
import { cap, manifest, resource } from '../helpers/manifest'

describe('deepMerge', () => {
  it('returns the target itself when there is no source', () => {
    const target = { a: 1 }
    expect(deepMerge(target, undefined)).toBe(target)
  })

  it('merges nested plain objects and lets the source win on scalars', () => {
    const out = deepMerge<Record<string, unknown>>({ a: 1, n: { x: 1, y: 2 }, keep: 'k' }, { a: 2, n: { y: 3, z: 4 } })
    expect(out).toEqual({ a: 2, n: { x: 1, y: 3, z: 4 }, keep: 'k' })
  })

  it('replaces arrays wholesale instead of merging them', () => {
    expect(deepMerge<Record<string, unknown>>({ list: [1, 2, 3] }, { list: [9] })).toEqual({ list: [9] })
  })

  it('replaces a plain object with a non-object and vice versa', () => {
    expect(deepMerge<Record<string, unknown>>({ a: { x: 1 } }, { a: 'flat' })).toEqual({ a: 'flat' })
    expect(deepMerge<Record<string, unknown>>({ a: 'flat' }, { a: { x: 1 } })).toEqual({ a: { x: 1 } })
    expect(deepMerge<Record<string, unknown>>({ a: { x: 1 } }, { a: null })).toEqual({ a: null })
  })

  it('returns the source when either side is not a plain object', () => {
    expect(deepMerge<unknown>([1, 2], [3])).toEqual([3])
    expect(deepMerge<unknown>('a', 'b')).toBe('b')
    expect(deepMerge<object>({ a: 1 }, [1])).toEqual([1])
  })

  it('replaces a scalar target with a falsy scalar source', () => {
    expect(deepMerge<number>(1, 0)).toBe(0)
    expect(deepMerge<boolean>(true, false)).toBe(false)
    expect(deepMerge<string>('a', '')).toBe('')
  })

  it('keeps the target value where the source key is undefined', () => {
    const out = deepMerge<Record<string, unknown>>({ a: 1, n: { x: 1 } }, { a: undefined, n: { x: undefined } })
    expect(out).toEqual({ a: 1, n: { x: 1 } })
    expect(deepMerge<Record<string, unknown>>({ a: 1, b: true }, { a: 0, b: false })).toEqual({ a: 0, b: false })
  })

  it('never mutates the target', () => {
    const target = { n: { x: 1 }, list: [1] }
    const snapshot = structuredClone(target)
    const out = deepMerge<Record<string, unknown>>(target, { n: { x: 2 }, list: [2] })
    expect(target).toEqual(snapshot)
    expect(out).not.toBe(target)
  })
})

const generated = (): Manifest =>
  manifest({
    i18n: { defaultLocale: 'it', locales: ['it', 'en'] },
    tenancy: { mode: 'multi', header: 'x-tenant-id' },
    groups: [
      { name: 'catalog', label: 'group.catalog', icon: 'layers', order: 10 },
      { name: 'crm', label: 'group.crm', order: 20 }
    ],
    enums: { status: [{ value: 'a', label: 'enum.status.a' }], kind: [{ value: 'k', label: 'enum.kind.k' }] },
    resources: [
      resource({
        name: 'cars',
        group: 'catalog',
        fields: [
          { name: 'name', type: 'string', validation: { maxLength: 50, required: true } },
          { name: 'price', type: 'number' },
          { name: 'internal', type: 'string' },
          { name: 'brand', type: 'relation', relation: { resource: 'brands', foreignKey: 'brandId' } }
        ],
        capabilities: [cap('list', { roles: ['viewer'] }), cap('delete', { roles: ['admin'] }), cap('action', { name: 'publish' })],
        list: { layouts: ['table'], table: { columns: [{ field: 'name' }, { field: 'price' }] }, sort: ['name'] }
      }),
      resource({ name: 'brands', group: 'catalog', fields: [{ name: 'name', type: 'string' }] }),
      resource({ name: 'users', group: 'crm' })
    ]
  })

describe('mergeManifest: top level', () => {
  it('returns the generated manifest as is without overrides', () => {
    const g = generated()
    expect(mergeManifest(g)).toBe(g)
    expect(mergeManifest(g, undefined)).toBe(g)
  })

  it('patches i18n and tenancy shallowly, auth deeply, and enums per key', () => {
    const g = generated()
    const m = mergeManifest(g, {
      i18n: { defaultLocale: 'en' },
      tenancy: { switchable: false },
      auth: { mode: 'cookie', endpoints: { logout: '/bye' } as Manifest['auth']['endpoints'] },
      enums: { status: [{ value: 'z', label: 'enum.status.z' }], extra: [] }
    })
    expect(m.i18n).toEqual({ defaultLocale: 'en', locales: ['it', 'en'] })
    expect(m.tenancy).toEqual({ mode: 'multi', header: 'x-tenant-id', switchable: false })
    expect(m.auth.mode).toBe('cookie')
    expect(m.auth.endpoints).toEqual({ ...g.auth.endpoints, logout: '/bye' })
    expect(m.enums).toEqual({ status: [{ value: 'z', label: 'enum.status.z' }], kind: g.enums.kind, extra: [] })
  })

  it('merges groups by name and appends new ones', () => {
    const m = mergeManifest(generated(), {
      groups: [
        { name: 'crm', label: 'group.people', icon: 'users' },
        { name: 'settings', label: 'group.settings', order: 90 }
      ]
    })
    expect(m.groups).toEqual([
      { name: 'catalog', label: 'group.catalog', icon: 'layers', order: 10 },
      { name: 'crm', label: 'group.people', icon: 'users', order: 20 },
      { name: 'settings', label: 'group.settings', order: 90 }
    ])
  })

  it('excludes, patches and adds resources by name', () => {
    const m = mergeManifest(generated(), {
      excludeResources: ['users'],
      resources: { brands: { icon: 'tag', order: 3 } },
      addResources: [resource({ name: 'extra' })]
    })
    expect(m.resources.map((r) => r.name)).toEqual(['cars', 'brands', 'extra'])
    expect(m.resources[1]).toMatchObject({ name: 'brands', icon: 'tag', order: 3 })
  })

  it('ignores overrides for resources the manifest does not have', () => {
    const m = mergeManifest(generated(), { resources: { ghost: { icon: 'x' } } })
    expect(m.resources.map((r) => r.name)).toEqual(['cars', 'brands', 'users'])
  })

  it('never mutates the generated manifest', () => {
    const g = generated()
    const snapshot = structuredClone(g)
    mergeManifest(g, {
      i18n: { defaultLocale: 'en' },
      groups: [{ name: 'crm', label: 'x' }],
      cardDefaults: { cardColumns: 3 },
      resources: {
        cars: {
          label: { singular: 's', plural: 'p' },
          fields: { name: { validation: { maxLength: 10 } } },
          excludeFields: ['internal'],
          addFields: [{ name: 'added', type: 'string' }],
          capabilities: { list: { roles: ['all'] }, extra: { kind: 'action' } },
          excludeCapabilities: ['delete'],
          list: { layouts: ['card'], card: { title: 'name' } },
          form: { columns: 3 }
        }
      }
    })
    expect(g).toEqual(snapshot)
  })
})

describe('mergeManifest: resource override', () => {
  const cars = (ov: ResourceOverride) =>
    mergeManifest(generated(), { resources: { cars: ov } }).resources.find((r) => r.name === 'cars')!

  it('deep-merges plain resource props and replaces array props', () => {
    // A partial label is not expressible in the override type, but the merge is deep.
    const r = cars({ label: { singular: 'res.car' } as ResourceSpec['label'], titleField: ['name', 'price'], search: { fields: ['name'] } })
    expect(r.label).toEqual({ singular: 'res.car', plural: 'res.cars.plural' })
    expect(r.titleField).toEqual(['name', 'price'])
    expect(r.search).toEqual({ fields: ['name'] })
  })

  it('patches fields by name with a deep merge, keeping the order', () => {
    const r = cars({ fields: { name: { type: 'text', validation: { maxLength: 200 } }, brand: { relation: { titleField: 'title' } } } })
    expect(r.fields.map((f) => f.name)).toEqual(['name', 'price', 'internal', 'brand'])
    expect(r.fields[0]).toEqual({ name: 'name', type: 'text', validation: { maxLength: 200, required: true } })
    expect(r.fields[3].relation).toEqual({ resource: 'brands', foreignKey: 'brandId', titleField: 'title' })
  })

  it('removes excluded fields and appends added ones', () => {
    const added: FieldSpec = { name: 'added', type: 'boolean' }
    const r = cars({ excludeFields: ['internal', 'price'], addFields: [added] })
    expect(r.fields.map((f) => f.name)).toEqual(['name', 'brand', 'added'])
  })

  it('does not resurrect an excluded field that is also patched', () => {
    const r = cars({ excludeFields: ['internal'], fields: { internal: { label: 'x' } } })
    expect(r.fields.map((f) => f.name)).not.toContain('internal')
  })

  it('patches capabilities by name, removes excluded ones and adds unknown names', () => {
    const r = cars({
      capabilities: { list: { roles: ['viewer', 'editor'] }, export: { kind: 'action', method: 'GET', path: '/cars/export', roles: [] } },
      excludeCapabilities: ['publish']
    })
    expect(r.capabilities.map((c) => c.name)).toEqual(['list', 'delete', 'export'])
    expect(r.capabilities[0]).toMatchObject({ kind: 'list', roles: ['viewer', 'editor'] })
    expect(r.capabilities[2]).toEqual({ name: 'export', kind: 'action', method: 'GET', path: '/cars/export', roles: [] })
  })

  it('does not resurrect an excluded capability that is also patched', () => {
    const r = cars({ excludeCapabilities: ['delete'], capabilities: { delete: { roles: ['root'] } } })
    expect(r.capabilities.map((c) => c.name)).toEqual(['list', 'publish'])
  })

  it('deep-merges the list and form blocks, replacing their arrays', () => {
    const r = cars({
      list: { layouts: ['card', 'table'], table: { columns: [{ field: 'price' }] }, card: { title: 'name' } },
      form: { columns: 3, groups: [{ name: 'g', fields: [{ field: 'name' }] }] }
    })
    expect(r.list).toEqual({
      layouts: ['card', 'table'],
      table: { columns: [{ field: 'price' }] },
      card: { title: 'name' },
      sort: ['name']
    })
    expect(r.form).toEqual({ columns: 3, groups: [{ name: 'g', fields: [{ field: 'name' }] }] })
  })
})

describe('mergeManifest: card defaults', () => {
  const base = () =>
    manifest({
      resources: [
        resource({ name: 'tableOnly', list: { layouts: ['table'] } }),
        resource({ name: 'cardLayout', list: { layouts: ['table', 'card'] } }),
        resource({ name: 'cardBlock', list: { card: { title: 'name' } } }),
        resource({ name: 'ownSizing', list: { layouts: ['card'], card: { minWidth: 100 } } }),
        resource({ name: 'noList' })
      ]
    })

  it('fills card sizing only on card resources that define none of their own', () => {
    const m = mergeManifest(base(), { cardDefaults: { cardColumns: 3, cardMinWidth: 200, cardMaxWidth: 400 } })
    const card = (name: string) => m.resources.find((r) => r.name === name)!.list?.card
    expect(card('tableOnly')).toBeUndefined()
    expect(card('noList')).toBeUndefined()
    expect(card('cardLayout')).toEqual({ columns: 3, minWidth: 200, maxWidth: 400 })
    expect(card('cardBlock')).toEqual({ title: 'name', columns: 3, minWidth: 200, maxWidth: 400 })
    expect(card('ownSizing')).toEqual({ minWidth: 100 })
  })

  it('sets only the defaults that are given', () => {
    const m = mergeManifest(base(), { cardDefaults: { cardColumns: 2 } })
    expect(m.resources.find((r) => r.name === 'cardLayout')!.list?.card).toEqual({ columns: 2 })
  })

  it('applies to resources added by the overrides too', () => {
    const m = mergeManifest(manifest(), {
      addResources: [resource({ name: 'added', list: { layouts: ['card'] } })],
      cardDefaults: { cardMaxWidth: 300 }
    })
    expect(m.resources[0].list?.card).toEqual({ maxWidth: 300 })
  })
})
