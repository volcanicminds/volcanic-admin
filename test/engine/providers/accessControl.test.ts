import { describe, expect, it } from 'vitest'
import { canAccessResource, canReachResource } from '@/engine/providers/accessControl'
import { interpretManifest } from '@/engine/interpreter'
import type { CapabilitySpec, ResourceSpec } from '@/engine'
import { cap, manifest, resource } from '../../helpers/manifest'

const modelOf = (spec: Partial<ResourceSpec>) =>
  interpretManifest(manifest({ resources: [resource({ name: 'r', ...spec })] })).resource('r')!

describe('canAccessResource', () => {
  const r = modelOf({
    capabilities: [
      cap('list', { roles: ['viewer', 'editor'] }),
      cap('update', { roles: ['editor'] }),
      cap('delete', { roles: ['admin'], enabled: false })
    ]
  })

  it('needs an overlap between the declared roles and the user roles', () => {
    expect(canAccessResource(r, 'list', ['viewer'])).toBe(true)
    expect(canAccessResource(r, 'list', ['guest', 'editor'])).toBe(true)
    expect(canAccessResource(r, 'update', ['viewer'])).toBe(false)
    expect(canAccessResource(r, 'update', [])).toBe(false)
  })

  it('denies an action the resource does not have, or has disabled', () => {
    expect(canAccessResource(r, 'create', ['admin', 'editor', 'viewer'])).toBe(false)
    expect(canAccessResource(r, 'delete', ['admin'])).toBe(false)
  })

  it('falls back to the presence of the action when the capability declares no roles', () => {
    // A capability without `roles` (not schema-valid, but what an older backend may send).
    const noRoles = { ...cap('read'), roles: undefined } as unknown as CapabilitySpec
    const legacy = modelOf({ capabilities: [noRoles] })
    expect(canAccessResource(legacy, 'read', [])).toBe(true)
    expect(canAccessResource(legacy, 'list', [])).toBe(false)
  })
})

describe('canReachResource', () => {
  it('reaches a collection only through list', () => {
    expect(canReachResource(modelOf({ capabilities: [cap('list', { roles: ['a'] })] }), ['a'])).toBe(true)
    expect(canReachResource(modelOf({ capabilities: [cap('list', { roles: ['a'] })] }), ['b'])).toBe(false)
    expect(
      canReachResource(modelOf({ capabilities: [cap('read', { roles: ['a'] }), cap('update', { roles: ['a'] })] }), ['a'])
    ).toBe(false)
  })

  it('reaches a singleton through read, update or list', () => {
    const singleton = (kind: 'read' | 'update' | 'list' | 'delete') =>
      modelOf({ singleton: true, capabilities: [cap(kind, { roles: ['a'] })] })
    expect(canReachResource(singleton('read'), ['a'])).toBe(true)
    expect(canReachResource(singleton('update'), ['a'])).toBe(true)
    expect(canReachResource(singleton('list'), ['a'])).toBe(true)
    expect(canReachResource(singleton('delete'), ['a'])).toBe(false)
    expect(canReachResource(singleton('read'), ['b'])).toBe(false)
  })
})
