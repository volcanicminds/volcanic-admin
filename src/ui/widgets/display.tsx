/**
 * Read-only renderers for list cells and show fields. Mirrors the widget set:
 * enums → colored badge, booleans → check/dash, relations → titleField, dates →
 * locale string, images → thumbnail.
 */
import { useState } from 'react'
import { useApiUrl } from '@refinedev/core'
import { Check, X, Minus, Star } from 'lucide-react'
import { Badge } from '@/ui/components/ui/badge'
import { absoluteUrl, cn } from '@/lib/utils'
import { ImagePreviewDialog } from '@/ui/components/ImagePreviewDialog'
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

/** One enum value as a chip: named palette → colored chip, custom color → neutral
 *  chip + dot, unknown option → the raw value. */
function EnumBadge({
  value,
  field,
  t
}: {
  value: unknown
  field: ResolvedField
  t: WidgetProps['t']
}) {
  const opt = field.options?.find((o) => o.value === value)
  const palette = opt?.color ? ENUM_BADGE[opt.color] : undefined
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
        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: opt.color }} />
      )}
      {opt ? t(opt.label) : String(value)}
    </Badge>
  )
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
      // A multi-valued enum (array column) is one badge per value; an empty array
      // reads as "no value", like an empty scalar.
      if (Array.isArray(value)) {
        if (value.length === 0) return <span className="text-muted-foreground">—</span>
        return (
          <span className="inline-flex flex-wrap items-center gap-1">
            {value.map((v) => (
              <EnumBadge key={String(v)} value={v} field={field} t={t} />
            ))}
          </span>
        )
      }
      return <EnumBadge value={value} field={field} t={t} />
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

interface ImageItem {
  url: string
  /** Alt text stored alongside the image (see ImageSpec.altField). */
  alt: string
}

/**
 * Images of an image field, in display order, each with its alt text.
 *
 * Two shapes are supported: a gallery (array of items, e.g. VehicleImage rows) and
 * a single image (a URL string on the record, its alt in a sibling column named by
 * `image.altField`). Items are sorted by `position` — the SAME rule the edit widget
 * applies: a backend that eager-loads the relation without an ORDER BY hands them
 * back in arbitrary order, so sorting here is what keeps show and edit in agreement
 * (cover first).
 */
function imageItems(record: Record<string, any>, field: ResolvedField): ImageItem[] {
  const altField = field.image?.altField ?? 'altView'
  const v = record[field.name]
  if (Array.isArray(v) && v.length) {
    return v
      .map((it, i) => ({
        url: it?.url ?? it,
        alt: String(it?.[altField] ?? ''),
        position: it?.position ?? i
      }))
      .filter((it) => Boolean(it.url))
      .sort((a, b) => a.position - b.position)
      .map(({ url, alt }) => ({ url, alt }))
  }
  const alt = String(record[altField] ?? '')
  if (typeof v === 'string' && v) return [{ url: v, alt }]
  if (record.coverUrl) return [{ url: record.coverUrl, alt }]
  return []
}

export function FieldValue({ record, field, t }: CellProps) {
  const apiUrl = useApiUrl()
  const [preview, setPreview] = useState<ImageItem | null>(null)
  // Image/gallery fields render as a thumbnail grid (read-only mirror of the edit
  // widget): same order, same cover badge, plus the alt text as a caption — a
  // reader-visible value, not just an attribute nobody can check without devtools.
  if (field.type === 'image' || field.type === 'file') {
    const items = imageItems(record, field)
    if (!items.length) return <span className="text-muted-foreground">—</span>
    // The first item is the cover only where ordering means that (`cover: 'first'`,
    // the gallery case); a lone single image is not labelled.
    const marksCover = items.length > 1 && field.image?.cover !== 'flag'
    return (
      <>
        <div className="flex flex-wrap gap-2">
          {items.map((it, i) => {
            const src = absoluteUrl(apiUrl, it.url)
            return (
              <figure key={i} className="w-40 space-y-1">
                <div className="relative">
                  <img
                    src={src}
                    alt={it.alt}
                    title={t('upload.preview')}
                    onClick={() => setPreview(it)}
                    className={cn(
                      'h-28 w-40 cursor-zoom-in rounded-md border',
                      field.image?.fit === 'contain' ? 'bg-white object-contain p-2' : 'object-cover'
                    )}
                  />
                  {marksCover && i === 0 && (
                    <Badge className="absolute left-1 top-1 gap-1">
                      <Star className="h-3 w-3" /> {t('upload.cover')}
                    </Badge>
                  )}
                </div>
                {it.alt && (
                  <figcaption className="text-xs text-muted-foreground" title={t('upload.alt')}>
                    {it.alt}
                  </figcaption>
                )}
              </figure>
            )
          })}
        </div>
        <ImagePreviewDialog
          open={preview != null}
          onOpenChange={(o) => !o && setPreview(null)}
          src={preview ? absoluteUrl(apiUrl, preview.url) : undefined}
          alt={preview?.alt}
        />
      </>
    )
  }

  // Plain multi-line text keeps its line breaks (whitespace-pre-wrap).
  if (field.type === 'text' || field.type === 'textarea') {
    const text = record[field.name]
    return text != null && text !== '' ? (
      <span className="whitespace-pre-wrap">{String(text)}</span>
    ) : (
      <span className="text-muted-foreground">—</span>
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
