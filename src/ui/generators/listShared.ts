import type { CrudSorting } from '@refinedev/core'
import type { ResourceModel } from '@/engine'

export type TFunc = (key?: string, vars?: Record<string, string | number>) => string

/** Props shared by the list presentation layers (table / cards). */
export interface ListPresentationProps {
  model: ResourceModel
  records: any[]
  isLoading: boolean
  t: TFunc
  canEdit: boolean
  canDelete: boolean
  /** The record has a detail page: the row opens it and offers it. */
  canShow: boolean
  onShow: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  /** The rows can be selected (a bulk delete or bulk action exists): each row offers a checkbox. */
  selection?: {
    selected: ReadonlySet<string>
    toggle: (id: string) => void
    /** Selects every row on the page, or none when all are selected already. */
    toggleAll: () => void
  }
  /** Table-only: current sort + toggle handler. */
  sorters?: CrudSorting
  onToggleSort?: (field: string) => void
}
