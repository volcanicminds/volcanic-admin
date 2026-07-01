/**
 * Reference-select widget for many-to-one relations. Loads options from the
 * related resource via Refine's useList and renders the relation `titleField`.
 */
import { useList } from '@refinedev/core'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/components/ui/select'
import type { WidgetProps } from './types'

export function ReferenceSelect({ field, value, onChange, disabled }: WidgetProps) {
  const relation = field.relation
  const titleField = relation?.titleField ?? 'name'

  const { data, isLoading } = useList({
    resource: relation?.resource,
    // Sort options by the display field server-side (keeps the right rows within
    // the pageSize cap); a locale-aware client sort then guarantees the visible
    // order even if the data provider ignores the sorter (and handles accents).
    sorters: [{ field: titleField, order: 'asc' }],
    pagination: { pageSize: 100, mode: 'server' },
    queryOptions: { enabled: Boolean(relation?.resource) }
  })

  const options = [...(data?.data ?? [])].sort((a: any, b: any) =>
    String(a[titleField] ?? '').localeCompare(String(b[titleField] ?? ''))
  )

  return (
    <Select
      value={value != null ? String(value) : undefined}
      onValueChange={(v) => onChange(v)}
      disabled={disabled || isLoading}
    >
      <SelectTrigger>
        <SelectValue placeholder={isLoading ? '…' : '—'} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt: any) => (
          <SelectItem key={opt.id} value={String(opt.id)}>
            {opt[titleField] ?? opt.id}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
