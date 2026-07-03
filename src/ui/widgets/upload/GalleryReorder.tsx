/**
 * Multi-image gallery widget with ordering (e.g. a product image gallery). The first item
 * (lowest position) is the cover. Supports add (click or drag&drop), remove,
 * drag-to-reorder, and a per-image alt value.
 *
 * Real mode (the field declares `image.endpoints` and the record exists): every
 * op maps to its dedicated endpoint (upload/reorder/update/remove) and the gallery
 * is re-read from the response. Deferred mode (endpoints declared but no id yet, i.e.
 * create): files are staged locally with a preview and their `File` kept on each item
 * so AutoForm can upload them once the record is created. With no endpoints (mock),
 * files are inlined as data URLs in the array value.
 */
import { useEffect, useRef, useState } from 'react'
import { useApiUrl, useInvalidate, useResource } from '@refinedev/core'
import { useParams } from 'react-router'
import { toast } from 'sonner'
import { Upload, X, GripVertical, Star } from 'lucide-react'
import { Button } from '@/ui/components/ui/button'
import { Input } from '@/ui/components/ui/input'
import { Badge } from '@/ui/components/ui/badge'
import { cn } from '@/lib/utils'
import { interpolatePath } from '@/engine'
import type { WidgetProps } from '../types'
import { uploadFiles, sendJson, absoluteUrl, imagesFromClipboard } from './rest'

interface GalleryItem {
  id: string
  url: string
  position: number
  altView?: string
  /** Set on items staged during create (deferred upload); uploaded on save. */
  _file?: File
}

const sig = (v: unknown) =>
  Array.isArray(v) ? v.map((it: any) => `${it?.id}:${it?.position}`).join('|') : ''

function normalize(v: unknown): GalleryItem[] {
  return (Array.isArray(v) ? v : [])
    .map((it: any, i: number) => ({
      id: it?.id ?? String(i),
      url: it?.url ?? it,
      position: it?.position ?? i,
      altView: it?.altView ?? '',
      // Preserve the staged File across re-syncs so a deferred upload isn't lost.
      _file: it?._file
    }))
    .sort((a, b) => a.position - b.position)
}

export function GalleryReorder({ field, value, onChange, disabled, t }: WidgetProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const apiUrl = useApiUrl()
  const { id } = useParams()
  const invalidate = useInvalidate()
  const { identifier } = useResource()

  const [items, setItems] = useState<GalleryItem[]>(() => normalize(value))
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const dragIndex = useRef<number | null>(null)

  const accept = field.image?.accept?.join(',')
  const maxSize = field.image?.maxSize
  const endpoints = field.image?.endpoints
  const realMode = Boolean(endpoints?.upload && id)
  // Create: no id yet — stage files locally and let AutoForm upload them on save.
  const deferred = Boolean(endpoints?.upload && !id)

  // Re-sync from the record when it loads/changes externally (not from our own ops).
  useEffect(() => {
    setItems(normalize(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig(value)])

  const apply = (next: GalleryItem[]) => {
    const reindexed = next.map((it, i) => ({ ...it, position: i }))
    setItems(reindexed)
    onChange(reindexed)
  }
  const refresh = () => {
    if (identifier) invalidate({ resource: identifier, invalidates: ['list', 'detail'] })
  }
  const fail = (e: unknown) => toast.error((e as Error)?.message ?? t('upload.failed'))

  const addFiles = async (fileList: FileList | File[] | null) => {
    if (!fileList?.length || disabled || busy) return
    const files = Array.from(fileList).filter((f) => !maxSize || f.size <= maxSize)
    if (!files.length) {
      toast.error(t('upload.tooLarge'))
      return
    }
    if (!realMode) {
      // Mock or deferred (create): show a preview now. When deferred, keep the
      // File on the item so AutoForm uploads it to the real endpoint on save.
      const added = await Promise.all(
        files.map(
          (f) =>
            new Promise<GalleryItem>((resolve) => {
              const reader = new FileReader()
              reader.onload = () =>
                resolve({
                  id: crypto.randomUUID(),
                  url: reader.result as string,
                  position: 0,
                  altView: '',
                  ...(deferred ? { _file: f } : {})
                })
              reader.readAsDataURL(f)
            })
        )
      )
      apply([...items, ...added])
      return
    }
    setBusy(true)
    try {
      const res = await uploadFiles(apiUrl, interpolatePath(endpoints!.upload!.path, { id }), files)
      setItems(normalize(res))
      refresh()
    } catch (e) {
      fail(e)
    } finally {
      setBusy(false)
    }
  }

  const removeAt = async (i: number) => {
    if (disabled || busy) return
    const item = items[i]
    if (realMode && endpoints?.remove) {
      setBusy(true)
      try {
        await sendJson(apiUrl, endpoints.remove.method, interpolatePath(endpoints.remove.path, { id, imageId: item.id }))
        refresh()
      } catch (e) {
        fail(e)
        setBusy(false)
        return
      }
      setBusy(false)
    }
    setItems(items.filter((_, idx) => idx !== i).map((it, idx) => ({ ...it, position: idx })))
  }

  const commitOrder = async (next: GalleryItem[]) => {
    const reindexed = next.map((it, i) => ({ ...it, position: i }))
    setItems(reindexed)
    if (realMode && endpoints?.reorder) {
      setBusy(true)
      try {
        const res = await sendJson(apiUrl, endpoints.reorder.method, interpolatePath(endpoints.reorder.path, { id }), {
          order: reindexed.map((it) => it.id)
        })
        if (Array.isArray(res)) setItems(normalize(res))
        refresh()
      } catch (e) {
        fail(e)
      } finally {
        setBusy(false)
      }
    } else {
      onChange(reindexed)
    }
  }

  const onDropReorder = (to: number) => {
    const from = dragIndex.current
    dragIndex.current = null
    if (from == null || from === to) return
    const next = [...items]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    commitOrder(next)
  }

  const saveAlt = async (i: number, alt: string) => {
    const item = items[i]
    if (item.altView === alt) return
    setItems(items.map((it, idx) => (idx === i ? { ...it, altView: alt } : it)))
    if (realMode && endpoints?.update) {
      try {
        await sendJson(apiUrl, endpoints.update.method, interpolatePath(endpoints.update.path, { id, imageId: item.id }), {
          altView: alt
        })
      } catch (e) {
        fail(e)
      }
    }
  }

  const onPaste = (e: React.ClipboardEvent) => {
    if (disabled) return
    const imgs = imagesFromClipboard(e.clipboardData)
    if (!imgs.length) return
    e.preventDefault()
    addFiles(imgs)
  }

  return (
    <div className="space-y-3" onPaste={onPaste}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        hidden
        disabled={disabled}
        onChange={(e) => addFiles(e.target.files)}
      />

      <div
        tabIndex={disabled ? -1 : 0}
        onDragOver={(e) => {
          if (disabled || dragIndex.current != null) return
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          if (disabled || dragIndex.current != null) return
          e.preventDefault()
          setDragOver(false)
          addFiles(e.dataTransfer.files)
        }}
        className={cn(
          'rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground transition-colors outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40',
          dragOver && 'border-primary bg-primary/5'
        )}
      >
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
        >
          <Upload /> {busy ? '…' : t('upload.button')}
        </Button>
        <div className="mt-2">{deferred ? t('upload.deferredHint') : t('upload.dropHint')}</div>
      </div>

      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {items.map((it, i) => (
            <div
              key={it.id}
              draggable={!disabled}
              onDragStart={() => {
                dragIndex.current = i
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDropReorder(i)}
              className="space-y-2 rounded-md border p-2"
            >
              <div className="relative aspect-video overflow-hidden rounded bg-muted/30">
                <img src={absoluteUrl(apiUrl, it.url)} alt={it.altView ?? ''} className="h-full w-full object-cover" />
                {i === 0 && (
                  <Badge className="absolute left-1 top-1 gap-1">
                    <Star className="h-3 w-3" /> {t('upload.cover')}
                  </Badge>
                )}
                <div className="absolute right-1 top-1 cursor-grab rounded bg-background/70 p-0.5 text-muted-foreground">
                  <GripVertical className="h-4 w-4" />
                </div>
              </div>
              <Input
                defaultValue={it.altView ?? ''}
                placeholder={t('upload.alt')}
                disabled={disabled}
                onBlur={(e) => saveAlt(i, e.target.value)}
              />
              <div className="flex items-center justify-end">
                <Button type="button" size="icon" variant="ghost" disabled={disabled || busy} onClick={() => removeAt(i)}>
                  <X className="text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
