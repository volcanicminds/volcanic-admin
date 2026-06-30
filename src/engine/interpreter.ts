/**
 * Manifest interpreter — turns a Manifest into a normalized AdminModel and the
 * Refine `resources` array. Pure, no React, no UI dependency.
 */
import type { Manifest, ResourceSpec, FieldSpec, EnumOption, CrudAction } from './types/manifest.js'
import type { AdminModel, ResourceModel, ResolvedField, FormSection } from './types/model.js'
import type { IResourceItem } from '@refinedev/core'

function resolveField(field: FieldSpec, enums: Manifest['enums']): ResolvedField {
  let options: EnumOption[] | undefined
  if (field.type === 'enum') {
    options = field.enum ?? (field.enumRef ? enums[field.enumRef] : undefined)
  }
  return { ...field, options }
}

/** A field shows in the list table unless explicitly hidden; heavy types hidden by default. */
function isListVisible(field: ResolvedField): boolean {
  if (field.list?.visible !== undefined) return field.list.visible
  return !['text', 'richtext', 'json', 'image', 'file'].includes(field.type)
}

/** A field shows in the form unless explicitly hidden. */
function isFormVisible(field: ResolvedField): boolean {
  if (field.form?.visible !== undefined) return field.form.visible
  return true
}

function buildFormSections(fields: ResolvedField[]): FormSection[] {
  const order: string[] = []
  const byGroup = new Map<string, ResolvedField[]>()
  for (const f of fields) {
    if (!isFormVisible(f)) continue
    const group = f.form?.group ?? 'default'
    if (!byGroup.has(group)) {
      byGroup.set(group, [])
      order.push(group)
    }
    byGroup.get(group)!.push(f)
  }
  return order.map((group) => ({ group, fields: byGroup.get(group)! }))
}

function buildResourceModel(spec: ResourceSpec, manifest: Manifest): ResourceModel {
  const resolved = spec.fields.map((f) => resolveField(f, manifest.enums))
  const resolvedByName = new Map(resolved.map((f) => [f.name, f]))

  // A relation is displayed via its expanded object (output-only → the generator
  // marks it readOnly) but edited through its foreign key. Inherit writability and
  // required from that FK so the relation field is editable, submits, and shows the
  // required marker — otherwise the FK is silently dropped from the payload.
  const fields = resolved.map((f) => {
    if (f.type === 'relation' && f.relation?.foreignKey) {
      const fk = resolvedByName.get(f.relation.foreignKey)
      if (fk) return { ...f, readOnly: fk.readOnly ?? false, required: f.required || fk.required }
    }
    // Image/file fields with dedicated endpoints are edited out-of-band (their own
    // upload/remove routes, not the body), so an output-only schema must not render
    // them read-only/disabled. They are also excluded from the form payload (AutoForm).
    if ((f.type === 'image' || f.type === 'file') && f.image?.endpoints?.upload) {
      return { ...f, readOnly: false }
    }
    return f
  })
  const byName = new Map(fields.map((f) => [f.name, f]))
  const listFields = fields.filter(isListVisible)
  const formSections = buildFormSections(fields)

  // v2: capabilities is a single array of CRUD verbs + custom actions.
  const caps = spec.capabilities ?? []
  const crud = (action: CrudAction) => caps.find((c) => c.kind === action && c.enabled !== false)

  return {
    spec,
    fields,
    listFields,
    formSections,
    field: (name) => byName.get(name),
    // The manifest is already role-filtered server-side; presence of the capability
    // signals the action is available to this user.
    hasAction: (action) => !!crud(action),
    roles: (action) => crud(action)?.roles,
    actions: caps.filter((c) => c.kind === 'action' && c.enabled !== false)
  }
}

export function interpretManifest(manifest: Manifest): AdminModel {
  // Lightweight runtime guard: the contract is Manifest v2 (full validation against
  // manifest.v2.schema.json runs at build time via scripts/validate-manifest.mjs).
  if (manifest?.version !== 2) {
    console.warn(`[volcanic-admin] expected Manifest v2, got version=${(manifest as { version?: unknown })?.version}`)
  }
  const resources = manifest.resources.map((r) => buildResourceModel(r, manifest))
  const byName = new Map(resources.map((r) => [r.spec.name, r]))

  return {
    manifest,
    resources,
    resource: (name) => byName.get(name),
    enum: (ref) => manifest.enums[ref]
  }
}

/**
 * Build the Refine `resources` array from the model. Singletons expose only an
 * edit screen (no list/create); regular resources expose the full CRUD set.
 * Routes are sorted by group order then resource order for sidebar coherence.
 */
export function toRefineResources(model: AdminModel): IResourceItem[] {
  const groupOrder = new Map(model.manifest.groups.map((g, i) => [g.name, g.order ?? i * 10]))

  const sorted = [...model.resources].sort((a, b) => {
    const ga = groupOrder.get(a.spec.group ?? '') ?? 999
    const gb = groupOrder.get(b.spec.group ?? '') ?? 999
    if (ga !== gb) return ga - gb
    return (a.spec.order ?? 0) - (b.spec.order ?? 0)
  })

  return sorted.map((r) => {
    const { spec } = r
    if (spec.singleton) {
      return {
        name: spec.name,
        edit: `/${spec.path}`,
        meta: {
          label: spec.label.plural,
          icon: spec.icon,
          parent: spec.group,
          singleton: true,
          canDelete: false
        }
      }
    }
    return {
      name: spec.name,
      list: `/${spec.path}`,
      create: r.hasAction('create') ? `/${spec.path}/create` : undefined,
      edit: r.hasAction('update') ? `/${spec.path}/edit/:id` : undefined,
      show: `/${spec.path}/show/:id`,
      meta: {
        label: spec.label.plural,
        icon: spec.icon,
        parent: spec.group,
        canDelete: r.hasAction('delete')
      }
    }
  })
}
