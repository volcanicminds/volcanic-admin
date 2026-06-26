/**
 * Manifest interpreter — turns a Manifest into a normalized AdminModel and the
 * Refine `resources` array. Pure, no React, no UI dependency.
 */
import type { Manifest, ResourceSpec, FieldSpec, EnumOption } from './types/manifest.js'
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
  const fields = spec.fields.map((f) => resolveField(f, manifest.enums))
  const byName = new Map(fields.map((f) => [f.name, f]))
  const listFields = fields.filter(isListVisible)
  const formSections = buildFormSections(fields)

  return {
    spec,
    fields,
    listFields,
    formSections,
    field: (name) => byName.get(name),
    hasAction(action) {
      // The manifest is already role-filtered server-side; presence of permission
      // entry (or capability) signals the action is available to this user.
      const perm = spec.permissions?.[action]
      if (perm) return perm.length > 0
      // Fallback: derive from capabilities for write actions.
      const caps = spec.capabilities
      if (action === 'create') return caps?.create ?? true
      if (action === 'update') return caps?.update ?? true
      if (action === 'delete') return caps?.delete ?? true
      return true
    }
  }
}

export function interpretManifest(manifest: Manifest): AdminModel {
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
