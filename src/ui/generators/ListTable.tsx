/** Table presentation for the generated list. */
import { ArrowUp, ArrowDown, Pencil, Eye, Trash2 } from 'lucide-react'
import { Button } from '@/ui/components/ui/button'
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
  onShow,
  onEdit,
  onDelete,
  sorters,
  onToggleSort
}: ListPresentationProps) {
  const { spec, columns } = model

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
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
              <TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground">
                {t('state.loading')}
              </TableCell>
            </TableRow>
          ) : records.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground">
                {t('state.empty')}
              </TableCell>
            </TableRow>
          ) : (
            records.map((record: any) => (
              <TableRow
                key={record.id}
                className="cursor-pointer"
                onClick={() => onShow(record.id)}
              >
                {columns.map((col) => (
                  <TableCell key={col.field.name} className={col.align === 'right' ? 'text-right' : undefined}>
                    <FieldCell record={record} field={col.field} t={t} />
                  </TableCell>
                ))}
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-1">
                    <RowActions model={model} record={record} t={t} />
                    <Button size="icon" variant="ghost" onClick={() => onShow(record.id)}>
                      <Eye />
                    </Button>
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
