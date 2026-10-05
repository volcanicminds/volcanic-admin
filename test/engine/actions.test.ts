import { describe, expect, it } from 'vitest'
import { actionsByTarget, interpolatePath, matchVisibleWhen } from '@/engine/actions'
import { cap } from '../helpers/manifest'

describe('interpolatePath', () => {
  it('substitutes :params from the record, URL-encoded', () => {
    expect(interpolatePath('/cars/:id/publish', { id: 42 })).toBe('/cars/42/publish')
    expect(interpolatePath('/t/:tenant_id/u/:userId', { tenant_id: 'a b', userId: 'x/y?z' })).toBe('/t/a%20b/u/x%2Fy%3Fz')
  })

  it('keeps a param the record does not carry (null, undefined or no record)', () => {
    expect(interpolatePath('/cars/:id', { id: null })).toBe('/cars/:id')
    expect(interpolatePath('/cars/:id', {})).toBe('/cars/:id')
    expect(interpolatePath('/cars/:id')).toBe('/cars/:id')
  })

  it('substitutes falsy but present values', () => {
    expect(interpolatePath('/p/:n/:flag', { n: 0, flag: false })).toBe('/p/0/false')
  })

  it('only treats a colon followed by an identifier as a param', () => {
    expect(interpolatePath('/at/10:30/:9x/:id', { id: 1 })).toBe('/at/10:30/:9x/1')
  })
})

describe('matchVisibleWhen', () => {
  it('is visible without a condition', () => {
    expect(matchVisibleWhen({ a: 1 }, undefined)).toBe(true)
    expect(matchVisibleWhen(undefined, undefined)).toBe(true)
    expect(matchVisibleWhen({ a: 1 }, {})).toBe(true)
  })

  it.each([
    ['eq', 'draft', 'draft', true],
    ['eq', 1, '1', true],
    ['eq', 'draft', 'published', false],
    ['neq', 'draft', 'published', true],
    ['neq', 'published', 'published', false],
    ['ne', 'draft', 'published', true],
    ['in', 'b', ['a', 'b'], true],
    ['in', 'c', ['a', 'b'], false],
    ['in', 'a', 'a', true],
    ['nin', 'c', ['a', 'b'], true],
    ['nin', 'a', ['a', 'b'], false],
    ['nin', 'a', 'a', false],
    ['gt', 5, 3, true],
    ['gt', 3, 3, false],
    ['ge', 3, 3, true],
    ['gte', 2, 3, false],
    ['lt', 2, 3, true],
    ['lt', 3, 3, false],
    ['le', 3, 3, true],
    ['lte', 4, 3, false],
    ['gt', 'abc', 3, false],
    ['null', null, true, true],
    ['null', undefined, true, true],
    ['null', 'x', true, false],
    ['notNull', 'x', true, true],
    ['notNull', null, true, false]
  ])('%s: value %j against %j is %s', (op, value, expected, result) => {
    expect(matchVisibleWhen({ f: value }, { f: { [op]: expected } })).toBe(result)
  })

  it('reads { null: false } as "is not null"', () => {
    expect(matchVisibleWhen({ deletedAt: '2026-01-01' }, { deletedAt: { null: false } })).toBe(true)
    expect(matchVisibleWhen({ deletedAt: null }, { deletedAt: { null: false } })).toBe(false)
  })

  it('requires every operator of every field', () => {
    const cond = { status: { neq: 'archived', in: ['draft', 'review'] }, stock: { gt: 0 } }
    expect(matchVisibleWhen({ status: 'draft', stock: 2 }, cond)).toBe(true)
    expect(matchVisibleWhen({ status: 'published', stock: 2 }, cond)).toBe(false)
    expect(matchVisibleWhen({ status: 'draft', stock: 0 }, cond)).toBe(false)
  })

  it('evaluates a missing record as all fields absent', () => {
    expect(matchVisibleWhen(undefined, { status: { eq: 'draft' } })).toBe(false)
    expect(matchVisibleWhen(undefined, { deletedAt: { null: true } })).toBe(true)
  })

  it('ignores an operator it does not know', () => {
    expect(matchVisibleWhen({ f: 1 }, { f: { regex: '^x' } })).toBe(true)
  })
})

describe('actionsByTarget', () => {
  const rowDefault = cap('action', { name: 'publish' })
  const emptyTarget = cap('action', { name: 'archive', target: [] })
  const bulkOnly = cap('action', { name: 'bulkDelete', target: ['bulk'] })
  const rowAndBulk = cap('action', { name: 'tag', target: ['row', 'bulk'] })
  const collection = cap('action', { name: 'export', target: ['collection'] })
  const all = [rowDefault, emptyTarget, bulkOnly, rowAndBulk, collection]

  it('treats an action without a target as a row action', () => {
    expect(actionsByTarget(all, 'row').map((a) => a.name)).toEqual(['publish', 'archive', 'tag'])
  })

  it('surfaces explicit targets only where they are declared', () => {
    expect(actionsByTarget(all, 'bulk').map((a) => a.name)).toEqual(['bulkDelete', 'tag'])
    expect(actionsByTarget(all, 'collection').map((a) => a.name)).toEqual(['export'])
    expect(actionsByTarget([], 'row')).toEqual([])
  })
})
