/**
 * Reusable confirmation modal — a centered dialog with a title, optional message
 * and cancel/confirm actions. Used everywhere the admin needs the user to confirm
 * an action (record delete, discarding unsaved changes, …) so every confirmation
 * looks and behaves the same instead of the browser's native window.confirm.
 */
import type { ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/ui/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/ui/components/ui/dialog'

export interface ConfirmDialogProps {
  open: boolean
  /** Called when the dialog requests to close (overlay/esc/close button or cancel). */
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  /** Runs when the user dismisses without confirming (cancel/esc/overlay). */
  onCancel?: () => void
  /** Render the confirm action as destructive and show a warning glyph. */
  destructive?: boolean
  /** Disable both actions while an async confirm is in flight. */
  busy?: boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  destructive,
  busy
}: ConfirmDialogProps) {
  const dismiss = () => {
    onCancel?.()
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Any close gesture (overlay, esc, ×) counts as a cancel.
        if (!next) dismiss()
        else onOpenChange(true)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3 text-left">
            {destructive && (
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="size-5" />
              </span>
            )}
            <div className="space-y-1.5">
              <DialogTitle>{title}</DialogTitle>
              {description && <DialogDescription>{description}</DialogDescription>}
            </div>
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={busy} onClick={dismiss}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? 'destructive' : 'default'}
            disabled={busy}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
