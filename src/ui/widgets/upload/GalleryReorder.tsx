/**
 * Multi-image gallery widget with ordering (e.g. vehicle images). The first
 * item (lowest position) is the cover. Supports add, remove, reorder, and a
 * per-image alt value.
 *
 * Mock-friendly: new files are read as data URLs and stored inline in the array
 * value. In `rest` mode these operations map to the dedicated endpoints
 * (`field.image.endpoints` upload/reorder/update/remove) instead of the body.
 */
import { useRef } from 'react'
import { Upload, X, ArrowLeft, ArrowRight, Star } from 'lucide-react'
import { Button } from '@/ui/components/ui/button'
import { Input } from '@/ui/components/ui/input'
import { Badge } from '@/ui/components/ui/badge'
import type { WidgetProps } from '../types'

interface GalleryItem {
  id: string
  url: string
  position: number
  altView?: string
}

function reindex(items: GalleryItem[]): GalleryItem[] {
  return items.map((it, i) => ({ ...it, position: i }))
}

export function GalleryReorder({ field, value, onChange, disabled }: WidgetProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const items: GalleryItem[] = Array.isArray(value) ? value : []
  const accept = field.image?.accept?.join(',')
  const maxSize = field.image?.maxSize

  const update = (next: GalleryItem[]) => onChange(reindex(next))

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return
    const tasks = Array.from(files)
      .filter((f) => !maxSize || f.size <= maxSize)
      .map(
        (f) =>
          new Promise<GalleryItem>((resolve) => {
            const reader = new FileReader()
            reader.onload = () =>
              resolve({ id: crypto.randomUUID(), url: reader.result as string, position: 0, altView: '' })
            reader.readAsDataURL(f)
          })
      )
    Promise.all(tasks).then((added) => update([...items, ...added]))
  }

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= items.length) return
    const next = [...items]
    ;[next[i], next[j]] = [next[j], next[i]]
    update(next)
  }

  const remove = (i: number) => update(items.filter((_, idx) => idx !== i))

  const setAlt = (i: number, alt: string) =>
    update(items.map((it, idx) => (idx === i ? { ...it, altView: alt } : it)))

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        hidden
        disabled={disabled}
        onChange={(e) => addFiles(e.target.files)}
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        <Upload /> Upload
      </Button>

      {items.length === 0 ? (
        <div className="rounded-md border border-dashed p-4 text-xs text-muted-foreground">
          No images yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {items.map((it, i) => (
            <div key={it.id} className="space-y-2 rounded-md border p-2">
              <div className="relative aspect-video overflow-hidden rounded bg-muted/30">
                <img src={it.url} alt={it.altView ?? ''} className="h-full w-full object-cover" />
                {i === 0 && (
                  <Badge className="absolute left-1 top-1 gap-1">
                    <Star className="h-3 w-3" /> cover
                  </Badge>
                )}
              </div>
              <Input
                value={it.altView ?? ''}
                placeholder="alt"
                disabled={disabled}
                onChange={(e) => setAlt(i, e.target.value)}
              />
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={disabled || i === 0}
                    onClick={() => move(i, -1)}
                  >
                    <ArrowLeft />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={disabled || i === items.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    <ArrowRight />
                  </Button>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={disabled}
                  onClick={() => remove(i)}
                >
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
