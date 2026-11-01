/**
 * Capability/action helpers (pure, no React). Drive the rendering and invocation
 * of manifest `kind:'action'` capabilities (publish/archive/export, …).
 */
import type { ActionKind, CapabilitySpec } from './types/manifest.js'

const PARAM = /:([A-Za-z_]\w*)/g

/** Substitute `:param` segments in a capability path from a record (`:id` → record.id). */
export function interpolatePath(path: string, record?: Record<string, unknown>): string {
  return path.replace(PARAM, (_m, key: string) => {
    const v = record?.[key]
    return v != null ? encodeURIComponent(String(v)) : `:${key}`
  })
}

/**
 * The record carries a value for every `:param` of the path. A path it cannot fill would go out
 * with the placeholder in the URL (`/vehicles/7/images/:imageId`), so its action is not offered.
 */
export function fillsPath(path: string, record?: Record<string, unknown>): boolean {
  return [...path.matchAll(PARAM)].every(([, key]) => record?.[key] != null)
}

/** The action can run on this record: its `visibleWhen` holds and the record fills its path. */
export function canRunOn(action: CapabilitySpec, record: Record<string, unknown>): boolean {
  return matchVisibleWhen(record, action.visibleWhen) && fillsPath(action.path, record)
}

/** A boolean intent written as JSON `false` or as the query-string word `'false'`. */
function isFalse(expected: unknown): boolean {
  return expected === false || expected === 'false'
}

function matchOp(value: unknown, op: string, expected: unknown): boolean {
  switch (op) {
    case 'eq':
      return String(value) === String(expected)
    case 'neq':
    case 'ne':
      return String(value) !== String(expected)
    case 'in':
      return (Array.isArray(expected) ? expected : [expected]).map(String).includes(String(value))
    case 'nin':
      return !(Array.isArray(expected) ? expected : [expected]).map(String).includes(String(value))
    case 'gt':
      return Number(value) > Number(expected)
    case 'ge':
    case 'gte':
      return Number(value) >= Number(expected)
    case 'lt':
      return Number(value) < Number(expected)
    case 'le':
    case 'lte':
      return Number(value) <= Number(expected)
    case 'null':
      // `null: false` asks for "is not null" (one operator for the pair, as in Magic Query v5).
      return isFalse(expected) ? value != null : value == null
    case 'notNull':
      return value != null
    default:
      return true
  }
}

/** Evaluate a capability's `visibleWhen` condition against a record. */
export function matchVisibleWhen(
  record: Record<string, unknown> | undefined,
  cond?: CapabilitySpec['visibleWhen']
): boolean {
  if (!cond) return true
  for (const [field, ops] of Object.entries(cond)) {
    for (const [op, expected] of Object.entries(ops)) {
      if (!matchOp(record?.[field], op, expected)) return false
    }
  }
  return true
}

/**
 * Actions that surface at the given target. An action with no explicit `target`
 * defaults to a row action.
 */
export function actionsByTarget(actions: CapabilitySpec[], target: ActionKind): CapabilitySpec[] {
  return actions.filter((a) => (a.target?.length ? a.target.includes(target) : target === 'row'))
}
