import { describe, expect, it } from 'vitest'
import { mockControlManifest } from '@/mock/controlManifest'
import { manifestSchemaErrors } from '../helpers/schema'

describe('mockControlManifest', () => {
  it('validates against manifest.v2.schema.json', () => {
    expect(manifestSchemaErrors(mockControlManifest)).toEqual([])
  })

  it('describes the control plane', () => {
    expect(mockControlManifest.auth.plane).toBe('control')
  })
})
