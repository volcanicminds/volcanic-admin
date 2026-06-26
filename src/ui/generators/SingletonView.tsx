/**
 * Singleton view — a single edit screen (find-or-create server-side). No list,
 * create, or delete. Used for resources like `company`.
 */
import { AutoForm } from './AutoForm'
import { useT } from '@/engine'
import type { ResourceModel } from '@/engine'

/** Fixed id used for singletons (the backend capability resolves find-or-create). */
export const SINGLETON_ID = 'singleton'

export function SingletonView({ model }: { model: ResourceModel }) {
  const t = useT()
  // Singletons edit the single row; the data layer resolves find-or-create.
  return (
    <AutoForm
      model={model}
      action="edit"
      id={SINGLETON_ID}
      redirect={false}
      title={t(model.spec.label.plural)}
    />
  )
}
