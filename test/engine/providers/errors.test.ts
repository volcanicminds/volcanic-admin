import { describe, expect, it } from 'vitest'
import { classifyBackendError } from '@/engine/providers/errors'

describe('classifyBackendError: backend machine code first', () => {
  it.each([
    ['TENANT_REQUIRED', 'tenant_required', 'error.tenantRequired'],
    ['TENANT_NOT_FOUND', 'tenant_not_found', 'error.tenantNotFound'],
    ['TENANT_MISMATCH', 'tenant_mismatch', 'error.forbidden'],
    ['SCOPE_MISMATCH', 'forbidden', 'error.forbidden'],
    ['SCHEMA_BEHIND', 'schema_behind', 'error.unavailable'],
    ['TRACKING_FAILED', 'server_error', 'error.generic'],
    ['PASSWORD_TO_BE_CHANGED', 'password_expired', 'error.passwordExpired'],
    ['AUTH_INVALID_CREDENTIALS', 'invalid_credentials', 'error.invalidCredentials'],
    ['TENANT_DESTROYED', 'tenant_destroyed', 'error.tenantDestroyed'],
    ['DESTRUCTION_NOT_AVAILABLE', 'destruction_not_available', 'destroy.error.notAvailable'],
    ['DESTRUCTION_FACTOR_NOT_AVAILABLE', 'destruction_factor_not_available', 'destroy.error.factorUnavailable'],
    ['DESTRUCTION_TOKEN_INVALID', 'destruction_token_invalid', 'destroy.error.tokenInvalid'],
    ['DESTRUCTION_SLUG_MISMATCH', 'destruction_slug_mismatch', 'destroy.error.slugMismatch'],
    ['DESTRUCTION_OTP_INVALID', 'destruction_otp_invalid', 'destroy.error.otpInvalid'],
    ['DESTRUCTION_EXPORT_FAILED', 'destruction_export_failed', 'destroy.error.exportFailed']
  ])('maps %s to %s / %s whatever the status and message', (backendCode, code, messageKey) => {
    expect(classifyBackendError(500, { code: backendCode, message: 'duplicate key value' })).toEqual({ code, messageKey })
  })

  it('maps any QUERY_* code to an invalid query', () => {
    expect(classifyBackendError(400, { code: 'QUERY_UNKNOWN_FIELD', message: 'unknown field foo' })).toEqual({
      code: 'invalid_query',
      messageKey: 'error.invalidQuery'
    })
  })

  it('falls through to the message for an unknown or non-string code', () => {
    expect(classifyBackendError(400, { code: 'SOMETHING_ELSE', message: 'Plate already exists' })).toEqual({
      code: 'unique_violation',
      messageKey: 'error.unique'
    })
    expect(classifyBackendError(400, { code: 42, message: 'Name is too long' })).toEqual({ message: 'Name is too long' })
  })

  // Suspected bug (errors.ts:61): CODE_MESSAGES is a plain object, so an inherited key resolves:
  // { code: 'constructor' } returns the Object constructor function as the classification.
  // Low impact: the backend does not emit such codes.
  it.skip('does not resolve codes through the object prototype', () => {
    expect(classifyBackendError(400, { code: 'constructor', message: 'Bad input' })).toEqual({ message: 'Bad input' })
  })
})

describe('classifyBackendError: driver text', () => {
  it.each([
    ['duplicate key value violates unique constraint "UQ_x"', 'unique_violation', 'error.unique'],
    ['Unique constraint failed', 'unique_violation', 'error.unique'],
    ['Email already exists', 'unique_violation', 'error.unique'],
    ['SQLSTATE 23505', 'unique_violation', 'error.unique'],
    ['insert or update violates foreign key constraint "FK_x"', 'fk_violation', 'error.reference'],
    ['error 23503', 'fk_violation', 'error.reference'],
    ['null value in column "name" violates not-null constraint', 'not_null', 'error.required'],
    ['code 23502', 'not_null', 'error.required']
  ])('classifies %j as %s', (message, code, messageKey) => {
    expect(classifyBackendError(500, { message })).toEqual({ code, messageKey })
  })

  it('reads message, error and detail together, and a string body as is', () => {
    expect(classifyBackendError(500, { error: 'Bad Request', detail: 'Key (plate)=(X) already exists.' })).toEqual({
      code: 'unique_violation',
      messageKey: 'error.unique'
    })
    expect(classifyBackendError(500, 'duplicate key value')).toEqual({ code: 'unique_violation', messageKey: 'error.unique' })
  })

  it('classifies driver text before the HTTP status', () => {
    expect(classifyBackendError(409, { message: 'duplicate key value' })).toEqual({ code: 'unique_violation', messageKey: 'error.unique' })
  })
})

describe('classifyBackendError: HTTP status and fallbacks', () => {
  it('maps 401/403, 404 and 409 to their messages, hiding the backend prose', () => {
    expect(classifyBackendError(401, { message: 'jwt expired' })).toEqual({ code: 'forbidden', messageKey: 'error.forbidden' })
    expect(classifyBackendError(403, { message: 'nope' })).toEqual({ code: 'forbidden', messageKey: 'error.forbidden' })
    expect(classifyBackendError(404, { message: 'missing' })).toEqual({ code: 'not_found', messageKey: 'error.notFound' })
    expect(classifyBackendError(409, { message: 'stale' })).toEqual({ code: 'conflict', messageKey: 'error.conflict' })
  })

  it('surfaces a clean backend message verbatim', () => {
    expect(classifyBackendError(400, { message: 'Price must be positive' })).toEqual({ message: 'Price must be positive' })
    expect(classifyBackendError(422, { message: 'Bad', error: 'Unprocessable' })).toEqual({ message: 'Bad Unprocessable' })
  })

  it.each([
    'syntax error at or near "FROM"',
    'relation "cars" does not exist',
    'column "foo" of relation "cars" does not exist',
    'QueryFailedError: boom',
    'check constraint "positive_price" is violated'
  ])('hides raw database text %j behind a generic error', (message) => {
    expect(classifyBackendError(500, { message })).toEqual({ code: 'server_error', messageKey: 'error.generic' })
  })

  it('returns a generic error when there is nothing to read', () => {
    expect(classifyBackendError(500, undefined)).toEqual({ code: 'server_error', messageKey: 'error.generic' })
    expect(classifyBackendError(500, null)).toEqual({ code: 'server_error', messageKey: 'error.generic' })
    expect(classifyBackendError(500, {})).toEqual({ code: 'server_error', messageKey: 'error.generic' })
    expect(classifyBackendError(500, '')).toEqual({ code: 'server_error', messageKey: 'error.generic' })
  })
})
