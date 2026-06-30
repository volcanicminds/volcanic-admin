/**
 * Single-image upload widget (e.g. brand logo).
 *
 * Real mode (the field declares `image.endpoints.upload` and the record already
 * exists): the picked file is POSTed as multipart to the dedicated endpoint and
 * the stored URL is read back from the response. Create mode (no id yet) asks the
 * user to save first. With no endpoints (mock), it falls back to an inline data
 * URL so it round-trips through the generic CRUD body without a backend.
 */
import { useRef, useState } from 'react'
import { useApiUrl, useInvalidate, useResource } from '@refinedev/core'
import { useParams } from 'react-router'
import { toast } from 'sonner'
import { Upload, X } from 'lucide-react'
import { Button } from '@/ui/components/ui/button'
import { cn } from '@/lib/utils'
import { interpolatePath } from '@/engine'
import type { WidgetProps } from '../types'
import { uploadFiles, sendJson, absoluteUrl } from './rest'

export function ImageSingle({ field, value, onChange, disabled, t }: WidgetProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const apiUrl = useApiUrl()
  const { id } = useParams()
  const invalidate = useInvalidate()
  const { identifier } = useResource()
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const accept = field.image?.accept?.join(',')
  const maxSize = field.image?.maxSize
  const endpoints = field.image?.endpoints
  const realMode = Boolean(endpoints?.upload && id)
  const needsSave = Boolean(endpoints?.upload && !id)

  const refresh = () => {
    if (identifier) invalidate({ resource: identifier, invalidates: ['list', 'detail'] })
  }

  const handleFile = async (file?: File | null) => {
    if (!file || disabled || busy) return
    if (maxSize && file.size > maxSize) {
      toast.error(t('upload.tooLarge'))
      return
    }
    if (!realMode) {
      // Mock / no backend: inline the file as a data URL.
      const reader = new FileReader()
      reader.onload = () => onChange(reader.result as string)
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

  const src = realMode || typeof value === 'string' ? absoluteUrl(apiUrl, value) : value

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          if (disabled || needsSave) return
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
          'flex h-32 w-full items-center justify-center overflow-hidden rounded-md border border-dashed bg-muted/30 transition-colors',
          dragOver && 'border-primary bg-primary/5'
        )}
      >
        {busy ? (
          <span className="text-xs text-muted-foreground">…</span>
        ) : src ? (
          <img src={src} alt="" className="h-full w-full object-contain" />
        ) : (
          <span className="px-2 text-center text-xs text-muted-foreground">
            {needsSave ? t('upload.saveFirst') : t('upload.hint')}
          </span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        disabled={disabled || needsSave}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled || busy || needsSave}
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
    </div>
  )
}
