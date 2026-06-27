/**
 * @volcanicminds/admin — public library entry.
 * Re-exports the engine (headless) + ui (shadcn) + the <VolcanicAdmin> root.
 * Importing this module also pulls the compiled theme stylesheet.
 */
import './globals.css'

export * from './engine'
export * from './ui'

export { VolcanicAdmin } from './VolcanicAdmin'
export type {
  VolcanicAdminProps,
  AdminCustomRoute,
  AdminOverrides
} from './VolcanicAdmin'
