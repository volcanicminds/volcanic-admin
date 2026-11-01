import { describe, expect, it } from 'vitest'
import { needsLogin, type LoadFailure } from '@/VolcanicAdmin'

const failure = (status: number, code?: string): LoadFailure => Object.assign(new Error('Manifest fetch failed'), { status, code })

describe('the manifest failures that open a login instead of an error (T-10.12)', () => {
  it.each([
    [401, undefined],
    [400, 'TENANT_REQUIRED'],
    [404, 'TENANT_NOT_FOUND'],
    [403, 'SCOPE_MISMATCH'],
    // A session whose user was deleted: the backend clears its cookies with this answer, so the
    // login drawn next starts from no session instead of the stale one.
    [404, 'SUBJECT_NOT_FOUND']
  ])('opens a login on %i %s', (status, code) => {
    expect(needsLogin(failure(status, code))).toBe(true)
  })

  it.each([
    [404, undefined],
    [403, 'USER_NOT_VALID'],
    [500, 'INTERNAL']
  ])('shows the error on %i %s', (status, code) => {
    expect(needsLogin(failure(status, code))).toBe(false)
  })
})
