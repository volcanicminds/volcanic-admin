/**
 * Generated list view — orchestrates data/state (omni-search, sort, pagination,
 * delete) and swaps the presentation layer between table and card layouts. The
 * available layouts and default come from the manifest; the chosen layout is
 * persisted per resource in localStorage.
 *
 * Search / sort / filters / page live in `useListState`: per resource, restored
 * on return from a record (see listState.ts).
 */
import { useEffect, useMemo, useState } from 'react'
import { useList, useDelete, useNavigation } from '@refinedev/core'
import type { CrudSorting } from '@refinedev/core'
import { Plus, Search, LayoutGrid, Table as TableIcon, ArrowUp, ArrowDown, ArrowUpDown, X } from 'lucide-react'
import { Button } from '@/ui/components/ui/button'
import { Input } from '@/ui/components/ui/input'
import { ConfirmDialog } from '@/ui/components/ConfirmDialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/ui/components/ui/select'
import { cn } from '@/lib/utils'
import { useT, searchFilter } from '@/engine'
import type { ResourceModel, ListLayout } from '@/engine'
import { ListTable } from './ListTable'
import { ListCards } from './ListCards'
import { ListIO } from './ListIO'
import { FilterBar, toCrudFilters } from './FilterBar'
import { useListState } from './listState'
import { CollectionActions } from '../actions/ActionButtons'

const layoutKey = (name: string) => `volcanic.admin.list.${name}.layout`
const pageSizeKey = (name: string) => `volcanic.admin.list.${name}.pageSize`
const PAGE_SIZES = [10, 20, 50, 100]

export function ListView({ model }: { model: ResourceModel }) {
  const t = useT()
  const { spec } = model
  const { create, edit, show } = useNavigation()
  const { mutate: deleteOne } = useDelete()

  const layouts: ListLayout[] = model.list.layouts
  const [layout, setLayout] = useState<ListLayout>(() => {
    const stored = localStorage.getItem(layoutKey(spec.name))
    if (stored === 'table' || stored === 'card') return stored
    return model.list.defaultLayout
  })
  const chooseLayout = (l: ListLayout) => {
    setLayout(l)
    localStorage.setItem(layoutKey(spec.name), l)
  }

  const [pageSize, setPageSize] = useState<number>(() => {
    const stored = Number(localStorage.getItem(pageSizeKey(spec.name)))
    return PAGE_SIZES.includes(stored) ? stored : 20
  })

  const list = useListState(model)
  const { page, search: appliedSearch, sorters, filters: filterDraft } = list.state
  const { setPage, setSorters, setFilters: setFilterDraft } = list

  const choosePageSize = (n: number) => {
    setPageSize(n)
    setPage(1)
    localStorage.setItem(pageSizeKey(spec.name), String(n))
  }

  // Search input draft — only committed to the query (and persisted) on submit.
  const [search, setSearch] = useState(appliedSearch)
  useEffect(() => setSearch(appliedSearch), [appliedSearch])
  const [toDelete, setToDelete] = useState<string | null>(null)

  const fieldFilters = useMemo(() => toCrudFilters(model, filterDraft), [model, filterDraft])

  // The omni-search expands here, where the manifest's searchable fields are in hand: the v5
  // Magic Query has no `q` parameter and answers 400 for a field it does not know, so the OR
  // has to be written out rather than handed to the backend as a word.
  const filters = useMemo(
    () => [...searchFilter(appliedSearch, spec.search?.fields ?? [], spec.search?.operator), ...fieldFilters],
    [appliedSearch, spec.search?.fields, spec.search?.operator, fieldFilters]
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

  // A restored page can outrun a shrunken result set (records deleted, or a
  // narrower filter): fall back to the last page that exists.
  useEffect(() => {
    if (!isLoading && page > pageCount) setPage(pageCount)
  }, [isLoading, page, pageCount])

  const toggleSort = (field: string) => {
    const cur = sorters.find((s) => s.field === field)
    if (!cur) return setSorters([{ field, order: 'asc' }])
    if (cur.order === 'asc') return setSorters([{ field, order: 'desc' }])
    setSorters([])
  }

  // "Sort by" control: a select of orderable fields + a direction toggle.
  const titleField = Array.isArray(spec.titleField) ? spec.titleField[0] : (spec.titleField ?? 'name')
  const sortFields = model.sortFields
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
      {/* Sticky toolbar: title + actions + search/filter/sort, pinned while the
          list scrolls (flush under the app topbar), mirroring the form header.
          `-mx-6 px-6` = full-width bar, `-top-6` cancels the main's top padding. */}
      <div className="sticky -top-6 z-20 -mx-6 space-y-3 border-b bg-background px-6 py-4">
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

      {(spec.search || sortFields.length > 0 || model.filterFields.length > 0) && (
        <div className="flex flex-wrap items-center gap-3">
          {spec.search && (
            <form
              className="flex w-full max-w-sm items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                list.setSearch(search)
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
                // Radix Select won't fall back to the placeholder when a controlled
                // value flips to undefined (controlled→uncontrolled keeps the last
                // label). Remounting on clear resets it to "Sort by" cleanly.
                key={activeSortField || 'unset'}
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
      </div>

      {layout === 'card' ? (
        <ListCards {...presentation} />
      ) : (
        <ListTable {...presentation} sorters={sorters} onToggleSort={toggleSort} />
      )}

      {/* Pagination bar, mirroring the toolbar above. `sticky bottom` is asymmetric —
          it only ever shifts a box UP — so it gives both regimes for free: with a
          short list nothing overflows and the bar stays in flow right under the
          results; with a long one it rides the bottom edge instead of sitting
          off-screen, and un-sticks by itself once you reach the end, so no row is
          permanently covered. `-bottom-6` cancels the main's bottom padding (the
          `-top-6` above does the same at the other end); the opaque background is
          load-bearing, not decoration — rows scroll underneath it. */}
      <div className="sticky -bottom-6 z-20 -mx-6 flex items-center justify-between border-t bg-background px-6 py-4 text-sm text-muted-foreground">
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
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            {t('list.prev')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pageCount}
            onClick={() => setPage(page + 1)}
          >
            {t('list.next')}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={t('action.delete.confirmTitle')}
        description={t('action.delete.confirmText')}
        confirmLabel={t('action.delete')}
        cancelLabel={t('action.cancel')}
        destructive
        onConfirm={() => {
          if (toDelete) deleteOne({ resource: spec.name, id: toDelete })
          setToDelete(null)
        }}
      />
    </div>
  )
}
