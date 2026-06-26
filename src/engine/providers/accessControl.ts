/**
 * Volcanic access-control provider — crosses the manifest `permissions` with the
 * current user's roles. The manifest is already role-filtered server-side; this
 * gates the UI (hide/disable) as defense-in-depth. The backend still enforces.
 */
import type { AccessControlProvider } from '@refinedev/core'
import type { AdminModel } from '../types/model.js'
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
      const allowed = res.spec.permissions?.[crudAction]

      // No explicit permission list → fall back to capability-derived availability.
      if (!allowed) return { can: res.hasAction(crudAction) }

      const roles = getRoles()
      const can = allowed.some((r) => roles.includes(r))
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
