import type { ResolvedField } from '@/engine'

export interface WidgetProps {
  field: ResolvedField
  value: any
  onChange: (value: any) => void
  disabled?: boolean
  /** translate function (manifest i18n keys). */
  t: (key?: string, vars?: Record<string, string | number>) => string
}
