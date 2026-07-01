/**
 * Generated list view — orchestrates data/state (omni-search, sort, pagination,
 * delete) and swaps the presentation layer between table and card layouts. The
 * available layouts and default come from the manifest; the chosen layout is
 * persisted per resource in localStorage.
 */
import { useMemo, useState } from 'react'
import { useList, useDelete, useNavigation } from '@refinedev/core'
import type { CrudSorting } from '@refinedev/core'
import { Plus, Search, LayoutGrid, Table as TableIcon, ArrowUp, ArrowDown, ArrowUpDown, X } from 'lucide-react'
import { Button } from '@/ui/components/ui/button'
import { Input } from '@/ui/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/ui/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/ui/components/ui/select'
import { cn } from '@/lib/utils'
import { useT } from '@/engine'
import type { ResourceModel, ListLayout } from '@/engine'
import { ListTable } from './ListTable'
import { ListCards } from './ListCards'
import { ListIO } from './ListIO'
import { FilterBar, toCrudFilters, type FilterDraft } from './FilterBar'
import { CollectionActions } from '../actions/ActionButtons'

const layoutKey = (name: string) => `volcanic.admin.list.${name}.layout`
const pageSizeKey = (name: string) => `volcanic.admin.list.${name}.pageSize`
const PAGE_SIZES = [10, 20, 50, 100]

export function ListView({ model }: { model: ResourceModel }) {
  const t = useT()
  const { spec } = model
  const { create, edit, show } = useNavigation()
  const { mutate: deleteOne } = useDelete()

  const layouts: ListLayout[] = spec.listLayouts ?? ['table']
  const [layout, setLayout] = useState<ListLayout>(() => {
    const stored = localStorage.getItem(layoutKey(spec.name))
    if (stored === 'table' || stored === 'card') return stored
    return spec.defaultListLayout ?? layouts[0]
  })
  const chooseLayout = (l: ListLayout) => {
    setLayout(l)
    localStorage.setItem(layoutKey(spec.name), l)
  }

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(() => {
    const stored = Number(localStorage.getItem(pageSizeKey(spec.name)))
    return PAGE_SIZES.includes(stored) ? stored : 20
  })
  const choosePageSize = (n: number) => {
    setPageSize(n)
    setPage(1)
    localStorage.setItem(pageSizeKey(spec.name), String(n))
  }
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [sorters, setSorters] = useState<CrudSorting>(
    (spec.defaultSort ?? []).map((s) => ({ field: s.field, order: s.order }))
  )
  const [filterDraft, setFilterDraftState] = useState<FilterDraft>({})
  const [toDelete, setToDelete] = useState<string | null>(null)

  const fieldFilters = useMemo(() => toCrudFilters(model, filterDraft), [model, filterDraft])
  const setFilterDraft = (d: FilterDraft) => {
    setPage(1)
    setFilterDraftState(d)
  }

  const filters = useMemo(
    () => [
      ...(appliedSearch ? [{ field: 'q', operator: 'eq' as const, value: appliedSearch }] : []),
      ...fieldFilters
    ],
    [appliedSearch, fieldFilters]
  )

  const { data, isLoading } = useList({
    resource: spec.name,
    pagination: { current: page, pageSize, mode: 'server' },
    sorters,
    filters
  })

  const records = data?.data ?? []
  const total = data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  const toggleSort = (field: string) => {
    setSorters((prev) => {
      const cur = prev.find((s) => s.field === field)
      if (!cur) return [{ field, order: 'asc' }]
      if (cur.order === 'asc') return [{ field, order: 'desc' }]
      return []
    })
  }

  // "Sort by" control: a select of orderable fields + a direction toggle.
  const titleField = Array.isArray(spec.titleField) ? spec.titleField[0] : (spec.titleField ?? 'name')
  const sortFields = (
    spec.sortOptions ??
    model.listFields.filter((f) => f.list?.sortable !== false && !['json', 'image', 'file'].includes(f.type)).map((f) => f.name)
  )
    .map((name) => model.field(name))
    .filter((f): f is NonNullable<typeof f> => Boolean(f))
  // Translate a chosen field into Magic Query sorters (a relation sorts by its
  // title and tie-breaks by the row title).
  const buildSorters = (name: string, order: 'asc' | 'desc'): CrudSorting => {
    const f = model.field(name)
    if (f?.type === 'relation' && f.relation?.titleField) {
      const rel = `${name}.${f.relation.titleField}`
      return rel === titleField ? [{ field: rel, order }] : [{ field: rel, order }, { field: titleField, order }]
    }
    return [{ field: name, order }]
  }
  // Match the current primary sorter back to a sort-field option.
  const activeSortBase = sorters[0]?.field.split('.')[0]
  const activeSortField = sortFields.find((f) => f.name === activeSortBase)?.name ?? ''
  const activeSortOrder: 'asc' | 'desc' = sorters[0]?.order === 'desc' ? 'desc' : 'asc'
  const applySort = (name: string, order: 'asc' | 'desc') => {
    setPage(1)
    setSorters(name ? buildSorters(name, order) : [])
  }

  const canCreate = model.hasAction('create')
  const canEdit = model.hasAction('update')
  const canDelete = model.hasAction('delete')

  const presentation = {
    model,
    records,
    isLoading,
    t,
    canEdit,
    canDelete,
    onShow: (id: string) => show(spec.name, id),
    onEdit: (id: string) => edit(spec.name, id),
    onDelete: (id: string) => setToDelete(id)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t(spec.label.plural)}</h1>
        <div className="flex items-center gap-2">
          <ListIO model={model} filters={filters} sorters={sorters} canWrite={canCreate || canEdit} />
          <CollectionActions model={model} t={t} />
          {layouts.length > 1 && (
            <div className="flex h-9 items-center rounded-md border p-0.5">
              <Button
                size="icon"
                variant="ghost"
                className={cn('h-7 w-7', layout === 'table' && 'bg-accent text-foreground')}
                title="Table"
                onClick={() => chooseLayout('table')}
              >
                <TableIcon />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className={cn('h-7 w-7', layout === 'card' && 'bg-accent text-foreground')}
                title="Cards"
                onClick={() => chooseLayout('card')}
              >
                <LayoutGrid />
              </Button>
            </div>
          )}
          {canCreate && (
            <Button onClick={() => create(spec.name)}>
              <Plus /> {t('action.new')}
            </Button>
          )}
        </div>
      </div>

      {(spec.search || sortFields.length > 0 || model.fields.some((f) => f.list?.filterable)) && (
        <div className="flex flex-wrap items-center gap-3">
          {spec.search && (
            <form
              className="flex w-full max-w-sm items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                setPage(1)
                setAppliedSearch(search)
              }}
            >
              <Input
                placeholder={t('action.search')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Button type="submit" variant="secondary" size="icon">
                <Search />
              </Button>
            </form>
          )}
          <FilterBar model={model} draft={filterDraft} setDraft={setFilterDraft} t={t} />
          {sortFields.length > 0 && (
            <div className="flex items-center gap-1">
              <Select
                value={activeSortField || undefined}
                onValueChange={(v) => applySort(v, activeSortOrder)}
              >
                <SelectTrigger className="h-9 w-[11rem]">
                  <SelectValue placeholder={t('sort.by')} />
                </SelectTrigger>
                <SelectContent>
                  {sortFields.map((f) => (
                    <SelectItem key={f.name} value={f.name}>
                      {t(f.label ?? `field.${spec.name}.${f.name}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                disabled={!activeSortField}
                title={activeSortOrder === 'asc' ? t('sort.asc') : t('sort.desc')}
                onClick={() => applySort(activeSortField, activeSortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {!activeSortField ? <ArrowUpDown /> : activeSortOrder === 'asc' ? <ArrowUp /> : <ArrowDown />}
              </Button>
              {activeSortField && (
                <Button
                  variant="ghost"
                  size="icon"
                  title={t('sort.clear')}
                  onClick={() => applySort('', 'asc')}
                >
                  <X />
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {layout === 'card' ? (
        <ListCards {...presentation} />
      ) : (
        <ListTable {...presentation} sorters={sorters} onToggleSort={toggleSort} />
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>
            {t('list.pageInfo', { page, pageCount })} · {total}
          </span>
          <div className="flex items-center gap-2">
            <span>{t('list.pageSize')}</span>
            <Select value={String(pageSize)} onValueChange={(v) => choosePageSize(Number(v))}>
              <SelectTrigger className="h-8 w-[4.5rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            {t('list.prev')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pageCount}
            onClick={() => setPage((p) => p + 1)}
          >
            {t('list.next')}
          </Button>
        </div>
      </div>

      <Dialog open={Boolean(toDelete)} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('action.delete.confirmTitle')}</DialogTitle>
            <DialogDescription>{t('action.delete.confirmText')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>
              {t('action.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (toDelete) deleteOne({ resource: spec.name, id: toDelete })
                setToDelete(null)
              }}
            >
              {t('action.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
