import { describe, expect, it } from 'vitest'
import { mockManifest } from '@/mock/manifest'
import { manifestSchemaErrors } from '../helpers/schema'

describe('mockManifest', () => {
  it('validates against manifest.v2.schema.json', () => {
    expect(manifestSchemaErrors(mockManifest)).toEqual([])
  })

  it('is rejected once a field type or a capability role list is broken (the check can fail)', () => {
    const broken = structuredClone(mockManifest)
    ;(broken.resources[0].fields[0] as { type: string }).type = 'bogus'
    delete (broken.resources[0].capabilities[0] as { roles?: string[] }).roles
    const paths = manifestSchemaErrors(broken).map((e) => e.instancePath)
    expect(paths).toContain('/resources/0/fields/0/type')
    expect(paths).toContain('/resources/0/capabilities/0')
  })
})
