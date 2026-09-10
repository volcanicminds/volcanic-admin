/**
 * Backend error humanization.
 *
 * The data layer can surface raw driver text (e.g. Postgres
 * `duplicate key value violates unique constraint "UQ_…"`). Leaking that into a
 * toast is noise to the operator and a small information disclosure. We classify
 * the common cases into a stable machine `code` + an i18n message key, and treat
 * anything that still looks like raw SQL noise as a generic error.
 *
 * Keys are translated via the engine i18n (`translate`), so projects localize
 * them (`error.unique`, `error.reference`, `error.required`, `error.generic`)
 * and missing keys fall back to a humanized label — never a raw key.
 *
 * The backend's machine `code` is read **first**, because from v5 it is the part of the body
 * that is always there: `HIDE_ERROR_DETAILS` defaults to on in production and strips the
 * message, so a classifier that only reads prose classifies nothing where it matters most.
 */

export interface ClassifiedError {
  /** Stable machine code for programmatic handling. */
  code?: string
  /** i18n key for the user-facing message (translated by the caller). */
  messageKey?: string
  /** A ready, human-safe literal message (used verbatim, not translated). */
  message?: string
}

// Signatures that mean "this string is internal DB/driver detail, do not show it".
const DB_NOISE =
  /violates|constraint|sqlstate|queryfailederror|syntax error|relation ".*" does not exist|column ".*"|null value in column/i

/**
 * Backend machine codes worth their own message. A `QUERY_*` code means the admin built a
 * query the backend refuses — a bug here, not a mistake by the operator — and in v5 those are
 * a 400 rather than a silently different result set, which is why they can be reported at all.
 */
const CODE_MESSAGES: Record<string, ClassifiedError> = {
  TENANT_REQUIRED: { code: 'tenant_required', messageKey: 'error.tenantRequired' },
  TENANT_NOT_FOUND: { code: 'tenant_not_found', messageKey: 'error.tenantNotFound' },
  TENANT_MISMATCH: { code: 'tenant_mismatch', messageKey: 'error.forbidden' },
  SCOPE_MISMATCH: { code: 'forbidden', messageKey: 'error.forbidden' },
  SCHEMA_BEHIND: { code: 'schema_behind', messageKey: 'error.unavailable' },
  TRACKING_FAILED: { code: 'server_error', messageKey: 'error.generic' },
  PASSWORD_TO_BE_CHANGED: { code: 'password_expired', messageKey: 'error.passwordExpired' },
  AUTH_INVALID_CREDENTIALS: { code: 'invalid_credentials', messageKey: 'error.invalidCredentials' }
}

/** Map a failed response (status + parsed body) to a user-safe message key. */
export function classifyBackendError(status: number, body: unknown): ClassifiedError {
  const code = typeof (body as any)?.code === 'string' ? (body as any).code : undefined
  if (code) {
    if (CODE_MESSAGES[code]) return CODE_MESSAGES[code]
    // Every other QUERY_* is the same story for the operator: the list could not be read.
    if (code.startsWith('QUERY_')) return { code: 'invalid_query', messageKey: 'error.invalidQuery' }
  }

  const raw =
    typeof body === 'string'
      ? body
      : [(body as any)?.message, (body as any)?.error, (body as any)?.detail]
          .filter(Boolean)
          .join(' ')
  const text = String(raw ?? '')
  const hay = text.toLowerCase()

  if (/duplicate key|unique constraint|already exists|23505/.test(hay)) {
    return { code: 'unique_violation', messageKey: 'error.unique' }
  }
  if (/foreign key constraint|23503/.test(hay)) {
    return { code: 'fk_violation', messageKey: 'error.reference' }
  }
  if (/not-null|null value in column|23502/.test(hay)) {
    return { code: 'not_null', messageKey: 'error.required' }
  }

  // Known HTTP shapes with safe-to-show messages.
  if (status === 401 || status === 403) return { code: 'forbidden', messageKey: 'error.forbidden' }
  if (status === 404) return { code: 'not_found', messageKey: 'error.notFound' }
  if (status === 409) return { code: 'conflict', messageKey: 'error.conflict' }

  // A clean validation/business message from the backend is fine to surface as-is;
  // raw DB noise is not — fall back to a generic message in that case.
  if (text && !DB_NOISE.test(text)) return { message: text }
  return { code: 'server_error', messageKey: 'error.generic' }
}
