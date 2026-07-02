/**
 * Interpreted resource model — the engine's normalized view over the manifest.
 * The UI consumes this (not the raw manifest): enums are resolved and the ordered
 * view blocks (table columns, card slots, form sections) are precomputed from the
 * resource `list`/`form` specs, with sensible fallbacks when a block is absent.
 */
import type {
  CapabilitySpec,
  CrudAction,
  EnumOption,
  FieldSpec,
  FieldFormSpec,
  I18nKey,
  ListLayout,
  Manifest,
  ResourceSpec,
  ActionKind
} from './manifest.js'

export interface ResolvedField extends FieldSpec {
  /** Enum options resolved from inline `enum` or `enumRef`. */
  options?: EnumOption[]
  /** Resolved form presentation (set on the per-form-entry clone). */
  form?: FieldFormSpec
}

/** A table column: the resolved field + its per-view presentation. */
export interface ColumnModel {
  field: ResolvedField
  /** Per-view header label (falls back to the field label / i18n convention). */
  label?: I18nKey
  align?: 'left' | 'center' | 'right'
  width?: number
}

/** A labeled key/value row in the card body. */
export interface CardBodyModel {
  field: ResolvedField
  label?: I18nKey
}

/** Resolved card layout: physical grid + the field slots. */
export interface CardModel {
  minWidth?: number
  maxWidth?: number
  columns?: number
  align?: 'left' | 'center'
  /** Boolean field name driving the "featured" ring/star. */
  highlight?: string
  /** Image field rendered as the card carousel (first image field by default). */
  image?: ResolvedField
  /** Title field name(s) (resource titleField by default; array → joined). */
  title: string | string[]
  /** Subtitle field name(s) (resource subtitleField by default; array → joined). */
  subtitle?: string | string[]
  badges: ResolvedField[]
  body: CardBodyModel[]
}

export interface FormSection {
  /** Group key; 'default' when the resource has no explicit form groups. */
  group: string
  /** Group header label (falls back to `group.<group>`). */
  label?: I18nKey
  /** Column count for this section's grid (falls back to the form default). */
  columns?: number
  /** Fields in order; each carries its resolved `.form` presentation + label. */
  fields: ResolvedField[]
}

/** Resolved collection-view config (layouts + default). */
export interface ListConfig {
  layouts: ListLayout[]
  defaultLayout: ListLayout
}

export interface ResourceModel {
  spec: ResourceSpec
  /** All fields, enums resolved (base instances — no per-view presentation). */
  fields: ResolvedField[]
  /** Ordered table columns. */
  columns: ColumnModel[]
  /** Resolved card layout. */
  card: CardModel
  /** Form/show sections, ordered. */
  formSections: FormSection[]
  /** Collection layouts + default. */
  list: ListConfig
  /** Default form grid column count (1–4). */
  formColumns: number
  /** Fields offered in the "sort by" control, in order. */
  sortFields: ResolvedField[]
  /** Filterable fields (semantic capability). */
  filterFields: ResolvedField[]
  field(name: string): ResolvedField | undefined
  /** True when an enabled CRUD capability of this kind exists (v2). */
  hasAction(action: CrudAction): boolean
  /** Declared roles for a CRUD capability (v2), or undefined if absent. */
  roles(action: CrudAction): string[] | undefined
  /** Custom action capabilities (kind:'action'), enabled only. */
  actions: CapabilitySpec[]
}

export interface AdminModel {
  manifest: Manifest
  resources: ResourceModel[]
  resource(name: string): ResourceModel | undefined
  /** Resolve a shared enum by name. */
  enum(ref: string): EnumOption[] | undefined
}

export type { ActionKind }
