/**
 * Volcanic Admin — Manifest spec v2.
 *
 * The manifest is the single source of truth for the admin UI. It is emitted by
 * the backend (`GET /admin/manifest`) and interpreted by the engine. Every
 * human-facing label is an i18n KEY, never literal text.
 *
 * Contract: docs/ARCHITECTURE.md §2 + manifest.v2.schema.json. v2 unifies the v1
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
  | 'textarea'
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

// ─── Ordered view blocks ──────────────────────────────────────────────────────
//
// Presentation & ordering live in ordered view blocks, authored in the project
// overrides — the BE never emits them (it emits only data/structure). The array
// order IS the render order, and (when present) the array is the authoritative
// allowlist: a field not listed does not appear in that view. When a block is
// absent the engine derives a sensible default from the resource fields.
//
// The `F` type param is the resource's field-name union. It defaults to `string`
// (loose), so the runtime `ResourceSpec` and un-typed overrides keep working; the
// project overrides opt into per-resource field-name checking by passing a
// generated field map to `ManifestOverrides<FM>` (see manifest.generated.ts).

/** A table column: references a field by name + table-only presentation. */
export interface ColumnSpec<F extends string = string> {
  field: F
  /** Per-view label override (falls back to the field label / i18n convention). */
  label?: I18nKey
  align?: 'left' | 'center' | 'right'
  width?: number
}

export interface TableViewSpec<F extends string = string> {
  /** Ordered allowlist of columns. Absent → derive from the resource fields. */
  columns?: ColumnSpec<F>[]
}

/** A labeled key/value row in the card body (ex `cardFields`). */
export interface CardBodySpec<F extends string = string> {
  field: F
  label?: I18nKey
}

export interface CardViewSpec<F extends string = string> {
  /** Fluid grid: cards auto-fill/wrap at min..max px (maxWidth enables fluid mode). */
  minWidth?: number
  maxWidth?: number
  /** Fixed-column grid (used when maxWidth is unset; responsive up to this). */
  columns?: number
  /** Card content alignment: 'left' (default) or 'center' (e.g. logo grids). */
  align?: 'left' | 'center'
  /** Boolean field marking a record "featured": accent ring + star. */
  highlight?: F
  /** Field slots (names). Omitted → sensible default (image → first image field,
   *  title → titleField, subtitle → subtitleField). title/subtitle accept an array
   *  of field names (joined with spaces) for composite labels. */
  image?: F
  title?: F | F[]
  subtitle?: F | F[]
  /** Enum fields rendered as chips, in order. */
  badges?: F[]
  /** Extra labeled info rows, in order. */
  body?: CardBodySpec<F>[]
}

/** Collection view: shared toolbar (search/sort/filter) + table & card layouts. */
export interface ListViewSpec<F extends string = string> {
  /** Available layouts; more than one shows a layout toggle. */
  layouts?: ListLayout[]
  /** Default layout (falls back to the first of `layouts`, else 'table'). */
  defaultLayout?: ListLayout
  /** Field names offered in the "sort by" control, in order. A relation
   *  tie-breaks by the row's title. Absent → the sortable fields. */
  sort?: F[]
  table?: TableViewSpec<F>
  card?: CardViewSpec<F>
}

/**
 * Toolbar actions of the built-in rich-text widget (see FormFieldSpec.toolbar).
 * Each one is implemented by the widget and, crucially, must survive the server's
 * HTML sanitizer — offering an action whose markup the server strips loses the
 * author's work silently.
 */
export type RichTextAction =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'h2'
  | 'h3'
  | 'bulletList'
  | 'orderedList'
  | 'blockquote'
  | 'link'
  | 'clearFormat'
  | 'undo'
  | 'redo'

/** A field placed in a form group: references a field + form-only presentation. */
export interface FormFieldSpec<F extends string = string> {
  field: F
  label?: I18nKey
  /** Widget id; "auto" or a registered widget/componentId. */
  widget?: string
  colSpan?: number
  /** Force the field to start at this 1-based grid column (md+). Leaves the cells
   *  before it on the current row empty and, if that column is already taken, moves
   *  the field to the next row — used to break rows / align columns deliberately. */
  colStart?: number
  /** Make the field span this many grid rows (md+) — e.g. a tall textarea sitting
   *  beside several stacked single-row fields in another column. */
  rowSpan?: number
  /** Restrict to one form mode (omitted = both create and edit). */
  visibleOn?: 'create' | 'edit'
  placeholder?: I18nKey
  /** Non-binding suggestions for the 'combobox' widget (editable dropdown). */
  suggestions?: Array<string | number>
  /** Visible text rows for the 'textarea'/'richtext' widgets — the editing height
   *  of the field, independent of `rowSpan` (which is grid cells). Raise it where
   *  the text IS the record (an article body), lower it for an incidental note. */
  rows?: number
  /** Toolbar actions for the 'richtext' widget, e.g. `['bold', 'italic', 'link']`.
   *  Unset = all of them; unknown ids are ignored. Rendering follows the widget's
   *  own group order, not this array's. See RichTextAction. */
  toolbar?: RichTextAction[]
}

export interface FormGroupSpec<F extends string = string> {
  name: string
  /** Group header label (falls back to `group.<name>`). */
  label?: I18nKey
  /** Column count for this group's grid (overrides the form default). */
  columns?: number
  /** Ordered fields (the array is the authoritative allowlist for this group). */
  fields: FormFieldSpec<F>[]
}

/** Form (create/edit) + show view. */
export interface FormViewSpec<F extends string = string> {
  /** Default column count for group grids (1–4, default 2). Image/richtext and
   *  colSpan>1 fields still span the full row. */
  columns?: number
  groups?: FormGroupSpec<F>[]
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
  /** Field(s) that build the browser tab title on detail pages (show/edit),
   *  joined with spaces and prefixed by the singular label — e.g. `['brand','name']`
   *  → "Vehicle BMW 320". Relation fields resolve to their `titleField`. Falls
   *  back to `titleField` when unset; a record with no usable value shows just the
   *  singular label. */
  documentTitle?: string | string[]
  tenantScoped?: boolean
  softDelete?: boolean
  singleton?: boolean
  /** CRUD verbs + custom actions (replaces v1 permissions + capabilities + actions). */
  capabilities: CapabilitySpec[]
  defaultSort?: SortSpec[]
  /** globalSearch config; presence enables the search box. */
  search?: SearchSpec
  /** Show a "Clone" button on the detail view (opens create pre-filled). Defaults
   *  to true wherever the resource supports create; set false to hide it. */
  clonable?: boolean
  /** Field values to force on a cloned record, overriding the copied values (e.g.
   *  `{ status: 'draft' }` so a clone never inherits a published/archived state).
   *  Keys are form field names — the foreign key for relations. */
  cloneReset?: Record<string, unknown>
  /** Ordered collection view (table + card). Populated from overrides. */
  list?: ListViewSpec
  /** Ordered form/show view. Populated from overrides. */
  form?: FormViewSpec
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
  /** How previews fit their box: 'cover' fills/crops (photos, default), 'contain'
   *  shows the whole image with padding (logos/icons). */
  fit?: 'cover' | 'contain'
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

/**
 * Resolved form presentation. NOT authored on the field — the interpreter populates
 * it per-entry from the `form.groups[].fields` view block, so form widgets keep
 * reading `field.form?.widget` etc. unchanged.
 */
export interface FieldFormSpec {
  /** Restrict the field to one form mode (omitted = both create and edit). */
  visibleOn?: 'create' | 'edit'
  /** Widget id; "auto" or a registered widget/componentId. */
  widget?: string
  colSpan?: number
  /** 1-based grid column the field is forced to start at (see FormFieldSpec.colStart). */
  colStart?: number
  /** Grid rows the field spans (see FormFieldSpec.rowSpan). */
  rowSpan?: number
  placeholder?: I18nKey
  /** Non-binding suggested values for the 'combobox' widget (editable dropdown). */
  suggestions?: Array<string | number>
  /** Visible text rows for the 'textarea'/'richtext' widgets (see FormFieldSpec.rows). */
  rows?: number
  /** Toolbar actions for the 'richtext' widget (see FormFieldSpec.toolbar). */
  toolbar?: RichTextAction[]
}

/**
 * Field = DATA + STRUCTURE only (the BE emits exactly this; see be-data-only
 * principle). Presentation and ordering live in the resource view blocks
 * (`list`/`form`), never here. The only view-adjacent props kept here are the
 * *semantic capabilities* (filterable/sortable/operators) — they describe what the
 * field can do, shared by table, card and filters alike.
 */
export interface FieldSpec {
  name: string
  type: FieldType
  label?: I18nKey
  required?: boolean
  readOnly?: boolean
  /** Write-only (present in the write body, never read/listed) — e.g. password.
   *  Excluded from table columns and bulk export/import. */
  writeOnly?: boolean
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
  // ── semantic collection capabilities (shared table + card + filters) ──
  filterable?: boolean
  sortable?: boolean
  operators?: FilterOperator[]
}
