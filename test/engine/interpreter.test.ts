import { afterEach, describe, expect, it, vi } from 'vitest'
import { interpretManifest, toRefineResources } from '@/engine/interpreter'
import type { FieldSpec, Manifest, ResourceSpec } from '@/engine'
import { cap, manifest, resource } from '../helpers/manifest'

const modelOf = (spec: ResourceSpec, extra: Partial<Manifest> = {}) =>
  interpretManifest(manifest({ resources: [spec], ...extra })).resource(spec.name)!

const names = (fields: Array<{ name: string }>) => fields.map((f) => f.name)

afterEach(() => {
  vi.restoreAllMocks()
})

describe('interpretManifest: version guard', () => {
  it('warns on a manifest that is not v2 and still interprets it', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const m = { ...manifest({ resources: [resource({ name: 'a' })] }), version: 1 } as unknown as Manifest
    const model = interpretManifest(m)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0][0]).toContain('version=1')
    expect(model.resource('a')).toBeDefined()
  })

  it('does not warn on a v2 manifest', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    interpretManifest(manifest())
    expect(warn).not.toHaveBeenCalled()
  })
})

describe('interpretManifest: lookups', () => {
  it('finds resources and shared enums by name, undefined when absent', () => {
    const opts = [{ value: 'a', label: 'enum.e.a' }]
    const model = interpretManifest(manifest({ resources: [resource({ name: 'cars' })], enums: { e: opts } }))
    expect(model.resource('cars')?.spec.name).toBe('cars')
    expect(model.resource('nope')).toBeUndefined()
    expect(model.enum('e')).toBe(opts)
    expect(model.enum('nope')).toBeUndefined()
    expect(model.resources).toHaveLength(1)
  })
})

describe('interpretManifest: field resolution', () => {
  const shared = [{ value: 's', label: 'enum.shared.s' }]
  const inline = [{ value: 'i', label: 'enum.inline.i' }]

  it('resolves enum options: inline wins over enumRef, enumRef reads the shared enums', () => {
    const r = modelOf(
      resource({
        name: 'r',
        fields: [
          { name: 'both', type: 'enum', enum: inline, enumRef: 'shared' },
          { name: 'ref', type: 'enum', enumRef: 'shared' },
          { name: 'missingRef', type: 'enum', enumRef: 'ghost' },
          { name: 'notEnum', type: 'string', enum: inline }
        ]
      }),
      { enums: { shared } }
    )
    expect(r.field('both')?.options).toBe(inline)
    expect(r.field('ref')?.options).toBe(shared)
    expect(r.field('missingRef')?.options).toBeUndefined()
    expect(r.field('notEnum')?.options).toBeUndefined()
  })

  it('makes a relation editable and required through its foreign key', () => {
    const r = modelOf(
      resource({
        name: 'cars',
        fields: [
          { name: 'brand', type: 'relation', readOnly: true, relation: { resource: 'brands', foreignKey: 'brandId' } },
          { name: 'brandId', type: 'uuid', required: true }
        ]
      })
    )
    expect(r.field('brand')).toMatchObject({ readOnly: false, required: true })
  })

  it('keeps a read-only foreign key read-only on the relation', () => {
    const r = modelOf(
      resource({
        name: 'cars',
        fields: [
          { name: 'brand', type: 'relation', relation: { resource: 'brands', foreignKey: 'brandId' } },
          { name: 'brandId', type: 'uuid', readOnly: true }
        ]
      })
    )
    expect(r.field('brand')?.readOnly).toBe(true)
  })

  it('leaves a relation untouched when its foreign key is not a field', () => {
    const brand: FieldSpec = { name: 'brand', type: 'relation', readOnly: true, relation: { resource: 'brands', foreignKey: 'brandId' } }
    const r = modelOf(resource({ name: 'cars', fields: [brand] }))
    expect(r.field('brand')?.readOnly).toBe(true)
  })

  it('makes an upload field with its own upload endpoint writable, and only then', () => {
    const upload = { method: 'POST' as const, path: '/cars/:id/photo' }
    const r = modelOf(
      resource({
        name: 'cars',
        fields: [
          { name: 'photo', type: 'image', readOnly: true, image: { endpoints: { upload } } },
          { name: 'doc', type: 'file', readOnly: true, image: { endpoints: { upload } } },
          { name: 'plain', type: 'image', readOnly: true }
        ]
      })
    )
    expect(r.field('photo')?.readOnly).toBe(false)
    expect(r.field('doc')?.readOnly).toBe(false)
    expect(r.field('plain')?.readOnly).toBe(true)
  })
})

describe('interpretManifest: table columns', () => {
  const fields: FieldSpec[] = [
    { name: 'name', type: 'string' },
    { name: 'body', type: 'richtext' },
    { name: 'notes', type: 'text' },
    { name: 'meta', type: 'json' },
    { name: 'photo', type: 'image' },
    { name: 'attachment', type: 'file' },
    { name: 'password', type: 'string', writeOnly: true },
    { name: 'status', type: 'enum', enum: [{ value: 'a', label: 'a' }] },
    { name: 'price', type: 'number' }
  ]

  it('derives non-heavy, readable fields in declaration order when no block is given', () => {
    const r = modelOf(resource({ name: 'r', fields }))
    expect(r.columns.map((c) => c.field.name)).toEqual(['name', 'status', 'price'])
    expect(r.columns[0]).toEqual({ field: r.field('name') })
  })

  it('uses the explicit block as order and allowlist, skipping unknown fields', () => {
    const r = modelOf(
      resource({
        name: 'r',
        fields,
        list: {
          table: {
            columns: [
              { field: 'price', label: 'col.price', align: 'right', width: 120 },
              { field: 'ghost' },
              { field: 'notes' }
            ]
          }
        }
      })
    )
    expect(r.columns.map((c) => c.field.name)).toEqual(['price', 'notes'])
    expect(r.columns[0]).toMatchObject({ label: 'col.price', align: 'right', width: 120 })
  })
})

describe('interpretManifest: card', () => {
  const fields: FieldSpec[] = [
    { name: 'title', type: 'string' },
    { name: 'cover', type: 'image' },
    { name: 'gallery', type: 'image' },
    { name: 'status', type: 'enum', enum: [{ value: 'a', label: 'a' }] },
    { name: 'kind', type: 'enum', enum: [{ value: 'k', label: 'k' }] },
    { name: 'price', type: 'number' }
  ]

  it('falls back to the first image field, the enum columns as badges and the titleField', () => {
    const r = modelOf(resource({ name: 'r', fields, titleField: 'title', subtitleField: 'price' }))
    expect(r.card.image?.name).toBe('cover')
    expect(names(r.card.badges)).toEqual(['status', 'kind'])
    expect(r.card.title).toBe('title')
    expect(r.card.subtitle).toBe('price')
    expect(r.card.body).toEqual([])
  })

  it("defaults the title to 'name' when neither the card nor the resource sets one", () => {
    const r = modelOf(resource({ name: 'r', fields }))
    expect(r.card.title).toBe('name')
    expect(r.card.subtitle).toBeUndefined()
  })

  it('honors the explicit card block and skips unknown field refs', () => {
    const r = modelOf(
      resource({
        name: 'r',
        fields,
        titleField: 'price',
        list: {
          card: {
            image: 'gallery',
            title: ['title', 'price'],
            subtitle: 'kind',
            badges: ['kind', 'ghost'],
            body: [{ field: 'price', label: 'card.price' }, { field: 'ghost' }],
            minWidth: 200,
            maxWidth: 400,
            columns: 3,
            align: 'center',
            highlight: 'featured'
          }
        }
      })
    )
    expect(r.card.image?.name).toBe('gallery')
    expect(r.card.title).toEqual(['title', 'price'])
    expect(r.card.subtitle).toBe('kind')
    expect(names(r.card.badges)).toEqual(['kind'])
    expect(r.card.body).toEqual([{ field: r.field('price'), label: 'card.price' }])
    expect(r.card).toMatchObject({ minWidth: 200, maxWidth: 400, columns: 3, align: 'center', highlight: 'featured' })
  })

  it('has no image when the resource has no image field', () => {
    const r = modelOf(resource({ name: 'r', fields: [{ name: 'title', type: 'string' }] }))
    expect(r.card.image).toBeUndefined()
  })

  it('has no image when the explicit card image is not a field', () => {
    const r = modelOf(resource({ name: 'r', fields, list: { card: { image: 'ghost' } } }))
    expect(r.card.image).toBeUndefined()
  })
})

describe('interpretManifest: form sections', () => {
  const tagGroup = [{ value: 'cars', label: 'enum.cat.cars', linkedGroup: 'enum.tagGroup.cars' }]
  const fields: FieldSpec[] = [
    { name: 'name', type: 'string', label: 'field.name' },
    { name: 'category', type: 'enum', enum: tagGroup },
    { name: 'tags', type: 'enum', multiple: true, enum: [] },
    { name: 'password', type: 'string', writeOnly: true }
  ]

  it('puts every field in one default section when no groups are declared', () => {
    const r = modelOf(resource({ name: 'r', fields }))
    expect(r.formSections).toHaveLength(1)
    expect(r.formSections[0].group).toBe('default')
    expect(names(r.formSections[0].fields)).toEqual(['name', 'category', 'tags', 'password'])
  })

  it('builds ordered sections, overlays per-entry presentation and skips unknown refs', () => {
    const r = modelOf(
      resource({
        name: 'r',
        fields,
        form: {
          groups: [
            {
              name: 'main',
              label: 'group.main',
              columns: 3,
              fields: [
                { field: 'tags', featureFrom: 'category', freeText: 'slug', colSpan: 2, widget: 'tags' },
                { field: 'ghost' },
                { field: 'name', label: 'form.name', placeholder: 'ph.name', visibleOn: 'create' }
              ]
            },
            { name: 'secret', fields: [{ field: 'password' }] }
          ]
        }
      })
    )
    const [main, secret] = r.formSections
    expect(main).toMatchObject({ group: 'main', label: 'group.main', columns: 3 })
    expect(names(main.fields)).toEqual(['tags', 'name'])
    expect(main.fields[0].form).toMatchObject({ widget: 'tags', colSpan: 2, freeText: 'slug', featureFrom: 'category' })
    // The sibling's options are resolved here, where every field is at hand.
    expect(main.fields[0].form?.featureOptions).toBe(r.field('category')?.options)
    expect(main.fields[1].label).toBe('form.name')
    expect(main.fields[1].form).toMatchObject({ placeholder: 'ph.name', visibleOn: 'create' })
    expect(main.fields[1].form?.featureOptions).toBeUndefined()
    expect(secret.label).toBeUndefined()
    expect(names(secret.fields)).toEqual(['password'])
    // The entry label falls back to the field's own label.
    expect(secret.fields[0].label).toBeUndefined()
  })

  it('overlays on a clone: the base field keeps its own label and no form presentation', () => {
    const r = modelOf(
      resource({ name: 'r', fields, form: { groups: [{ name: 'g', fields: [{ field: 'name', label: 'form.name', colSpan: 2 }] }] } })
    )
    expect(r.field('name')?.label).toBe('field.name')
    expect(r.field('name')?.form).toBeUndefined()
  })

  it('clamps the default form grid to 1..4 columns and defaults it to 2', () => {
    const cols = (columns?: number) => modelOf(resource({ name: 'r', form: { columns } })).formColumns
    expect(cols(undefined)).toBe(2)
    expect(cols(0)).toBe(1)
    expect(cols(-3)).toBe(1)
    expect(cols(7)).toBe(4)
    expect(cols(2.6)).toBe(3)
    expect(cols(Number.NaN)).toBe(2)
  })
})

describe('interpretManifest: list config, sort and filter fields', () => {
  it("defaults the layouts to ['table'] and the default layout to the first one", () => {
    expect(modelOf(resource({ name: 'r' })).list).toEqual({ layouts: ['table'], defaultLayout: 'table' })
    expect(modelOf(resource({ name: 'r', list: { layouts: ['card', 'table'] } })).list).toEqual({
      layouts: ['card', 'table'],
      defaultLayout: 'card'
    })
    expect(modelOf(resource({ name: 'r', list: { layouts: ['card', 'table'], defaultLayout: 'table' } })).list.defaultLayout).toBe(
      'table'
    )
  })

  const fields: FieldSpec[] = [
    { name: 'name', type: 'string', filterable: true },
    { name: 'locked', type: 'string', sortable: false },
    { name: 'meta', type: 'json' },
    { name: 'photo', type: 'image' },
    { name: 'price', type: 'number', filterable: false }
  ]

  it('derives the sort options from the sortable columns', () => {
    const r = modelOf(resource({ name: 'r', fields }))
    expect(names(r.sortFields)).toEqual(['name', 'price'])
  })

  it('reads an explicit sort list in its order, dropping unsortable, non-sortable types and unknown refs', () => {
    const r = modelOf(resource({ name: 'r', fields, list: { sort: ['price', 'meta', 'photo', 'locked', 'ghost', 'name'] } }))
    expect(names(r.sortFields)).toEqual(['price', 'name'])
  })

  it('lists only the fields marked filterable', () => {
    expect(names(modelOf(resource({ name: 'r', fields })).filterFields)).toEqual(['name'])
  })
})

describe('interpretManifest: capabilities', () => {
  it('exposes enabled CRUD capabilities, their roles, and the enabled custom actions', () => {
    const r = modelOf(
      resource({
        name: 'r',
        capabilities: [
          cap('list', { roles: ['viewer'] }),
          cap('create', { enabled: false, roles: ['old'] }),
          cap('create', { name: 'create2', roles: ['admin'] }),
          cap('delete', { enabled: false }),
          cap('action', { name: 'publish', roles: ['editor'] }),
          cap('action', { name: 'archive', enabled: false })
        ]
      })
    )
    expect(r.hasAction('list')).toBe(true)
    expect(r.roles('list')).toEqual(['viewer'])
    // A disabled capability is skipped, the next enabled one of the same kind is used.
    expect(r.hasAction('create')).toBe(true)
    expect(r.roles('create')).toEqual(['admin'])
    expect(r.hasAction('delete')).toBe(false)
    expect(r.roles('delete')).toBeUndefined()
    expect(r.hasAction('update')).toBe(false)
    expect(r.actions.map((a) => a.name)).toEqual(['publish'])
  })

  it('places the delete capability at its targets, one row when it names none', () => {
    const at = (target?: Array<'row' | 'bulk'>) => {
      const r = modelOf(resource({ name: 'r', capabilities: [cap('list'), cap('delete', { target })] }))
      return { row: r.canDeleteAt('row'), bulk: r.canDeleteAt('bulk') }
    }
    expect(at()).toEqual({ row: true, bulk: false })
    expect(at([])).toEqual({ row: true, bulk: false })
    expect(at(['row', 'bulk'])).toEqual({ row: true, bulk: true })
    // The backend declares only `bulk` when the resource has the collection route alone.
    expect(at(['bulk'])).toEqual({ row: false, bulk: true })
    const none = modelOf(resource({ name: 'r', capabilities: [cap('list'), cap('delete', { enabled: false })] }))
    expect([none.canDeleteAt('row'), none.canDeleteAt('bulk')]).toEqual([false, false])
  })
})

describe('toRefineResources', () => {
  it('orders by group order (explicit, else index * 10), then by resource order, ungrouped last', () => {
    const model = interpretManifest(
      manifest({
        groups: [
          { name: 'a', label: 'group.a' },
          { name: 'b', label: 'group.b', order: 5 },
          { name: 'c', label: 'group.c' }
        ],
        resources: [
          resource({ name: 'inC', group: 'c' }),
          resource({ name: 'inB', group: 'b' }),
          resource({ name: 'ungrouped' }),
          resource({ name: 'inA2', group: 'a', order: 2 }),
          resource({ name: 'unknownGroup', group: 'zzz', order: -1 }),
          resource({ name: 'inA1', group: 'a', order: 1 })
        ]
      })
    )
    // 'a' = 0 (index 0), 'b' = 5 (explicit), 'c' = 20 (index 2); unknown/no group = 999.
    expect(toRefineResources(model).map((r) => r.name)).toEqual(['inA1', 'inA2', 'inB', 'inC', 'unknownGroup', 'ungrouped'])
  })

  it('gives a singleton an edit route at its base path and nothing else', () => {
    const model = interpretManifest(
      manifest({
        resources: [
          resource({ name: 'company', path: 'company', group: 'settings', icon: 'cog', singleton: true, capabilities: [cap('read'), cap('update'), cap('delete')] })
        ]
      })
    )
    expect(toRefineResources(model)).toEqual([
      {
        name: 'company',
        edit: '/company',
        meta: {
          label: 'res.company.plural',
          labelSingular: 'res.company.singular',
          icon: 'cog',
          parent: 'settings',
          singleton: true,
          canDelete: false
        }
      }
    ])
  })

  it('gives a collection a list, and show/create/edit/delete only when the capability exists', () => {
    const model = interpretManifest(
      manifest({
        resources: [
          resource({ name: 'full', path: 'admin/full', capabilities: [cap('list'), cap('read'), cap('create'), cap('update'), cap('delete')] }),
          resource({ name: 'readOnly', path: 'ro', capabilities: [cap('list'), cap('update', { enabled: false })] })
        ]
      })
    )
    const [full, ro] = toRefineResources(model)
    expect(full).toMatchObject({
      list: '/admin/full',
      create: '/admin/full/create',
      edit: '/admin/full/edit/:id',
      show: '/admin/full/show/:id',
      meta: { canDelete: true }
    })
    expect(ro).toMatchObject({ list: '/ro', meta: { canDelete: false } })
    expect(ro.create).toBeUndefined()
    expect(ro.edit).toBeUndefined()
    expect(ro.show).toBeUndefined()
  })

  it('offers a detail page only when a read loads the record or the project draws the show view', () => {
    const model = interpretManifest(
      manifest({
        resources: [
          resource({ name: 'read', path: 'read', capabilities: [cap('list'), cap('read')] }),
          resource({ name: 'drawn', path: 'drawn', capabilities: [cap('list')], views: { show: 'custom-detail' } }),
          resource({ name: 'auto', path: 'auto', capabilities: [cap('list')], views: { show: 'auto' } }),
          resource({ name: 'listOnly', path: 'list-only', capabilities: [cap('list'), cap('read', { enabled: false })] })
        ]
      })
    )
    expect(model.resources.map((r) => [r.spec.name, r.hasShow])).toEqual([
      ['read', true],
      ['drawn', true],
      ['auto', false],
      ['listOnly', false]
    ])
  })
})
