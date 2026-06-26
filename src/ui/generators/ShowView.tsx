/**
 * Generated detail (show) view. Renders the record as grouped read-only fields,
 * reusing the form sections for layout coherence with edit.
 */
import { useState } from 'react'
import { useOne, useNavigation, useDelete } from '@refinedev/core'
import { useParams } from 'react-router'
import { Pencil, ArrowLeft, Trash2 } from 'lucide-react'
import { Button } from '@/ui/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/ui/components/ui/dialog'
import { useT } from '@/engine'
import type { ResourceModel } from '@/engine'
import { FieldValue } from '@/ui/widgets/display'

export function ShowView({ model }: { model: ResourceModel }) {
  const t = useT()
  const { id } = useParams()
  const { spec } = model
  const { list, edit } = useNavigation()
  const { mutate: deleteOne } = useDelete()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data, isLoading } = useOne({ resource: spec.name, id })
  const record = data?.data

  const canDelete = spec.capabilities?.delete !== false && model.hasAction('delete')

  const sections =
    model.formSections.length > 0
      ? model.formSections
      : [{ group: 'default', fields: model.fields }]

  const titleParts = Array.isArray(spec.titleField)
    ? spec.titleField
    : [spec.titleField ?? 'name']
  const title =
    (record &&
      titleParts
        .map((f) => record[f])
        .filter((v) => v != null && v !== '')
        .join(' ')) ||
    t(spec.label.singular)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{isLoading ? '…' : title}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => list(spec.name)}>
            <ArrowLeft /> {t('action.back')}
          </Button>
          {model.hasAction('update') && (
            <Button onClick={() => id && edit(spec.name, id)}>
              <Pencil /> {t('action.edit')}
            </Button>
          )}
          {canDelete && (
            <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 /> {t('action.delete')}
            </Button>
          )}
        </div>
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('action.delete.confirmTitle')}</DialogTitle>
            <DialogDescription>{t('action.delete.confirmText')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              {t('action.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (id)
                  deleteOne(
                    { resource: spec.name, id },
                    { onSuccess: () => list(spec.name) }
                  )
                setConfirmDelete(false)
              }}
            >
              {t('action.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {record &&
        sections.map((section) => (
          <Card key={section.group}>
            {section.group !== 'default' && (
              <CardHeader>
                <CardTitle className="text-base">{t(`group.${section.group}`)}</CardTitle>
              </CardHeader>
            )}
            <CardContent className="grid grid-cols-1 gap-4 pt-6 md:grid-cols-2">
              {section.fields.map((field) => (
                <div
                  key={field.name}
                  className={
                    field.form?.colSpan === 2 || field.type === 'image' || field.type === 'richtext'
                      ? 'space-y-1 md:col-span-2'
                      : 'space-y-1'
                  }
                >
                  <div className="text-xs font-medium text-muted-foreground">
                    {t(field.label ?? `field.${spec.name}.${field.name}`)}
                  </div>
                  <div className="text-sm">
                    <FieldValue record={record} field={field} t={t} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
    </div>
  )
}
