/**
 * Volcanic Admin — Manifest spec v2.
 *
 * The manifest is the single source of truth for the admin UI. It is emitted by
 * the backend (`GET /admin/manifest`) and interpreted by the engine. Every
 * human-facing label is an i18n KEY, never literal text.
 *
 * Contract: MANIFEST_DESIGN.md §2 + manifest.v2.schema.json. v2 unifies the v1
 * `permissions` + `capabilities`(boolean) + `actions` into a single
 * `capabilities: CapabilitySpec[]` (roles in one place).
 */

export type I18nKey = string

/** CRUD verbs (subset of CapabilityKind). */
export type CrudAction = 'list' | 'read' | 'create' | 'update' | 'delete'

/** A capability is either a CRUD verb or a custom action. */
export type CapabilityKind = CrudAction | 'action'

/** Field primitive types (§2.4). */
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

/** Magic Query operator subset exposed to the UI (§2.4). `raw` is never exposed. */
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
  version: 2
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
  /** Standalone "operation" sections — endpoints not bound to a resource. */
  capabilities?: CapabilitySpec[]
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

// ─── Capability (unified CRUD + actions) ─────────────────────────────────────

/** Where an action surfaces. */
export type ActionKind = 'row' | 'bulk' | 'collection'

export interface EndpointSpec {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
}

/**
 * A capability is an executable verb bound to a real endpoint, with its own roles.
 * Used both inside a resource (CRUD + custom actions) and at the manifest top level
 * (standalone operation sections). Replaces v1 permissions + capabilities + actions.
 */
export interface CapabilitySpec {
  /** Unique within scope: 'list' | 'create' | ... | 'publish' | 'export'. */
  name: string
  kind: CapabilityKind
  method: EndpointSpec['method']
  /** Binding to the real endpoint. */
  path: string
  /** Authorization (declared); effective gating is admin runtime + BE enforcement. */
  roles: string[]
  enabled?: boolean
  // ── action-only presentation/behavior ──
  label?: I18nKey
  icon?: string
  /** One or more of row/bulk/collection. */
  target?: ActionKind[]
  /** Static payload merged into the request body. */
  payload?: Record<string, unknown>
  confirm?: boolean
  confirmText?: I18nKey
  /** Row condition (field → operator → value) controlling visibility. */
  visibleWhen?: Record<string, Record<string, unknown>>
  refresh?: boolean
  /** Download mime-type when the action returns a file. */
  download?: string
  /** Override registry id; null/undefined → generic handler. */
  component?: string | null
  /** Prompt for these fields in a dialog and send them as the request body (e.g. set password). */
  input?: ActionInput
}

export interface ActionInputField {
  name: string
  label?: I18nKey
  type?: FieldType
  /** Built-in/registered widget id (e.g. 'password'). */
  widget?: string
  required?: boolean
  placeholder?: I18nKey
}

export interface ActionInput {
  fields: ActionInputField[]
  /** Submit button label (defaults to the action label). */
  submitLabel?: I18nKey
}

// ─── Resource ───────────────────────────────────────────────────────────────

export interface ResourceLabel {
  singular: I18nKey
  plural: I18nKey
}

export interface SearchSpec {
  /** Fields included in the OR globalSearch (may use dot-notation). */
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
  /** CRUD verbs + custom actions (replaces v1 permissions + capabilities + actions). */
  capabilities: CapabilitySpec[]
  defaultSort?: SortSpec[]
  /** Field names offered in the list "sort by" control (in order). Falls back to
   *  the sortable list columns. A relation also tie-breaks by the row's title. */
  sortOptions?: string[]
  /** globalSearch config; presence enables the search box. */
  search?: SearchSpec
  /** Available list layouts; when more than one, the UI shows a layout toggle. */
  listLayouts?: ListLayout[]
  /** Default list layout (falls back to the first of listLayouts, else 'table'). */
  defaultListLayout?: ListLayout
  /** Extra fields rendered as labeled info rows on the card layout. */
  cardFields?: string[]
  /** Max columns for the card grid (responsive up to this; default 3). */
  cardColumns?: number
  /** Boolean field marking a record as "featured": card gets an accent ring + star. */
  highlightField?: string
  fields: FieldSpec[]
  views?: ResourceViews
}

// ─── Field ──────────────────────────────────────────────────────────────────

export interface RelationSpec {
  resource: string
  /** Emitted "magre" by the BE (schema-only); kind/foreignKey come from overrides. */
  kind?: 'many-to-one' | 'one-to-many' | 'many-to-many'
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
  /** Restrict the field to one form mode (omitted = both create and edit). */
  visibleOn?: 'create' | 'edit'
  /** Widget id; "auto" or a registered widget/componentId. */
  widget?: string
  /** Section grouping inside the form (e.g. "header", "contract"). */
  group?: string
  colSpan?: number
  placeholder?: I18nKey
  /** Non-binding suggested values for the 'combobox' widget (editable dropdown). */
  suggestions?: Array<string | number>
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
