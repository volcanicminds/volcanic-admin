/**
 * Volcanic Admin — Manifest spec v1.
 *
 * The manifest is the single source of truth for the admin UI. It is emitted by
 * the backend (`GET /admin/manifest`, per-role + cached) and interpreted by the
 * engine. Every human-facing label is an i18n KEY, never literal text.
 *
 * Mirrors VOLCANIC_ADMIN_BLUEPRINT.md §3.
 */

export type I18nKey = string

/** Action verbs gated by role / capability. */
export type CrudAction = 'list' | 'read' | 'create' | 'update' | 'delete'

/** Field primitive types (§3.3). */
export type FieldType =
  | 'string'
  | 'text'
  | 'richtext'
  | 'integer'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'enum'
  | 'relation'
  | 'email'
  | 'url'
  | 'uuid'
  | 'json'
  | 'image'
  | 'file'

/** Magic Query operator subset exposed to the UI (§3.6). `raw` is never exposed. */
export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'contains'
  | 'containsi'
  | 'ncontains'
  | 'ncontainsi'
  | 'starts'
  | 'startsi'
  | 'ends'
  | 'endsi'
  | 'gt'
  | 'ge'
  | 'lt'
  | 'le'
  | 'between'
  | 'in'
  | 'nin'
  | 'null'
  | 'notNull'

export type SortOrder = 'asc' | 'desc'

export interface SortSpec {
  field: string
  order: SortOrder
}

// ─── Top level ──────────────────────────────────────────────────────────────

export interface Manifest {
  version: 1
  generatedAt: string
  i18n: {
    defaultLocale: string
    locales: string[]
  }
  auth: {
    mode: 'cookie' | 'bearer'
    endpoints: {
      login: string
      refresh: string
      logout: string
      [key: string]: string
    }
  }
  tenancy: {
    mode: 'single' | 'multi'
    switchable?: boolean
    header?: string
    listEndpoint?: string
  }
  groups: GroupSpec[]
  enums: Record<string, EnumOption[]>
  resources: ResourceSpec[]
}

export interface GroupSpec {
  name: string
  label: I18nKey
  icon?: string
  order?: number
}

export interface EnumOption {
  value: string
  label: I18nKey
  /** UI hint for badges/tags (e.g. "green", "amber"). */
  color?: string
}

// ─── Resource ───────────────────────────────────────────────────────────────

export interface ResourceLabel {
  singular: I18nKey
  plural: I18nKey
}

export type PermissionMap = Partial<Record<CrudAction, string[]>>

export interface ResourceCapabilities {
  create?: boolean
  update?: boolean
  delete?: boolean
  bulkDelete?: boolean
  search?: boolean
  export?: boolean
}

export interface SearchSpec {
  /** Fields included in the OR omni-search (may use dot-notation). */
  fields: string[]
  operator?: FilterOperator
}

export type ViewMode = 'auto' | string // "auto" | componentId from override registry

/** List presentation layouts (table grid vs. card grid). */
export type ListLayout = 'table' | 'card'

export interface ResourceViews {
  list?: ViewMode
  create?: ViewMode
  edit?: ViewMode
  show?: ViewMode
}

export interface ResourceSpec {
  name: string
  path: string
  label: ResourceLabel
  icon?: string
  group?: string
  order?: number
  idField?: string
  /** Display field(s) for titles/references; an array is joined with spaces. */
  titleField?: string | string[]
  /** Secondary display field(s); an array is joined with spaces. */
  subtitleField?: string | string[]
  tenantScoped?: boolean
  softDelete?: boolean
  singleton?: boolean
  permissions?: PermissionMap
  capabilities?: ResourceCapabilities
  defaultSort?: SortSpec[]
  search?: SearchSpec
  /** Available list layouts; when more than one, the UI shows a layout toggle. */
  listLayouts?: ListLayout[]
  /** Default list layout (falls back to the first of listLayouts, else 'table'). */
  defaultListLayout?: ListLayout
  /** Extra fields rendered as labeled info rows on the card layout. */
  cardFields?: string[]
  fields: FieldSpec[]
  actions?: ActionSpec[]
  views?: ResourceViews
}

// ─── Field ──────────────────────────────────────────────────────────────────

export interface RelationSpec {
  resource: string
  kind: 'many-to-one' | 'one-to-many' | 'many-to-many'
  titleField?: string
  foreignKey?: string
  inverse?: string
}

export interface ImageSpec {
  multiple?: boolean
  ordered?: boolean
  /** "first" → first image is the cover (→ coverUrl); "flag" → per-image isCover. */
  cover?: 'first' | 'flag'
  altField?: string
  accept?: string[]
  maxSize?: number
  endpoints?: {
    upload?: EndpointSpec
    reorder?: EndpointSpec
    update?: EndpointSpec
    remove?: EndpointSpec
  }
  storage?: 'folder' | 's3' | string
}

export interface ValidationSpec {
  required?: boolean
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  step?: number
}

export interface FieldListSpec {
  visible?: boolean
  sortable?: boolean
  filterable?: boolean
  operators?: FilterOperator[]
  width?: number
  align?: 'left' | 'center' | 'right'
}

export interface FieldFormSpec {
  visible?: boolean
  /** Widget id; "auto" or a registered widget/componentId. */
  widget?: string
  /** Section grouping inside the form (e.g. "header", "contract"). */
  group?: string
  colSpan?: number
  placeholder?: I18nKey
}

export interface FieldSpec {
  name: string
  type: FieldType
  label?: I18nKey
  required?: boolean
  readOnly?: boolean
  nullable?: boolean
  default?: unknown
  help?: I18nKey
  /** Inline enum options (alternative to enumRef). */
  enum?: EnumOption[]
  /** Reference to a shared enum in Manifest.enums. */
  enumRef?: string
  relation?: RelationSpec
  image?: ImageSpec
  validation?: ValidationSpec
  list?: FieldListSpec
  form?: FieldFormSpec
}

// ─── Actions ────────────────────────────────────────────────────────────────

export type ActionKind = 'row' | 'bulk' | 'collection'

export interface EndpointSpec {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
}

export interface ActionSpec {
  name: string
  label?: I18nKey
  icon?: string
  /** One or more of row/bulk/collection. */
  kind: ActionKind | ActionKind[]
  method: EndpointSpec['method']
  path: string
  /** Static payload merged into the request body. */
  payload?: Record<string, unknown>
  confirm?: boolean
  confirmText?: I18nKey
  /** Row condition (field → operator → value) controlling visibility. */
  visibleWhen?: Record<string, Record<string, unknown>>
  roles?: string[]
  refresh?: boolean
  /** Download mime-type when the action returns a file. */
  download?: string
  /** Override registry id; null/undefined → generic handler. */
  component?: string | null
}
