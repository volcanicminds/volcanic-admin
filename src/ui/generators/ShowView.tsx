/**
 * Generated detail (show) view. Renders the record as grouped read-only fields,
 * reusing the form sections for layout coherence with edit.
 */
import { useOne, useNavigation } from '@refinedev/core'
import { useParams } from 'react-router'
import { Pencil, ArrowLeft } from 'lucide-react'
import { Button } from '@/ui/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/ui/card'
import { useT } from '@/engine'
import type { ResourceModel } from '@/engine'
import { FieldValue } from '@/ui/widgets/display'

export function ShowView({ model }: { model: ResourceModel }) {
  const t = useT()
  const { id } = useParams()
  const { spec } = model
  const { list, edit } = useNavigation()

  const { data, isLoading } = useOne({ resource: spec.name, id })
  const record = data?.data

  const sections =
    model.formSections.length > 0
      ? model.formSections
      : [{ group: 'default', fields: model.fields }]

  const title = record?.[spec.titleField ?? 'name'] ?? t(spec.label.singular)

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
        </div>
      </div>

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
                <div key={field.name} className="space-y-1">
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
