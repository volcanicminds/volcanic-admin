import { describe, expect, it } from 'vitest'
import { buildRecordTitle, resolveFields } from '@/ui/generators/documentTitle'
import { interpretManifest } from '@/engine/interpreter'
import { translate } from '@/engine/i18n'
import type { ResourceSpec } from '@/engine'
import { manifest, resource } from '../../helpers/manifest'

const statusOptions = [
  { value: 'long_rent', label: 'enum.status.long_rent' },
  { value: 'short_rent', label: 'enum.status.short_rent' }
]

const carSpec = (extra: Partial<ResourceSpec> = {}) =>
  resource({
    name: 'cars',
    fields: [
      { name: 'name', type: 'string' },
      { name: 'plate', type: 'string' },
      { name: 'brand', type: 'relation', relation: { resource: 'brands', titleField: 'title', foreignKey: 'brandId' } },
      { name: 'brandId', type: 'uuid' },
      { name: 'model', type: 'relation', relation: { resource: 'models', foreignKey: 'modelId' } },
      { name: 'owner', type: 'relation', relation: { resource: 'users' } },
      { name: 'status', type: 'enum', enum: statusOptions },
      { name: 'tags', type: 'enum', multiple: true, enum: statusOptions },
      { name: 'km', type: 'integer' }
    ],
    ...extra
  })

const modelOf = (extra: Partial<ResourceSpec> = {}) => interpretManifest(manifest({ resources: [carSpec(extra)] })).resource('cars')!

describe('resolveFields', () => {
  const model = modelOf()

  it('joins several fields with a space and skips the empty ones', () => {
    expect(resolveFields(model, { name: 'Panda', plate: 'AB123CD' }, ['name', 'plate'])).toBe('Panda AB123CD')
    expect(resolveFields(model, { name: 'Panda', plate: null }, ['plate', 'name', 'missing'])).toBe('Panda')
    expect(resolveFields(model, { name: 'Panda' }, 'name')).toBe('Panda')
    expect(resolveFields(model, {}, ['name', 'plate'])).toBe('')
  })

  it('keeps falsy but present values', () => {
    expect(resolveFields(model, { km: 0 }, 'km')).toBe('0')
  })

  it("renders an expanded relation through its titleField, else 'name', else its id", () => {
    expect(resolveFields(model, { brand: { id: 'b1', title: 'Fiat', name: 'ignored' } }, 'brand')).toBe('Fiat')
    expect(resolveFields(model, { brand: { id: 'b1' } }, 'brand')).toBe('b1')
    expect(resolveFields(model, { model: { id: 'm1', name: 'Panda' } }, 'model')).toBe('Panda')
    expect(resolveFields(model, { brand: {} }, 'brand')).toBe('')
  })

  it('finds an expanded relation under the target resource name too', () => {
    expect(resolveFields(model, { brands: { title: 'Fiat' } }, 'brand')).toBe('Fiat')
  })

  it('prefers a denormalized display value, then the foreign key', () => {
    expect(resolveFields(model, { brand: 'Fiat', brandId: 'b1' }, 'brand')).toBe('Fiat')
    expect(resolveFields(model, { brandId: 'b1' }, 'brand')).toBe('b1')
    expect(resolveFields(model, {}, 'brand')).toBe('')
    expect(resolveFields(model, {}, 'owner')).toBe('')
  })

  it('follows dotted paths and yields nothing on a broken one', () => {
    expect(resolveFields(model, { specs: { engine: { power: 70 } } }, 'specs.engine.power')).toBe('70')
    expect(resolveFields(model, { specs: null }, 'specs.engine.power')).toBe('')
  })

  it('renders an enum code as its translated label, an unknown code as itself, and a list joined', () => {
    expect(resolveFields(model, { status: 'long_rent' }, 'status')).toBe(translate('enum.status.long_rent'))
    expect(resolveFields(model, { status: 'other' }, 'status')).toBe('other')
    expect(resolveFields(model, { tags: ['long_rent', 'short_rent'] }, 'tags')).toBe(
      `${translate('enum.status.long_rent')}, ${translate('enum.status.short_rent')}`
    )
    // Sanity check on the fixture: the label is not the raw code.
    expect(translate('enum.status.long_rent')).not.toBe('long_rent')
  })
})

describe('buildRecordTitle', () => {
  const record = { name: 'Panda', plate: 'AB123CD', brand: { title: 'Fiat' } }

  it('is empty without a record', () => {
    expect(buildRecordTitle(modelOf(), undefined)).toBe('')
  })

  it('uses documentTitle, then titleField, then name', () => {
    expect(buildRecordTitle(modelOf({ documentTitle: ['brand', 'plate'], titleField: 'name' }), record)).toBe('Fiat AB123CD')
    expect(buildRecordTitle(modelOf({ titleField: 'plate' }), record)).toBe('AB123CD')
    expect(buildRecordTitle(modelOf(), record)).toBe('Panda')
  })

  it('is empty when the record yields nothing usable', () => {
    expect(buildRecordTitle(modelOf({ titleField: 'plate' }), { name: 'Panda' })).toBe('')
  })
})
