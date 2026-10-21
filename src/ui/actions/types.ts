/**
 * The contract of a custom action component — what `ActionButtons` hands to whatever the
 * registry resolves for `capability.component`, in place of the generic button and dialog.
 *
 * `model` is here because an action that calls the API itself has to know which resource it
 * belongs to: to invalidate the right list afterwards, and to reach the sibling capabilities of
 * a flow that is more than one call.
 */
import type { CrudFilters } from '@refinedev/core'
import type { CapabilitySpec, ResourceModel } from '@/engine'
import type { TFunc } from '../generators/listShared'

export type ActionRecord = Record<string, any>

export interface ActionComponentProps {
  capability: CapabilitySpec
  record?: ActionRecord
  model?: ResourceModel
  /**
   * A collection action's selection: the list's filters as the list applies them, the search
   * box included, so an action on "every row filtered" acts on the rows the operator sees.
   * `buildMagicQuery({ filters })` writes them as the backend reads them.
   */
  filters?: CrudFilters
  /** Runs THIS capability through the generic runner (toast, download, invalidation). */
  run: (record?: ActionRecord, body?: ActionRecord) => void
  t: TFunc
}
