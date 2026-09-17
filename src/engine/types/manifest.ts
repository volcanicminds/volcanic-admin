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

/**
 * Field primitive types (§2.4).
 *
 * The backend generator infers only what a JSON Schema can say: `string`, `integer`, `number`,
 * `boolean`, `date`, `datetime`, `enum`, `email`, `url`, `uuid`, `json`. The other members arrive
 * from overrides alone, because nothing in a schema tells them apart from a plain string or object:
 * `text`, `textarea` and `richtext` are presentations of a string, `relation` needs the target
 * resource and its foreign key, `image` and `file` need their upload endpoints (`image.endpoints`).
 * Kept identical to `FieldType` in the backend generator and to `manifest.v2.schema.json` (T-10.17).
 */
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
  // Array columns (Postgres `text[]`): overlap = "any of", arrayContains = "all of".
  | 'overlap'
  | 'arrayContains'

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
    /**
     * The plane this manifest describes (T-10.14): a customer's console (`tenant`) or the
     * platform's (`control`). Absent in manifests from backends that predate it.
     */
    plane?: 'tenant' | 'control'
    endpoints: {
      login: string
      refresh: string
      logout: string
      [key: string]: string
    }
  }
  tenancy: {
    mode: 'single' | 'multi'
    /**
     * A tenant switcher under the session. A v5 backend emits `false`: the token binds the tenant
     * from the login on (T-10.15), so a different tenant is a new login.
     */
    switchable?: boolean
    /** The header a console must send the tenant in; absent where none is read. */
    header?: string
    /** Tenant list for a switcher. No longer emitted by v5 backends. */
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
  /**
   * Section this option belongs to, for widgets that present a grouped option set
   * (see the `tags` widget). The value IS the group's i18n key, so the group needs
   * no naming convention and no separate label map: grouping is string equality on
   * the key, and the header is `t(group)`.
   *
   * Presentation only — the group is never part of the stored value.
   */
  group?: I18nKey
  /**
   * A `group` key belonging to ANOTHER field's option set, which this option
   * relates to. A widget pairing two enum fields uses it to surface the relevant
   * section first (e.g. picking a blog topic features that topic's tag group).
   * Purely a hint: it must never filter what the user can reach.
   */
  linkedGroup?: I18nKey
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

/**
 * What the 'tags' widget does with text typed by hand instead of picked from the
 * option set (see FormFieldSpec.freeText).
 *
 * - 'verbatim' (default): stored as typed, trimmed. Right when the taxonomy values
 *   are codes the frontend maps to labels — a free tag has no mapping to lose, so
 *   the text IS its label and the chip reads back what the author wrote.
 * - 'slug': lowercased/ASCII-folded, so every stored value stays uniform and safe
 *   in a URL. Costs the author's exact wording.
 * - 'off': only option-set values are accepted; typing something new does nothing.
 */
export type FreeTextMode = 'off' | 'verbatim' | 'slug'

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
  /** Height ceiling in text rows for the 'richtext' widget: past it the editor
   *  scrolls internally instead of growing (see FieldFormSpec.maxRows). */
  maxRows?: number
  /** Toolbar actions for the 'richtext' widget, e.g. `['bold', 'italic', 'link']`.
   *  Unset = all of them; unknown ids are ignored. Rendering follows the widget's
   *  own group order, not this array's. See RichTextAction. */
  toolbar?: RichTextAction[]
  /** Name of a sibling field in the same form whose selected option decides which
   *  option group the 'tags' widget surfaces first (see FieldFormSpec.featureFrom).
   *  Omitted = nothing is ever featured. */
  featureFrom?: F
  /** How the 'tags' widget stores text typed by hand (see FieldFormSpec.freeText). */
  freeText?: FreeTextMode
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

/**
 * Optional client-side downscale + format conversion applied to a picked file
 * BEFORE it is uploaded (see ui/widgets/upload/resize.ts). Off unless `enabled`.
 *
 * It trades a little CPU in the browser for smaller uploads and smaller stored
 * files. It is a convenience, NOT an enforcement: a direct API call still uploads
 * whatever it wants, so any hard limit belongs on the server.
 *
 * A typical storefront gallery: `{ enabled: true, format: 'webp', height: 500,
 * quality: 0.95 }` — one bounded dimension, the other derived from the aspect ratio.
 */
export interface ImageResizeSpec {
  /** Opt-in switch: with this falsy the picked file is uploaded untouched. */
  enabled?: boolean
  /** Output encoding (default 'webp'). */
  format?: 'webp' | 'jpg' | 'png'
  /** Max width in px. With both set, width drives and height follows the ratio. */
  width?: number
  /** Max height in px. */
  height?: number
  /** Encoder quality 0–1 (default 0.95). Ignored by the lossless png path. */
  quality?: number
  /** Resampling passes, 0–4 (default 2): higher = smoother edges, slower. */
  reSample?: number
  /** Sharpening strength (default 0 = off). */
  sharpen?: number
  /** Canvas background, e.g. '#ffffff' to flatten transparency (default transparent). */
  bgColor?: string
  /** Allow enlarging a source smaller than the target box. Default false: a small
   *  image is only ever re-encoded, never blown up. */
  upscale?: boolean
  /** Keep the original when the converted file is not actually smaller. Default true. */
  keepIfLarger?: boolean
  /** Leave files at or below this many bytes untouched (already small enough). */
  skipUnder?: number
}

export interface ImageSpec {
  multiple?: boolean
  ordered?: boolean
  /** How previews fit their box: 'cover' fills/crops (photos, default), 'contain'
   *  shows the whole image with padding (logos/icons). */
  fit?: 'cover' | 'contain'
  /** "first" → first image is the cover (→ coverUrl); "flag" → per-image isCover. */
  cover?: 'first' | 'flag'
  /** Field holding the image's alt text: a sibling column of the record for a single
   *  image, a property of each item for a gallery. Shown as a caption in the
   *  read-only detail and editable in the upload widget. Defaults to 'altView'. */
  altField?: string
  accept?: string[]
  /** Upload size ceiling in bytes, checked AFTER `resize` (what gets sent is what
   *  counts — otherwise a heavy source would be rejected before being shrunk). */
  maxSize?: number
  /** Client-side downscale/convert before upload. Off unless `resize.enabled`. */
  resize?: ImageResizeSpec
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
  /**
   * Height ceiling for the 'richtext' widget, in text rows. Past it the editor
   * scrolls its own content instead of growing the page — which is what keeps the
   * toolbar on screen while writing a long text. Defaults to `rows`, so a declared
   * height behaves like a textarea's `rows` (that height, then scroll).
   */
  maxRows?: number
  /** Toolbar actions for the 'richtext' widget (see FormFieldSpec.toolbar). */
  toolbar?: RichTextAction[]
  /**
   * Name of a sibling field whose current value decides which option group the
   * 'tags' widget surfaces first: the sibling's selected option declares it via
   * `EnumOption.linkedGroup`.
   *
   * Every degenerate case collapses to the same harmless behaviour — no sibling
   * declared, sibling empty, sibling filled AFTER the tags, value outside its own
   * option set, or the very first render before the sibling registers: nothing is
   * featured and the groups list alphabetically. Featuring reorders and marks; it
   * MUST NOT filter, so no option is ever out of reach.
   */
  featureFrom?: string
  /**
   * Resolved options of the `featureFrom` sibling. NOT authored — the interpreter
   * fills it from the same resource's resolved fields, because a widget receives
   * only its own field and `linkedGroup` lives on the sibling's options.
   */
  featureOptions?: EnumOption[]
  /** How the 'tags' widget stores hand-typed text. Default 'verbatim'. */
  freeText?: FreeTextMode
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
  /** The value holds several enum values, not one — a native array column (e.g.
   *  Postgres `text[]`). Renders one badge per value and filters with `overlap`
   *  ("tagged with ANY of") instead of `in`. Pair with the `multiselect` form
   *  widget to edit it. */
  multiple?: boolean
  relation?: RelationSpec
  image?: ImageSpec
  validation?: ValidationSpec
  // ── semantic collection capabilities (shared table + card + filters) ──
  filterable?: boolean
  sortable?: boolean
  operators?: FilterOperator[]
}
