import { describe, expect, it } from 'vitest'
import { dialogBody } from '@/ui/actions/ActionButtons'

describe('action dialog body', () => {
  const fields = [
    { name: 'expiresAt', type: 'datetime' as const },
    { name: 'permanent', type: 'boolean' as const },
    { name: 'reason', type: 'text' as const }
  ]

  it('leaves out a field never touched, so the server applies its own default', () => {
    expect(dialogBody(fields, {})).toEqual({})
  })

  it('sends a cleared date as null and a cleared text as it is', () => {
    expect(dialogBody(fields, { expiresAt: '', reason: '' })).toEqual({ expiresAt: null, reason: '' })
  })

  it('sends what was entered, a box as a boolean', () => {
    const at = '2026-12-31T09:00:00.000Z'
    expect(dialogBody(fields, { expiresAt: at, permanent: true })).toEqual({ expiresAt: at, permanent: true })
    expect(dialogBody(fields, { permanent: false })).toEqual({ permanent: false })
  })
})
