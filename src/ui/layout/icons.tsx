/** Maps manifest icon name strings to lucide-react components. */
import {
  Car,
  Layers,
  Users,
  Mail,
  Cog,
  Building2,
  Tag,
  Boxes,
  FileText,
  Newspaper,
  HelpCircle,
  Inbox,
  Image,
  ShoppingCart,
  CircleDot,
  type LucideIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'

const ICONS: Record<string, LucideIcon> = {
  car: Car,
  layers: Layers,
  users: Users,
  mail: Mail,
  cog: Cog,
  building: Building2,
  tag: Tag,
  boxes: Boxes,
  file: FileText,
  newspaper: Newspaper,
  'help-circle': HelpCircle,
  inbox: Inbox,
  image: Image,
  cart: ShoppingCart
}

export function hasIcon(name?: string): boolean {
  return Boolean(name && ICONS[name])
}

/**
 * Renders the mapped lucide icon for `name`. If unknown and `fallbackLabel` is
 * given, renders its first letter as a pseudo-icon (used by the collapsed
 * sidebar). Otherwise a neutral placeholder.
 */
export function Icon({
  name,
  className,
  fallbackLabel
}: {
  name?: string
  className?: string
  fallbackLabel?: string
}) {
  const Cmp = name ? ICONS[name] : undefined
  if (Cmp) return <Cmp className={className} />
  if (fallbackLabel) {
    return (
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-sm bg-muted text-[10px] font-semibold uppercase leading-none',
          className
        )}
      >
        {fallbackLabel.trim().charAt(0) || '?'}
      </span>
    )
  }
  return <CircleDot className={className} />
}
