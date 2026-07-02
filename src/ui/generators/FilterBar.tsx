/**
 * Generated list filters. Renders a "Filters" dialog from the manifest's
 * filterable fields and produces Magic Query `CrudFilters` (all AND-combined):
 *   - enum / relation → multi-select (operator `in`)
 *   - boolean         → any / yes / no (operator `eq`)
 *   - number / date   → min/max range (operators `gte`/`lte`)
 * Changes apply live; a badge shows the active filter count.
 */
import { useList } from '@refinedev/core'
import type { CrudFilter, CrudFilters } from '@refinedev/core'
import { Filter } from 'lucide-react'
import { Button } from '@/ui/components/ui/button'
import { Badge } from '@/ui/components/ui/badge'
import { Checkbox } from '@/ui/components/ui/checkbox'
import { Input } from '@/ui/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/ui/components/ui/dialog'
import type { ResolvedField, ResourceModel } from '@/engine'

type Translate = (key?: string, vars?: Record<string, string | number>) => string
export type FilterDraft = Record<string, unknown>

function kindOf(f: ResolvedField): 'multi' | 'relation' | 'bool' | 'range' | null {
  if (f.type === 'relation') return 'relation'
  if (f.type === 'enum') return 'multi'
  if (f.type === 'boolean') return 'bool'
  if (['integer', 'number', 'date', 'datetime'].includes(f.type)) return 'range'
  return null
}

/** Build Magic Query CrudFilters from the structured draft. */
export function toCrudFilters(model: ResourceModel, draft: FilterDraft): CrudFilters {
  const out: CrudFilter[] = []
  for (const [name, v] of Object.entries(draft)) {
    const f = model.field(name)
    if (!f) continue
    const kind = kindOf(f)
    if (kind === 'relation') {
      if (Array.isArray(v) && v.length) out.push({ field: f.relation?.foreignKey ?? name, operator: 'in', value: v })
    } else if (kind === 'multi') {
      if (Array.isArray(v) && v.length) out.push({ field: name, operator: 'in', value: v })
    } else if (kind === 'bool') {
      if (v === 'true' || v === 'false') out.push({ field: name, operator: 'eq', value: v === 'true' })
    } else if (kind === 'range') {
      const r = (v ?? {}) as { min?: string; max?: string }
      const num = f.type === 'integer' || f.type === 'number'
      if (r.min != null && r.min !== '') out.push({ field: name, operator: 'gte', value: num ? Number(r.min) : r.min })
      if (r.max != null && r.max !== '') out.push({ field: name, operator: 'lte', value: num ? Number(r.max) : r.max })
    }
  }
  return out
}

export function countActiveFilters(model: ResourceModel, draft: FilterDraft): number {
  return Object.keys(draft).filter((name) => {
    const f = model.field(name)
    if (!f) return false
    const v = draft[name]
    const kind = kindOf(f)
    if (kind === 'relation' || kind === 'multi') return Array.isArray(v) && v.length > 0
    if (kind === 'bool') return v === 'true' || v === 'false'
    if (kind === 'range') {
      const r = (v ?? {}) as { min?: string; max?: string }
      return (r.min != null && r.min !== '') || (r.max != null && r.max !== '')
    }
    return false
  }).length
}

function fieldLabel(model: ResourceModel, f: ResolvedField, t: Translate) {
  return t(f.label ?? `field.${model.spec.name}.${f.name}`)
}

function CheckList({
  options,
  selected,
  onToggle,
  label
}: {
  options: { value: string; label: string }[]
  selected: string[]
  onToggle: (v: string) => void
  label: string
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-sm font-medium">{label}</div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {options.map((opt) => (
          <label key={opt.value} className="flex min-w-[8rem] items-center gap-2 text-sm">
            <Checkbox checked={selected.includes(opt.value)} onCheckedChange={() => onToggle(opt.value)} />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

function RelationFilter({
  field,
  selected,
  onToggle,
  label
}: {
  field: ResolvedField
  selected: string[]
  onToggle: (v: string) => void
  label: string
}) {
  const rel = field.relation
  const title = rel?.titleField ?? 'name'
  const { data } = useList({
    resource: rel?.resource,
    pagination: { pageSize: 200, mode: 'server' },
    queryOptions: { enabled: Boolean(rel?.resource) }
  })
  const options = (data?.data ?? []).map((r: any) => ({ value: String(r.id), label: r[title] ?? String(r.id) }))
  return <CheckList options={options} selected={selected} onToggle={onToggle} label={label} />
}

export function FilterBar({
  model,
  draft,
  setDraft,
  t
}: {
  model: ResourceModel
  draft: FilterDraft
  setDraft: (d: FilterDraft) => void
  t: Translate
}) {
  const fields = model.filterFields.filter((f) => kindOf(f))
  if (fields.length === 0) return null
  const active = countActiveFilters(model, draft)

  const toggleMulti = (name: string, v: string) => {
    const cur: string[] = Array.isArray(draft[name]) ? (draft[name] as string[]) : []
    const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]
    setDraft({ ...draft, [name]: next })
  }
  const setBool = (name: string, v: string) => setDraft({ ...draft, [name]: v })
  const setRange = (name: string, key: 'min' | 'max', v: string) =>
    setDraft({ ...draft, [name]: { ...((draft[name] as object) ?? {}), [key]: v } })

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" /> {t('filter.title')}
          {active > 0 && <Badge className="ml-1 px-1.5">{active}</Badge>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('filter.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {fields.map((f) => {
            const kind = kindOf(f)
            const label = fieldLabel(model, f, t)
            const sel: string[] = Array.isArray(draft[f.name]) ? (draft[f.name] as string[]) : []
            if (kind === 'relation') {
              return (
                <RelationFilter key={f.name} field={f} selected={sel} onToggle={(v) => toggleMulti(f.name, v)} label={label} />
              )
            }
            if (kind === 'multi') {
              const options = (f.options ?? []).map((o) => ({ value: o.value, label: t(o.label) }))
              return (
                <CheckList key={f.name} options={options} selected={sel} onToggle={(v) => toggleMulti(f.name, v)} label={label} />
              )
            }
            if (kind === 'bool') {
              const cur = (draft[f.name] as string) ?? ''
              return (
                <div key={f.name} className="space-y-1.5">
                  <div className="text-sm font-medium">{label}</div>
                  <div className="flex gap-2">
                    {[
                      { v: '', l: t('filter.any') },
                      { v: 'true', l: t('filter.yes') },
                      { v: 'false', l: t('filter.no') }
                    ].map((o) => (
                      <Button
                        key={o.v || 'any'}
                        type="button"
                        size="sm"
                        variant={cur === o.v ? 'default' : 'outline'}
                        onClick={() => setBool(f.name, o.v)}
                      >
                        {o.l}
                      </Button>
                    ))}
                  </div>
                </div>
              )
            }
            // range
            const r = (draft[f.name] as { min?: string; max?: string }) ?? {}
            const numeric = f.type === 'integer' || f.type === 'number'
            const inputType = numeric ? 'number' : f.type === 'datetime' ? 'datetime-local' : 'date'
            return (
              <div key={f.name} className="space-y-1.5">
                <div className="text-sm font-medium">{label}</div>
                <div className="flex items-center gap-2">
                  <Input
                    type={inputType}
                    placeholder={t('filter.min')}
                    value={r.min ?? ''}
                    onChange={(e) => setRange(f.name, 'min', e.target.value)}
                  />
                  <span className="text-muted-foreground">–</span>
                  <Input
                    type={inputType}
                    placeholder={t('filter.max')}
                    value={r.max ?? ''}
                    onChange={(e) => setRange(f.name, 'max', e.target.value)}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" disabled={active === 0} onClick={() => setDraft({})}>
            {t('filter.clear')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
