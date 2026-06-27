/**
 * Custom view — registered as `vehicle-show`. Used when the manifest sets the
 * vehicle resource's `views.show` to "vehicle-show". Receives { model, id }.
 */
import { useOne } from '@refinedev/core'
import { useT } from '@volcanicminds/admin'
import type { ResourceModel } from '@volcanicminds/admin'

export function VehicleShow({ model, id }: { model: ResourceModel; id?: string }) {
  const t = useT()
  const { data } = useOne({ resource: model.spec.name, id })
  const record = data?.data

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">
        {record?.name ?? t(model.spec.label.singular)}
      </h1>
      <div className="rounded-xl border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          Custom show screen for <strong>{model.spec.name}</strong> #{id}. Build any layout
          here using <code>model.fields</code> and Refine hooks.
        </p>
      </div>
    </div>
  )
}
