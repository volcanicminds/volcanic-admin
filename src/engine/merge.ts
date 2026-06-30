/**
 * Generated/overrides merge (ADM-3). The BE emits a `generated` manifest;
 * the project keeps a hand-edited `overrides` patch. They are merged by canonical
 * identity — resources and fields by `name` — so overrides survive a regeneration.
 *
 * Override semantics:
 *  - top-level i18n/auth/tenancy/enums: shallow patch.
 *  - groups: merge by name + append new.
 *  - resources[name]: patch resource props; `fields[name]`/`capabilities[name]`
 *    deep-merge by name; `addFields`/`addCapabilities` append; `exclude*` remove.
 *  - excludeResources / addResources at the top level.
 */
import type {
  CapabilitySpec,
  EnumOption,
  FieldFormSpec,
  FieldListSpec,
  FieldSpec,
  GroupSpec,
  ImageSpec,
  Manifest,
  RelationSpec,
  ResourceSpec,
  ValidationSpec
} from './types/manifest.js'

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

/** A field patch — nested specs are partial so you can fill just kind/foreignKey, etc. */
export interface FieldOverride
  extends Partial<Omit<FieldSpec, 'name' | 'relation' | 'image' | 'validation' | 'list' | 'form'>> {
  relation?: Partial<RelationSpec>
  image?: Partial<ImageSpec>
  validation?: ValidationSpec
  list?: FieldListSpec
  form?: FieldFormSpec
}
export type CapabilityOverride = Partial<CapabilitySpec>

export interface ResourceOverride
  extends Partial<Omit<ResourceSpec, 'name' | 'fields' | 'capabilities'>> {
  /** Patch fields by name (deep-merge). */
  fields?: Record<string, FieldOverride>
  /** Add fields absent from the generated manifest. */
  addFields?: FieldSpec[]
  /** Field names to remove. */
  excludeFields?: string[]
  /** Patch capabilities by name (deep-merge); unknown names are added. */
  capabilities?: Record<string, CapabilityOverride>
  /** Capability names to remove. */
  excludeCapabilities?: string[]
}

/** Global card-grid defaults, applied to every resource that doesn't set its own
 *  card layout (cardColumns / cardMinWidth / cardMaxWidth). */
export interface CardDefaults {
  cardColumns?: number
  cardMinWidth?: number
  cardMaxWidth?: number
}

export interface ManifestOverrides {
  i18n?: Partial<Manifest['i18n']>
  auth?: Partial<Manifest['auth']>
  tenancy?: Partial<Manifest['tenancy']>
  enums?: Record<string, EnumOption[]>
  /** Patch/extend sidebar groups (by name). */
  groups?: GroupSpec[]
  /** Card-grid defaults for resources that don't define their own. */
  cardDefaults?: CardDefaults
  /** Patch resources by name. */
  resources?: Record<string, ResourceOverride>
  /** Add resources absent from the generated manifest. */
  addResources?: ResourceSpec[]
  /** Resource names to exclude from the panel. */
  excludeResources?: string[]
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
  const { fields, addFields, excludeFields, capabilities, excludeCapabilities, ...rest } = ov
  const next = deepMerge(r, rest as Partial<ResourceSpec>)

  // fields by name
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

  return next
}

export function mergeManifest(generated: Manifest, overrides?: ManifestOverrides): Manifest {
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
    const ov = overrides.resources
    resources = resources.map((r) => (ov[r.name] ? applyResourceOverride(r, ov[r.name]) : r))
  }
  if (overrides.addResources?.length) resources = [...resources, ...overrides.addResources]

  if (overrides.cardDefaults) {
    const d = overrides.cardDefaults
    resources = resources.map((r) =>
      r.cardColumns != null || r.cardMinWidth != null || r.cardMaxWidth != null
        ? r // resource defines its own card layout — leave it
        : {
            ...r,
            ...(d.cardColumns != null && { cardColumns: d.cardColumns }),
            ...(d.cardMinWidth != null && { cardMinWidth: d.cardMinWidth }),
            ...(d.cardMaxWidth != null && { cardMaxWidth: d.cardMaxWidth })
          }
    )
  }
  m.resources = resources

  return m
}
