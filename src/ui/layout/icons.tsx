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
  Image,
  ShoppingCart,
  CircleDot,
  type LucideIcon
} from 'lucide-react'

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
  image: Image,
  cart: ShoppingCart
}

export function Icon({ name, className }: { name?: string; className?: string }) {
  const Cmp = (name && ICONS[name]) || CircleDot
  return <Cmp className={className} />
}
