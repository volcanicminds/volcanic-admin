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
  onShow: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  /** Table-only: current sort + toggle handler. */
  sorters?: CrudSorting
  onToggleSort?: (field: string) => void
}
