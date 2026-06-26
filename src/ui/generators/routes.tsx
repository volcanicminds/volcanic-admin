/**
 * Route generation — turns the AdminModel into react-router <Route> elements.
 * Each screen resolves a view override from the registry (manifest
 * `views.{list,create,edit,show}`); absent an override, the default generator
 * renders. Returns an array of <Route> for use inside <Routes>.
 */
import { Route, useParams } from 'react-router'
import type { ReactNode } from 'react'
import { useT, useRegistry } from '@/engine'
import type { AdminModel, ResourceModel } from '@/engine'
import { ListView } from './ListView'
import { ShowView } from './ShowView'
import { AutoForm } from './AutoForm'
import { SingletonView } from './SingletonView'

type ViewSlot = 'list' | 'create' | 'edit' | 'show'

function useOverride(model: ResourceModel, slot: ViewSlot) {
  const registry = useRegistry()
  return registry.resolve('view', model.spec.views?.[slot])
}

function ListPage({ model }: { model: ResourceModel }) {
  const Override = useOverride(model, 'list')
  return Override ? <Override model={model} /> : <ListView model={model} />
}

function CreatePage({ model }: { model: ResourceModel }) {
  const t = useT()
  const Override = useOverride(model, 'create')
  if (Override) return <Override model={model} />
  return <AutoForm model={model} action="create" title={t(model.spec.label.singular)} />
}

function EditPage({ model }: { model: ResourceModel }) {
  const t = useT()
  const { id } = useParams()
  const Override = useOverride(model, 'edit')
  if (Override) return <Override model={model} id={id} />
  return <AutoForm model={model} action="edit" id={id} title={t(model.spec.label.singular)} />
}

function ShowPage({ model }: { model: ResourceModel }) {
  const Override = useOverride(model, 'show')
  return Override ? <Override model={model} /> : <ShowView model={model} />
}

function SingletonPage({ model }: { model: ResourceModel }) {
  const Override = useOverride(model, 'edit')
  return Override ? <Override model={model} /> : <SingletonView model={model} />
}

export function resourceRouteElements(model: AdminModel): ReactNode[] {
  const routes: ReactNode[] = []

  for (const res of model.resources) {
    const { spec } = res
    const base = spec.path

    if (spec.singleton) {
      routes.push(<Route key={spec.name} path={base} element={<SingletonPage model={res} />} />)
      continue
    }

    routes.push(<Route key={`${spec.name}-list`} path={base} element={<ListPage model={res} />} />)
    if (res.hasAction('create')) {
      routes.push(
        <Route key={`${spec.name}-create`} path={`${base}/create`} element={<CreatePage model={res} />} />
      )
    }
    if (res.hasAction('update')) {
      routes.push(
        <Route key={`${spec.name}-edit`} path={`${base}/edit/:id`} element={<EditPage model={res} />} />
      )
    }
    routes.push(
      <Route key={`${spec.name}-show`} path={`${base}/show/:id`} element={<ShowPage model={res} />} />
    )
  }

  return routes
}
