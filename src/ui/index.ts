/**
 * @volcanicminds/admin — ui (shadcn/ui implementation of the engine model).
 * Consumes the engine; the engine never imports this layer.
 */
export { AdminLayout } from './layout/AdminLayout'
export { Sidebar } from './layout/Sidebar'
export { TenantSwitcher } from './layout/TenantSwitcher'
export { LoginView } from './views/LoginView'
export { ForgotPasswordView } from './views/ForgotPasswordView'
export { ResetPasswordView } from './views/ResetPasswordView'
export { AccountView } from './views/AccountView'

export { resourceRouteElements } from './generators/routes'
export { ListView } from './generators/ListView'
export { ListTable } from './generators/ListTable'
export { ListCards } from './generators/ListCards'
export { ListIO } from './generators/ListIO'
export { ShowView } from './generators/ShowView'
export { AutoForm } from './generators/AutoForm'
export { SingletonView } from './generators/SingletonView'

export { FieldInput, formFieldName } from './widgets/inputs'
export { FieldCell, FieldValue } from './widgets/display'
export { ReferenceSelect } from './widgets/ReferenceSelect'
export type { WidgetProps } from './widgets/types'
export { defaultWidgets, ImageSingle, GalleryReorder } from './widgets/upload'

export { notificationProvider } from './notification'
export { Toaster } from './components/ui/sonner'

export { AdminConfigProvider, useAdminConfig } from './config'
export type { AdminNavItem } from './config'
