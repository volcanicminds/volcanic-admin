/**
 * Capability/action helpers (pure, no React). Drive the rendering and invocation
 * of manifest `kind:'action'` capabilities (publish/archive/export, …).
 */
import type { ActionKind, CapabilitySpec } from './types/manifest.js'

/** Substitute `:param` segments in a capability path from a record (`:id` → record.id). */
export function interpolatePath(path: string, record?: Record<string, unknown>): string {
  return path.replace(/:([A-Za-z_]\w*)/g, (_m, key: string) => {
    const v = record?.[key]
    return v != null ? encodeURIComponent(String(v)) : `:${key}`
  })
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
      return value == null
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
