/** Table presentation for the generated list. */
import { ArrowUp, ArrowDown, Pencil, Eye, Trash2 } from 'lucide-react'
import { Button } from '@/ui/components/ui/button'
import { Checkbox } from '@/ui/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/ui/components/ui/table'
import { FieldCell } from '@/ui/widgets/display'
import type { ListPresentationProps } from './listShared'
import { RowActions } from '../actions/ActionButtons'

export function ListTable({
  model,
  records,
  isLoading,
  t,
  canEdit,
  canDelete,
  canShow,
  onShow,
  onEdit,
  onDelete,
  selection,
  sorters,
  onToggleSort
}: ListPresentationProps) {
  const { spec, columns } = model
  const span = columns.length + (selection ? 2 : 1)
  const allSelected = records.length > 0 && records.every((r: any) => selection?.selected.has(String(r.id)))

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {selection && (
              <TableHead className="w-[1%]">
                <Checkbox
                  checked={allSelected}
                  disabled={records.length === 0}
                  aria-label={t('list.selectAll')}
                  title={t('list.selectAll')}
                  onCheckedChange={selection.toggleAll}
                />
              </TableHead>
            )}
            {columns.map((col) => {
              const f = col.field
              const sort = sorters?.find((s) => s.field === f.name)
              const sortable = f.sortable ?? !['relation', 'json'].includes(f.type)
              const label = t(col.label ?? f.label ?? `field.${spec.name}.${f.name}`)
              return (
                <TableHead
                  key={f.name}
                  className={col.align === 'right' ? 'text-right' : undefined}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {sortable && onToggleSort ? (
                    <button
                      className="inline-flex items-center gap-1 hover:text-foreground"
                      onClick={() => onToggleSort(f.name)}
                    >
                      {label}
                      {sort?.order === 'asc' && <ArrowUp className="h-3 w-3" />}
                      {sort?.order === 'desc' && <ArrowDown className="h-3 w-3" />}
                    </button>
                  ) : (
                    label
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
              <TableCell colSpan={span} className="text-center text-muted-foreground">
                {t('state.loading')}
              </TableCell>
            </TableRow>
          ) : records.length === 0 ? (
            <TableRow>
              <TableCell colSpan={span} className="text-center text-muted-foreground">
                {t('state.empty')}
              </TableCell>
            </TableRow>
          ) : (
            records.map((record: any) => (
              <TableRow
                key={record.id}
                className={canShow ? 'cursor-pointer' : undefined}
                onClick={canShow ? () => onShow(record.id) : undefined}
                data-state={selection?.selected.has(String(record.id)) ? 'selected' : undefined}
              >
                {selection && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selection.selected.has(String(record.id))}
                      aria-label={t('list.selectRow')}
                      onCheckedChange={() => selection.toggle(String(record.id))}
                    />
                  </TableCell>
                )}
                {columns.map((col) => (
                  <TableCell key={col.field.name} className={col.align === 'right' ? 'text-right' : undefined}>
                    <FieldCell record={record} field={col.field} t={t} />
                  </TableCell>
                ))}
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-1">
                    <RowActions model={model} record={record} t={t} />
                    {canShow && (
                      <Button size="icon" variant="ghost" onClick={() => onShow(record.id)}>
                        <Eye />
                      </Button>
                    )}
                    {canEdit && (
                      <Button size="icon" variant="ghost" onClick={() => onEdit(record.id)}>
                        <Pencil />
                      </Button>
                    )}
                    {canDelete && (
                      <Button size="icon" variant="ghost" onClick={() => onDelete(record.id)}>
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
  )
}
