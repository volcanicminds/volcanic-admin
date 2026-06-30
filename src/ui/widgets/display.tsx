/**
 * Read-only renderers for list cells and show fields. Mirrors the widget set:
 * enums → colored badge, booleans → check/dash, relations → titleField, dates →
 * locale string, images → thumbnail.
 */
import { useApiUrl } from '@refinedev/core'
import { Check, X, Minus } from 'lucide-react'
import { Badge } from '@/ui/components/ui/badge'
import { absoluteUrl, cn } from '@/lib/utils'
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

// Soft colored badge per enum option (EnumOption.color). Named palette → literal
// Tailwind classes (so they survive the build); any other value falls back to the
// neutral badge + a color dot.
const ENUM_BADGE: Record<string, string> = {
  slate: 'border-slate-200 bg-slate-100 text-slate-700',
  gray: 'border-slate-200 bg-slate-100 text-slate-700',
  red: 'border-red-200 bg-red-100 text-red-700',
  orange: 'border-orange-200 bg-orange-100 text-orange-700',
  amber: 'border-amber-200 bg-amber-100 text-amber-800',
  yellow: 'border-yellow-200 bg-yellow-100 text-yellow-800',
  green: 'border-green-200 bg-green-100 text-green-700',
  emerald: 'border-emerald-200 bg-emerald-100 text-emerald-700',
  teal: 'border-teal-200 bg-teal-100 text-teal-700',
  blue: 'border-blue-200 bg-blue-100 text-blue-700',
  indigo: 'border-indigo-200 bg-indigo-100 text-indigo-700',
  violet: 'border-violet-200 bg-violet-100 text-violet-700',
  purple: 'border-purple-200 bg-purple-100 text-purple-700',
  pink: 'border-pink-200 bg-pink-100 text-pink-700',
  rose: 'border-rose-200 bg-rose-100 text-rose-700'
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
      const palette = opt?.color ? ENUM_BADGE[opt.color] : undefined
      // Named palette → fully colored chip; unknown color → neutral chip + dot.
      if (palette) {
        return (
          <Badge variant="outline" className={cn('font-medium', palette)}>
            {opt ? t(opt.label) : String(value)}
          </Badge>
        )
      }
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
        <img
          src={absoluteUrl(apiUrl, url)}
          alt=""
          className={cn(
            'h-8 w-12 rounded',
            field.image?.fit === 'contain' ? 'bg-white object-contain' : 'object-cover'
          )}
        />
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
            className={cn(
              'h-24 w-32 rounded-md border',
              field.image?.fit === 'contain' ? 'bg-white object-contain p-2' : 'object-cover'
            )}
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
