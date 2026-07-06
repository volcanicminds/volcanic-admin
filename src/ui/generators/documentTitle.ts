/**
 * Detail-page browser tab title. The route-level handler in VolcanicAdmin only
 * knows the resource and id, so it can't render record-derived titles; these
 * helpers run inside the record views (show/edit/singleton) where the record is
 * loaded, and set `document.title` from the resource's `documentTitle` config
 * (falling back to `titleField`).
 */
import { useEffect } from 'react'
import { useT } from '@/engine'
import type { ResourceModel } from '@/engine'
import { useAdminConfig } from '@/ui/config'

/** Resolve one configured field against a record, following relations (to their
 *  `titleField`) and dotted paths (`brand.name`). Returns '' when absent. */
function resolvePart(model: ResourceModel, record: Record<string, any>, name: string): string {
  const field = model.field(name)
  if (field?.type === 'relation' && field.relation) {
    // Expanded relation object (list/getOne may nest it) → its title field.
    const nested = record[field.relation.resource] ?? record[field.name]
    if (nested && typeof nested === 'object') {
      const v = nested[field.relation.titleField ?? 'name'] ?? nested.id
      return v == null ? '' : String(v)
    }
    // A denormalized display value carried directly on the record (e.g. the brand
    // name as a plain string) beats the opaque foreign key.
    const direct = record[field.name]
    if (direct != null && typeof direct !== 'object') return String(direct)
    const fk = field.relation.foreignKey ? record[field.relation.foreignKey] : direct
    return fk == null ? '' : String(fk)
  }
  const raw = name.includes('.')
    ? name.split('.').reduce<any>((o, k) => (o == null ? o : o[k]), record)
    : record[name]
  return raw == null ? '' : String(raw)
}

/** Resolve one or more configured fields against a record and join with spaces,
 *  following relations (→ their `titleField`) and dotted paths. This is the single
 *  relation-aware resolver behind every record-derived label — detail H1, card
 *  title/subtitle, and the browser tab title — so a relation never renders as
 *  "[object Object]" or a raw foreign key. */
export function resolveFields(
  model: ResourceModel,
  record: Record<string, any>,
  cfg: string | string[]
): string {
  const parts = Array.isArray(cfg) ? cfg : [cfg]
  return parts
    .map((f) => resolvePart(model, record, f))
    .filter((v) => v !== '')
    .join(' ')
}

/** Build the record-derived part of a detail title from `documentTitle` (falls
 *  back to `titleField`, then `name`). '' when the record yields nothing usable. */
export function buildRecordTitle(model: ResourceModel, record: Record<string, any> | undefined): string {
  if (!record) return ''
  return resolveFields(model, record, model.spec.documentTitle ?? model.spec.titleField ?? 'name')
}

/** Set `document.title` to "<singular label> <record title> · <appName>". Before
 *  the record loads (or when it yields no value) it degrades to just the singular
 *  label, so it never flashes a raw id or key.
 *
 *  Pass `enabled: false` to leave the route-level handler's title untouched — used
 *  by the create form, whose "New <label>" title has no record to derive from. */
export function useRecordDocumentTitle(
  model: ResourceModel,
  record: Record<string, any> | undefined,
  enabled = true
): void {
  const t = useT()
  const { branding } = useAdminConfig()
  const appName = branding?.appName ?? 'Volcanic Admin'
  const label = t(model.spec.label.singular)
  const recordTitle = buildRecordTitle(model, record)
  useEffect(() => {
    if (!enabled) return
    const head = [label, recordTitle].filter(Boolean).join(' ')
    document.title = `${head} · ${appName}`
  }, [enabled, label, recordTitle, appName])
}
