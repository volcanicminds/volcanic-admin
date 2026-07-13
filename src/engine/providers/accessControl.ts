/**
 * Volcanic access-control — crosses each capability's declared `roles` with the current
 * user's roles. The manifest is NOT per-user (it carries every capability's roles); this
 * filters the UI (navigation, buttons) client-side. Every API route still enforces.
 */
import type { AccessControlProvider } from '@refinedev/core'
import type { AdminModel, ResourceModel } from '../types/model.js'
import type { CrudAction } from '../types/manifest.js'

/** Lightweight, app-populated cache of the logged-in user's roles. */
export const rolesStore = {
  _roles: [] as string[],
  set(roles: string[]) {
    this._roles = roles ?? []
  },
  get() {
    return this._roles
  }
}

const ACTION_MAP: Record<string, CrudAction> = {
  list: 'list',
  show: 'read',
  create: 'create',
  edit: 'update',
  clone: 'create',
  delete: 'delete'
}

/**
 * Whether `roles` may perform `action` on a resource: a capability with declared roles
 * needs an overlap; one with no declared roles falls back to whether the action exists.
 */
export function canAccessResource(res: ResourceModel, action: CrudAction, roles: string[]): boolean {
  const allowed = res.roles(action)
  if (!allowed) return res.hasAction(action)
  return allowed.some((r) => roles.includes(r))
}

/**
 * Whether a resource's landing view is reachable for `roles` — used to decide navigation
 * visibility. A collection is reachable via `list`; a singleton via read/update/list.
 */
export function canReachResource(res: ResourceModel, roles: string[]): boolean {
  if (res.spec.singleton) {
    return (
      canAccessResource(res, 'read', roles) ||
      canAccessResource(res, 'update', roles) ||
      canAccessResource(res, 'list', roles)
    )
  }
  return canAccessResource(res, 'list', roles)
}

export function createVolcanicAccessControlProvider(
  model: AdminModel,
  getRoles: () => string[] = () => rolesStore.get()
): AccessControlProvider {
  return {
    can: async ({ resource, action }) => {
      if (!resource) return { can: true }
      const res = model.resource(resource)
      if (!res) return { can: true }

      const crudAction = ACTION_MAP[action] ?? (action as CrudAction)
      const can = canAccessResource(res, crudAction, getRoles())
      return {
        can,
        reason: can ? undefined : `Role not permitted for ${action} on ${resource}`
      }
    },
    options: {
      buttons: { enableAccessControl: true, hideIfUnauthorized: true }
    }
  }
}
