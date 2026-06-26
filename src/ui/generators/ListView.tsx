/**
 * Generated list view. Table columns come from the model's `listFields`;
 * omni-search maps to the synthetic `q` filter, sort toggles per sortable
 * column, pagination reads the `v-*` totals via the data provider.
 */
import { useMemo, useState } from 'react'
import { useList, useDelete, useNavigation } from '@refinedev/core'
import type { CrudSorting } from '@refinedev/core'
import { Plus, Search, ArrowUp, ArrowDown, Pencil, Eye, Trash2 } from 'lucide-react'
import { Button } from '@/ui/components/ui/button'
import { Input } from '@/ui/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/ui/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/ui/components/ui/dialog'
import { useT } from '@/engine'
import type { ResourceModel } from '@/engine'
import { FieldCell } from '@/ui/widgets/display'

export function ListView({ model }: { model: ResourceModel }) {
  const t = useT()
  const { spec, listFields } = model
  const { create, edit, show } = useNavigation()
  const { mutate: deleteOne } = useDelete()

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t(spec.label.plural)}</h1>
        {canCreate && (
          <Button onClick={() => create(spec.name)}>
            <Plus /> {t(`action.new`)}
          </Button>
        )}
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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {listFields.map((f) => {
                const sort = sorters.find((s) => s.field === f.name)
                const sortable = f.list?.sortable ?? !['relation', 'json'].includes(f.type)
                return (
                  <TableHead
                    key={f.name}
                    className={f.list?.align === 'right' ? 'text-right' : undefined}
                    style={f.list?.width ? { width: f.list.width } : undefined}
                  >
                    {sortable ? (
                      <button
                        className="inline-flex items-center gap-1 hover:text-foreground"
                        onClick={() => toggleSort(f.name)}
                      >
                        {t(f.label ?? `field.${spec.name}.${f.name}`)}
                        {sort?.order === 'asc' && <ArrowUp className="h-3 w-3" />}
                        {sort?.order === 'desc' && <ArrowDown className="h-3 w-3" />}
                      </button>
                    ) : (
                      t(f.label ?? `field.${spec.name}.${f.name}`)
                    )}
                  </TableHead>
                )
              })}
              <TableHead className="w-[1%]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={listFields.length + 1} className="text-center text-muted-foreground">
                  {t('state.loading')}
                </TableCell>
              </TableRow>
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={listFields.length + 1} className="text-center text-muted-foreground">
                  {t('state.empty')}
                </TableCell>
              </TableRow>
            ) : (
              records.map((record: any) => (
                <TableRow
                  key={record.id}
                  className="cursor-pointer"
                  onClick={() => show(spec.name, record.id)}
                >
                  {listFields.map((f) => (
                    <TableCell
                      key={f.name}
                      className={f.list?.align === 'right' ? 'text-right' : undefined}
                    >
                      <FieldCell record={record} field={f} t={t} />
                    </TableCell>
                  ))}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => show(spec.name, record.id)}>
                        <Eye />
                      </Button>
                      {canEdit && (
                        <Button size="icon" variant="ghost" onClick={() => edit(spec.name, record.id)}>
                          <Pencil />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setToDelete(String(record.id))}
                        >
                          <Trash2 className="text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {t('list.pageInfo', { page, pageCount })} · {total}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
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
