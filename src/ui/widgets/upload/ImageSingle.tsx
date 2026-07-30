/**
 * Single-image upload widget (e.g. brand logo).
 *
 * Real mode (the field declares `image.endpoints.upload` and the record already
 * exists): the picked file is POSTed as multipart to the dedicated endpoint and
 * the stored URL is read back from the response. Deferred mode (endpoints declared
 * but no id yet, i.e. create): the value becomes `{ url, _pendingFile }` so a preview
 * shows and AutoForm uploads the file once the record is created. With no endpoints
 * (mock), it falls back to an inline data URL so it round-trips through the generic
 * CRUD body without a backend.
 */
import { useRef, useState } from 'react'
import { Controller } from 'react-hook-form'
import { useApiUrl, useInvalidate, useResource } from '@refinedev/core'
import { useParams } from 'react-router'
import { toast } from 'sonner'
import { Upload, X } from 'lucide-react'
import { Button } from '@/ui/components/ui/button'
import { Input } from '@/ui/components/ui/input'
import { cn } from '@/lib/utils'
import { interpolatePath } from '@/engine'
import { ImagePreviewDialog } from '@/ui/components/ImagePreviewDialog'
import type { WidgetProps } from '../types'
import { uploadFiles, sendJson, absoluteUrl, imagesFromClipboard } from './rest'
import { prepareUploads } from './resize'

export function ImageSingle({ field, value, onChange, disabled, t, control }: WidgetProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const apiUrl = useApiUrl()
  const { id } = useParams()
  const invalidate = useInvalidate()
  const { identifier } = useResource()
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)

  const accept = field.image?.accept?.join(',')
  const maxSize = field.image?.maxSize
  const endpoints = field.image?.endpoints
  // Alt text of a single image is a plain column of the same record (the gallery
  // instead keeps it per row): edited here so it sits with the image, but bound to
  // its own form field — AutoForm sends it in the body with everything else.
  const altField = field.image?.altField
  const realMode = Boolean(endpoints?.upload && id)
  // Create: no id yet — stage the file locally and let AutoForm upload it on save.
  const deferred = Boolean(endpoints?.upload && !id)

  const refresh = () => {
    if (identifier) invalidate({ resource: identifier, invalidates: ['list', 'detail'] })
  }

  const handleFile = async (picked?: File | null) => {
    if (!picked || disabled || busy) return
    // Resize FIRST, then check the size ceiling: what matters is the weight of what
    // we actually send, so a heavy source that shrinks under the limit is fine.
    setBusy(true)
    let file = picked
    try {
      file = (await prepareUploads([picked], field.image?.resize))[0] ?? picked
    } finally {
      setBusy(false)
    }
    if (maxSize && file.size > maxSize) {
      toast.error(t('upload.tooLarge'))
      return
    }
    if (!realMode) {
      // Mock: inline as a data URL. Deferred (create): also keep the File so
      // AutoForm uploads it to the real endpoint once the record exists.
      const reader = new FileReader()
      reader.onload = () =>
        onChange(deferred ? { url: reader.result as string, _pendingFile: file } : (reader.result as string))
      reader.readAsDataURL(file)
      return
    }
    setBusy(true)
    try {
      const res = await uploadFiles(apiUrl, interpolatePath(endpoints!.upload!.path, { id }), [file])
      const url = res?.[field.name] ?? res?.url ?? res?.logoUrl ?? (typeof res === 'string' ? res : null)
      onChange(url ?? null)
      refresh()
    } catch (e) {
      toast.error((e as Error)?.message ?? t('upload.failed'))
    } finally {
      setBusy(false)
    }
  }

  const handleRemove = async () => {
    if (disabled || busy) return
    if (realMode && endpoints?.remove) {
      setBusy(true)
      try {
        await sendJson(apiUrl, endpoints.remove.method, interpolatePath(endpoints.remove.path, { id }))
        refresh()
      } catch (e) {
        toast.error((e as Error)?.message ?? t('upload.failed'))
        setBusy(false)
        return
      }
      setBusy(false)
    }
    onChange(null)
  }

  // Deferred value is `{ url, _pendingFile }`; every other mode stores a URL string.
  const rawUrl = value && typeof value === 'object' ? (value as { url?: string }).url : (value as string | null)
  const src = rawUrl ? absoluteUrl(apiUrl, rawUrl) : null

  const onPaste = (e: React.ClipboardEvent) => {
    if (disabled) return
    const imgs = imagesFromClipboard(e.clipboardData)
    if (!imgs.length) return
    e.preventDefault()
    handleFile(imgs[0])
  }

  return (
    <div className="space-y-2" onPaste={onPaste}>
      <div
        tabIndex={disabled ? -1 : 0}
        onDragOver={(e) => {
          if (disabled) return
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          handleFile(e.dataTransfer.files?.[0])
        }}
        className={cn(
          'flex h-32 w-full items-center justify-center overflow-hidden rounded-md border border-dashed bg-muted/30 transition-colors outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40',
          dragOver && 'border-primary bg-primary/5'
        )}
      >
        {busy ? (
          <span className="text-xs text-muted-foreground">…</span>
        ) : src ? (
          <img
            src={src}
            alt=""
            className="h-full w-full cursor-zoom-in object-contain"
            title={t('upload.preview')}
            onClick={() => setPreviewOpen(true)}
          />
        ) : (
          <span className="px-2 text-center text-xs text-muted-foreground">
            {deferred ? t('upload.deferredHint') : t('upload.hint')}
          </span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        disabled={disabled}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
        >
          <Upload /> {t('upload.button')}
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" disabled={disabled || busy} onClick={handleRemove}>
            <X /> {t('action.remove')}
          </Button>
        )}
      </div>

      {/* Always mounted (not gated on the preview): the field stays registered, so
          what is on screen is exactly what gets saved. Hiding it after a Remove would
          leave its last value in the form, silently submitting an alt with no image. */}
      {altField && control && (
        <Controller
          name={altField}
          control={control}
          defaultValue=""
          render={({ field: alt }) => (
            <Input
              value={alt.value ?? ''}
              placeholder={t('upload.alt')}
              disabled={disabled}
              onChange={(e) => alt.onChange(e.target.value)}
            />
          )}
        />
      )}

      <ImagePreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} src={src} alt="" />
    </div>
  )
}
