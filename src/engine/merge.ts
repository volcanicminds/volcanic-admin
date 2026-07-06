/**
 * Generated/overrides merge (ADM-3). The BE emits a `generated` manifest of pure
 * DATA + STRUCTURE (fields = name/type/enum/validation, capabilities); the project
 * keeps a hand-edited `overrides` patch that adds ALL presentation & ordering. They
 * are merged by canonical identity — resources and fields by `name` — so overrides
 * survive a regeneration.
 *
 * Override semantics:
 *  - top-level i18n/auth/tenancy/enums: shallow patch.
 *  - groups: merge by name + append new.
 *  - resources[name]: patch resource props; `fields[name]` deep-merge by name
 *    (intrinsic only); `capabilities[name]` deep-merge by name; `addFields`/
 *    `addCapabilities` append; `exclude*` remove; the ordered view blocks
 *    (`list`/`form`) deep-merge (their arrays are replaced wholesale).
 *  - excludeResources / addResources at the top level.
 */
import type {
  CapabilitySpec,
  EnumOption,
  FieldSpec,
  FormViewSpec,
  GroupSpec,
  ImageSpec,
  ListViewSpec,
  Manifest,
  RelationSpec,
  ResourceSpec,
  ValidationSpec
} from './types/manifest.js'

/** Resource → its field-name union. A generated `GeneratedFieldMap` (emitted by
 *  `volcanic-admin-pull`) satisfies this; pass it to `ManifestOverrides<FM>` for
 *  per-resource field-name autocomplete + typo checking. Defaults keep `string`. */
export type FieldMap = Record<string, string>

type Plain = Record<string, unknown>
const isPlain = (v: unknown): v is Plain =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** Deep-merge plain objects (arrays and scalars are replaced by the source). */
export function deepMerge<T>(target: T, source: Partial<T> | undefined): T {
  if (!source) return target
  if (!isPlain(target) || !isPlain(source)) return (source as T) ?? target
  const out: Plain = { ...target }
  for (const [k, v] of Object.entries(source)) {
    out[k] = isPlain(v) && isPlain(out[k]) ? deepMerge(out[k], v as Plain) : v
  }
  return out as T
}

/** A field patch — intrinsic (data/structure) only. Presentation & ordering live
 *  in the resource `list`/`form` view blocks, never on the field. */
export interface FieldOverride
  extends Partial<Omit<FieldSpec, 'name' | 'relation' | 'image' | 'validation'>> {
  relation?: Partial<RelationSpec>
  image?: Partial<ImageSpec>
  validation?: ValidationSpec
}
export type CapabilityOverride = Partial<CapabilitySpec>

export interface ResourceOverride<F extends string = string>
  extends Partial<
    Omit<
      ResourceSpec,
      'name' | 'fields' | 'capabilities' | 'list' | 'form' | 'titleField' | 'subtitleField' | 'documentTitle'
    >
  > {
  /** Display field(s) for titles/references. */
  titleField?: F | F[]
  /** Secondary display field(s). */
  subtitleField?: F | F[]
  /** Field(s) for the browser tab title on detail pages (defaults to titleField). */
  documentTitle?: F | F[]
  /** Patch fields by name (deep-merge; intrinsic only). */
  fields?: Partial<Record<F, FieldOverride>>
  /** Add fields absent from the generated manifest. */
  addFields?: FieldSpec[]
  /** Field names to remove. */
  excludeFields?: F[]
  /** Patch capabilities by name (deep-merge); unknown names are added. */
  capabilities?: Record<string, CapabilityOverride>
  /** Capability names to remove. */
  excludeCapabilities?: string[]
  /** Ordered collection view (table + card). */
  list?: ListViewSpec<F>
  /** Ordered form/show view. */
  form?: FormViewSpec<F>
}

/** Global card-grid defaults, applied to every resource with a card layout that
 *  doesn't set its own card sizing. */
export interface CardDefaults {
  cardColumns?: number
  cardMinWidth?: number
  cardMaxWidth?: number
}

export interface ManifestOverrides<FM extends FieldMap = FieldMap> {
  i18n?: Partial<Manifest['i18n']>
  auth?: Partial<Manifest['auth']>
  tenancy?: Partial<Manifest['tenancy']>
  enums?: Record<string, EnumOption[]>
  /** Patch/extend sidebar groups (by name). */
  groups?: GroupSpec[]
  /** Card-grid defaults for resources that don't define their own card sizing. */
  cardDefaults?: CardDefaults
  /** Patch resources by name — each keyed to its own field-name union via `FM`. */
  resources?: { [R in keyof FM]?: ResourceOverride<Extract<FM[R], string>> }
  /** Add resources absent from the generated manifest. */
  addResources?: ResourceSpec[]
  /** Resource names to exclude from the panel. */
  excludeResources?: Array<Extract<keyof FM, string>>
}

function mergeGroups(base: GroupSpec[], over: GroupSpec[]): GroupSpec[] {
  const out = base.map((g) => ({ ...g }))
  for (const g of over) {
    const i = out.findIndex((x) => x.name === g.name)
    if (i >= 0) out[i] = deepMerge(out[i], g)
    else out.push(g)
  }
  return out
}

function applyResourceOverride(r: ResourceSpec, ov: ResourceOverride): ResourceSpec {
  const { fields, addFields, excludeFields, capabilities, excludeCapabilities, list, form, ...rest } =
    ov
  const next = deepMerge(r, rest as Partial<ResourceSpec>)

  // fields by name (intrinsic deep-merge)
  let nextFields = r.fields
  if (excludeFields?.length) {
    const ex = new Set(excludeFields)
    nextFields = nextFields.filter((f) => !ex.has(f.name))
  }
  if (fields) {
    nextFields = nextFields.map((f) =>
      fields[f.name] ? deepMerge(f, fields[f.name] as Partial<FieldSpec>) : f
    )
  }
  if (addFields?.length) nextFields = [...nextFields, ...addFields]
  next.fields = nextFields

  // capabilities by name
  let nextCaps = r.capabilities
  if (excludeCapabilities?.length) {
    const ex = new Set(excludeCapabilities)
    nextCaps = nextCaps.filter((c) => !ex.has(c.name))
  }
  if (capabilities) {
    nextCaps = nextCaps.map((c) => (capabilities[c.name] ? deepMerge(c, capabilities[c.name]) : c))
    for (const [name, patch] of Object.entries(capabilities)) {
      if (!nextCaps.some((c) => c.name === name)) nextCaps.push({ name, ...patch } as CapabilitySpec)
    }
  }
  next.capabilities = nextCaps

  // ordered view blocks: deep-merge scalars, replace arrays (columns/groups/…).
  if (list) next.list = deepMerge(r.list ?? {}, list)
  if (form) next.form = deepMerge(r.form ?? {}, form)

  return next
}

export function mergeManifest(generated: Manifest, overrides?: ManifestOverrides<FieldMap>): Manifest {
  if (!overrides) return generated
  const m: Manifest = { ...generated }

  if (overrides.i18n) m.i18n = { ...m.i18n, ...overrides.i18n }
  if (overrides.auth) m.auth = deepMerge(m.auth, overrides.auth)
  if (overrides.tenancy) m.tenancy = { ...m.tenancy, ...overrides.tenancy }
  if (overrides.enums) m.enums = { ...m.enums, ...overrides.enums }
  if (overrides.groups) m.groups = mergeGroups(m.groups, overrides.groups)

  let resources = m.resources
  if (overrides.excludeResources?.length) {
    const ex = new Set(overrides.excludeResources)
    resources = resources.filter((r) => !ex.has(r.name))
  }
  if (overrides.resources) {
    // Field names are string-typed at runtime; the generic keys are an authoring aid.
    const ov = overrides.resources as Record<string, ResourceOverride>
    resources = resources.map((r) => (ov[r.name] ? applyResourceOverride(r, ov[r.name]) : r))
  }
  if (overrides.addResources?.length) resources = [...resources, ...overrides.addResources]

  if (overrides.cardDefaults) {
    const d = overrides.cardDefaults
    resources = resources.map((r) => {
      const hasCard = r.list?.layouts?.includes('card') || r.list?.card != null
      if (!hasCard) return r
      const card = { ...(r.list?.card ?? {}) }
      // Only fill sizing when the resource defines none of its own.
      if (card.columns == null && card.minWidth == null && card.maxWidth == null) {
        if (d.cardColumns != null) card.columns = d.cardColumns
        if (d.cardMinWidth != null) card.minWidth = d.cardMinWidth
        if (d.cardMaxWidth != null) card.maxWidth = d.cardMaxWidth
      }
      return { ...r, list: { ...(r.list ?? {}), card } }
    })
  }
  m.resources = resources

  return m
}
