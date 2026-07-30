import type { Control } from 'react-hook-form'
import type { ResolvedField } from '@/engine'

export interface WidgetProps {
  field: ResolvedField
  value: any
  onChange: (value: any) => void
  disabled?: boolean
  /** translate function (manifest i18n keys). */
  t: (key?: string, vars?: Record<string, string | number>) => string
  /**
   * The form's react-hook-form control, when the widget is rendered inside a form
   * (absent in read-only contexts). Only needed by widgets that must also drive a
   * SIBLING field of the same record — e.g. the single-image widget writes the alt
   * text, which lives in its own column (see ImageSpec.altField) yet belongs next to
   * the image in the UI. Regular widgets ignore it and use value/onChange.
   */
  control?: Control
}
