/**
 * Widget-registry entries the engine ships out of the box, merged from each
 * widget group (upload, rich text, …). Registered into the override registry in
 * VolcanicAdmin so the manifest's widget ids resolve without any app wiring;
 * projects can override any id by registering the same id later.
 */
import type { ComponentType } from 'react'
import type { WidgetProps } from './types'
import { defaultWidgets as uploadWidgets } from './upload'
import { richtextWidgets } from './richtext'

export const defaultWidgets: Record<string, ComponentType<WidgetProps>> = {
  ...uploadWidgets,
  ...richtextWidgets
}
