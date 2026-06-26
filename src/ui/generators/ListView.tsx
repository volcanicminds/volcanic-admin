/**
 * Generated list view — orchestrates data/state (omni-search, sort, pagination,
 * delete) and swaps the presentation layer between table and card layouts. The
 * available layouts and default come from the manifest; the chosen layout is
 * persisted per resource in localStorage.
 */
import { useMemo, useState } from 'react'
import { useList, useDelete, useNavigation } from '@refinedev/core'
import type { CrudSorting } from '@refinedev/core'
import { Plus, Search, LayoutGrid, Table as TableIcon } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import { useT } from '@/engine'
import type { ResourceModel, ListLayout } from '@/engine'
import { ListTable } from './ListTable'
import { ListCards } from './ListCards'
import { ListIO } from './ListIO'

const layoutKey = (name: string) => `volcanic.admin.list.${name}.layout`

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
  const pageSize = 20
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [sorters, setSorters] = useState<CrudSorting>(
    (spec.defaultSort ?? []).map((s) => ({ field: s.field, order: s.order }))
  )
  const [toDelete, setToDelete] = useState<string | null>(null)

  const filters = useMemo(
    () => (appliedSearch ? [{ field: 'q', operator: 'eq' as const, value: appliedSearch }] : []),
    [appliedSearch]
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

  const canCreate = spec.capabilities?.create !== false && model.hasAction('create')
  const canEdit = spec.capabilities?.update !== false && model.hasAction('update')
  const canDelete = spec.capabilities?.delete !== false && model.hasAction('delete')

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
          {layouts.length > 1 && (
            <div className="flex rounded-md border p-0.5">
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

      {spec.capabilities?.search !== false && spec.search && (
        <form
          className="flex max-w-sm items-center gap-2"
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

      {layout === 'card' ? (
        <ListCards {...presentation} />
      ) : (
        <ListTable {...presentation} sorters={sorters} onToggleSort={toggleSort} />
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {t('list.pageInfo', { page, pageCount })} · {total}
        </span>
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
