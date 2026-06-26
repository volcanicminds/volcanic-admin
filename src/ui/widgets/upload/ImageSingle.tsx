/**
 * Single-image upload widget (e.g. brand logo, vehicle main image).
 *
 * Mock-friendly: reads the picked file as a data URL and writes it into the
 * form value, so it round-trips through the generic CRUD body without a backend.
 * In `rest` mode this should instead POST to `field.image.endpoints.upload`
 * (multipart) and store the returned URL — the value contract stays the same.
 */
import { useRef } from 'react'
import { Upload, X } from 'lucide-react'
import { Button } from '@/ui/components/ui/button'
import type { WidgetProps } from '../types'

export function ImageSingle({ field, value, onChange, disabled }: WidgetProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const accept = field.image?.accept?.join(',')
  const maxSize = field.image?.maxSize

  const pick = (file?: File | null) => {
    if (!file) return
    if (maxSize && file.size > maxSize) return
    const reader = new FileReader()
    reader.onload = () => onChange(reader.result as string)
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-2">
      <div className="flex h-32 w-full items-center justify-center overflow-hidden rounded-md border border-dashed bg-muted/30">
        {value ? (
          <img src={value} alt="" className="h-full w-full object-contain" />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        disabled={disabled}
        onChange={(e) => pick(e.target.files?.[0])}
      />
      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          <Upload /> Upload
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => onChange(null)}
          >
            <X /> Remove
          </Button>
        )}
      </div>
    </div>
  )
}
