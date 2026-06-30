/**
 * Read-only renderers for list cells and show fields. Mirrors the widget set:
 * enums → colored badge, booleans → check/dash, relations → titleField, dates →
 * locale string, images → thumbnail.
 */
import { useApiUrl } from '@refinedev/core'
import { Check, X, Minus } from 'lucide-react'
import { Badge } from '@/ui/components/ui/badge'
import { absoluteUrl } from '@/lib/utils'
import type { ResolvedField } from '@/engine'
import type { WidgetProps } from './types'

function getValue(record: Record<string, any>, field: ResolvedField): any {
  if (field.type === 'relation' && field.relation) {
    const expanded = record[field.relation.resource] ?? record[field.name]
    if (expanded && typeof expanded === 'object') {
      return expanded[field.relation.titleField ?? 'name'] ?? expanded.id
    }
    return field.relation.foreignKey ? record[field.relation.foreignKey] : record[field.name]
  }
  return record[field.name]
}

export interface CellProps {
  record: Record<string, any>
  field: ResolvedField
  t: WidgetProps['t']
}

export function FieldCell({ record, field, t }: CellProps) {
  const apiUrl = useApiUrl()
  const value = getValue(record, field)

  // Boolean is tri-state: true → green check, false → red cross, undefined → grey dash.
  if (field.type === 'boolean') {
    if (value === true) return <Check className="h-4 w-4 text-green-600" />
    if (value === false) return <X className="h-4 w-4 text-destructive" />
    return <Minus className="h-4 w-4 text-muted-foreground" />
  }

  if (value == null || value === '') return <span className="text-muted-foreground">—</span>

  switch (field.type) {
    case 'enum': {
      const opt = field.options?.find((o) => o.value === value)
      return (
        <Badge variant="secondary" className="gap-1.5">
          {opt?.color && (
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: opt.color }}
            />
          )}
          {opt ? t(opt.label) : String(value)}
        </Badge>
      )
    }
    case 'date':
      return <>{new Date(value).toLocaleDateString()}</>
    case 'datetime':
      return <>{new Date(value).toLocaleString()}</>
    case 'image': {
      const url = record.coverUrl ?? (Array.isArray(value) ? value[0]?.url : value)
      return url ? (
        <img src={absoluteUrl(apiUrl, url)} alt="" className="h-8 w-12 rounded object-cover" />
      ) : (
        <span className="text-muted-foreground">—</span>
      )
    }
    case 'number':
      return <>{Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}</>
    default:
      return <>{String(value)}</>
  }
}

/** All image URLs for an image field (cover first), used by the show gallery. */
function imageUrls(record: Record<string, any>, field: ResolvedField): string[] {
  const v = record[field.name]
  if (Array.isArray(v) && v.length) return v.map((it) => it?.url ?? it).filter(Boolean)
  if (record.coverUrl) return [record.coverUrl]
  return typeof v === 'string' && v ? [v] : []
}

export function FieldValue({ record, field, t }: CellProps) {
  const apiUrl = useApiUrl()
  // Image/gallery fields render as a thumbnail grid (read-only mirror of the edit widget).
  if (field.type === 'image' || field.type === 'file') {
    const urls = imageUrls(record, field)
    if (!urls.length) return <span className="text-muted-foreground">—</span>
    return (
      <div className="flex flex-wrap gap-2">
        {urls.map((url, i) => (
          <img
            key={i}
            src={absoluteUrl(apiUrl, url)}
            alt=""
            className="h-24 w-32 rounded-md border object-cover"
          />
        ))}
      </div>
    )
  }

  if (field.type === 'richtext') {
    const html = record[field.name]
    // NOTE: richtext is sanitized server-side before persistence (blueprint §11.2.9).
    // If the engine is pointed at an untrusted backend, wrap this with DOMPurify.
    return html ? (
      <div
        className="prose prose-sm max-w-none"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: String(html) }}
      />
    ) : (
      <span className="text-muted-foreground">—</span>
    )
  }
  return <FieldCell record={record} field={field} t={t} />
}
