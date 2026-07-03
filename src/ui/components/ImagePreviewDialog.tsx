/**
 * Reusable image lightbox — shows a single image large in a centered modal. Used
 * by the upload widgets so clicking a thumbnail (gallery) or the single-image
 * preview opens it at full size. Purely presentational: the caller owns the open
 * state and which image is shown.
 */
import { useT } from '@/engine'
import { Dialog, DialogContent, DialogTitle } from '@/ui/components/ui/dialog'

export interface ImagePreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  src?: string | null
  alt?: string
}

export function ImagePreviewDialog({ open, onOpenChange, src, alt }: ImagePreviewDialogProps) {
  const t = useT()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[92vw] p-2 sm:max-w-3xl">
        {/* Radix requires a title for accessibility; the image is the real content. */}
        <DialogTitle className="sr-only">{alt || t('upload.preview')}</DialogTitle>
        {src && (
          <img
            src={src}
            alt={alt ?? ''}
            className="mx-auto max-h-[82vh] w-auto max-w-full rounded-md object-contain"
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
