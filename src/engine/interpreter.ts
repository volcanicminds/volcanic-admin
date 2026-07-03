/**
 * Manifest interpreter — turns a Manifest into a normalized AdminModel and the
 * Refine `resources` array. Pure, no React, no UI dependency.
 *
 * Presentation & ordering come from the resource view blocks (`list`/`form`,
 * populated from overrides). When a block is present its array IS the order and
 * the authoritative allowlist; when absent the engine derives a default from the
 * resource fields (schema order). Field refs that don't resolve are skipped.
 */
import type {
  Manifest,
  ResourceSpec,
  FieldSpec,
  EnumOption,
  CrudAction,
  ListLayout
} from './types/manifest.js'
import type {
  AdminModel,
  ResourceModel,
  ResolvedField,
  ColumnModel,
  CardModel,
  CardBodyModel,
  FormSection
} from './types/model.js'
import type { IResourceItem } from '@refinedev/core'

/** Types that don't belong in a table column / are non-tabular by default. */
const HEAVY_TYPES = ['text', 'richtext', 'json', 'image', 'file']

function clampColumns(n: number | undefined): number {
  const v = Math.round(n ?? 2)
  return Math.min(4, Math.max(1, Number.isFinite(v) ? v : 2))
}

function resolveField(field: FieldSpec, enums: Manifest['enums']): ResolvedField {
  let options: EnumOption[] | undefined
  if (field.type === 'enum') {
    options = field.enum ?? (field.enumRef ? enums[field.enumRef] : undefined)
  }
  return { ...field, options }
}

/** Table columns from the `list.table.columns` block, else derived from fields. */
function buildColumns(spec: ResourceSpec, byName: Map<string, ResolvedField>): ColumnModel[] {
  const cols = spec.list?.table?.columns
  if (cols) {
    return cols
      .map((c): ColumnModel | null => {
        const field = byName.get(c.field)
        if (!field) return null
        return { field, label: c.label, align: c.align, width: c.width }
      })
      .filter((c): c is ColumnModel => c !== null)
  }
  // Derived default: non-heavy, non-write-only fields in declaration order.
  return [...byName.values()]
    .filter((f) => !HEAVY_TYPES.includes(f.type) && !f.writeOnly)
    .map((field) => ({ field }))
}

/** Card layout from the `list.card` block, with slot fallbacks. */
function buildCard(
  spec: ResourceSpec,
  byName: Map<string, ResolvedField>,
  columns: ColumnModel[]
): CardModel {
  const c = spec.list?.card ?? {}
  const imageName = c.image ?? [...byName.values()].find((f) => f.type === 'image')?.name
  const image = imageName ? byName.get(imageName) : undefined

  // Badges: explicit names, else the enum fields already shown as columns.
  const badges = c.badges
    ? c.badges.map((n) => byName.get(n)).filter((f): f is ResolvedField => Boolean(f))
    : columns.map((col) => col.field).filter((f) => f.type === 'enum')

  const body = (c.body ?? [])
    .map((b): CardBodyModel | null => {
      const field = byName.get(b.field)
      return field ? { field, label: b.label } : null
    })
    .filter((b): b is CardBodyModel => b !== null)

  return {
    minWidth: c.minWidth,
    maxWidth: c.maxWidth,
    columns: c.columns,
    align: c.align,
    highlight: c.highlight,
    image,
    title: c.title ?? spec.titleField ?? 'name',
    subtitle: c.subtitle ?? spec.subtitleField,
    badges,
    body
  }
}

/** Form sections from the `form.groups` block, else a single default section. */
function buildFormSections(spec: ResourceSpec, byName: Map<string, ResolvedField>): FormSection[] {
  const groups = spec.form?.groups
  if (!groups) {
    // No explicit form: every field in one headerless section, declaration order.
    return [{ group: 'default', fields: [...byName.values()] }]
  }
  return groups.map((g) => ({
    group: g.name,
    label: g.label,
    columns: g.columns,
    fields: g.fields
      .map((entry): ResolvedField | null => {
        const base = byName.get(entry.field)
        if (!base) return null
        // Overlay the per-form presentation onto a clone so widgets keep reading
        // `field.form?.*` and the per-view label wins for this entry.
        return {
          ...base,
          label: entry.label ?? base.label,
          form: {
            widget: entry.widget,
            colSpan: entry.colSpan,
            colStart: entry.colStart,
            rowSpan: entry.rowSpan,
            visibleOn: entry.visibleOn,
            placeholder: entry.placeholder,
            suggestions: entry.suggestions
          }
        }
      })
      .filter((f): f is ResolvedField => f !== null)
  }))
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

  const columns = buildColumns(spec, byName)
  const card = buildCard(spec, byName, columns)
  const formSections = buildFormSections(spec, byName)

  const layouts: ListLayout[] = spec.list?.layouts ?? ['table']
  const defaultLayout: ListLayout = spec.list?.defaultLayout ?? layouts[0] ?? 'table'

  // Sort options: explicit `list.sort`, else the sortable, tabular fields.
  const sortNames = spec.list?.sort ?? columns.map((col) => col.field.name)
  const sortFields = sortNames
    .map((n) => byName.get(n))
    .filter((f): f is ResolvedField => Boolean(f))
    .filter((f) => (f.sortable ?? true) && !['json', 'image', 'file'].includes(f.type))

  const filterFields = fields.filter((f) => f.filterable)

  // v2: capabilities is a single array of CRUD verbs + custom actions.
  const caps = spec.capabilities ?? []
  const crud = (action: CrudAction) => caps.find((c) => c.kind === action && c.enabled !== false)

  return {
    spec,
    fields,
    columns,
    card,
    formSections,
    list: { layouts, defaultLayout },
    formColumns: clampColumns(spec.form?.columns),
    sortFields,
    filterFields,
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
