/**
 * Default upload widgets shipped by the ui layer. Registered into the override
 * registry so the manifest's image widget ids resolve out of the box. Projects
 * can override any of these by registering the same id later.
 */
import type { ComponentType } from 'react'
import type { WidgetProps } from '../types'
import { ImageSingle } from './ImageSingle'
import { GalleryReorder } from './GalleryReorder'

export { ImageSingle, GalleryReorder }

export const defaultWidgets: Record<string, ComponentType<WidgetProps>> = {
  'image-single': ImageSingle,
  'gallery-reorder': GalleryReorder
}
