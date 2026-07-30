/**
 * The taxonomy side of the `tags` widget: a button opening a two-level menu of the
 * option set. Groups are submenus; an option toggles on click and shows a check when
 * selected. The group linked to a sibling field (see FieldFormSpec.featureFrom) leads
 * the menu, starred and already open.
 *
 * Featuring only REORDERS and MARKS — it never filters. Whatever the sibling field
 * holds (or doesn't), every option stays reachable.
 */
import { Plus, Star } from 'lucide-react'
import { Button } from '@/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent
} from '@/ui/components/ui/dropdown-menu'
import type { EnumOption } from '@/engine'
import type { WidgetProps } from '../types'
import { keyOf, type Taxonomy } from './taxonomy'

interface TagsMenuProps {
  taxonomy: Taxonomy
  /** Comparison keys of the selected values (see keyOf). */
  selected: Set<string>
  featuredKey?: string
  disabled?: boolean
  onToggle: (value: string) => void
  t: WidgetProps['t']
}

export function TagsMenu({
  taxonomy,
  selected,
  featuredKey,
  disabled,
  onToggle,
  t
}: TagsMenuProps) {
  const item = (opt: EnumOption) => (
    <DropdownMenuCheckboxItem
      key={opt.value}
      checked={selected.has(keyOf(opt.value))}
      // Suppresses CLOSING only, so several tags can be picked in one visit. Radix
      // still fires onCheckedChange, which is why the toggle lives ONLY there:
      // doing it here as well would toggle twice and look like a dead click.
      onSelect={(e) => e.preventDefault()}
      onCheckedChange={() => onToggle(opt.value)}
    >
      {t(opt.label)}
    </DropdownMenuCheckboxItem>
  )

  const [featured, ...rest] = taxonomy.groups
  const hasFeatured = Boolean(featuredKey) && featured?.key === featuredKey
  const groups = hasFeatured ? rest : taxonomy.groups

  return (
    // modal={false}: the default traps pointer events on the body, so the click that
    // dismisses the menu is swallowed instead of landing in the search input.
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={disabled}>
          <Plus /> {t('tags.add')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[60vh] w-72 overflow-y-auto">
        {hasFeatured && (
          <>
            <DropdownMenuLabel className="flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 fill-current text-amber-500" />
              {featured.label}
            </DropdownMenuLabel>
            {featured.options.map(item)}
            {(groups.length > 0 || taxonomy.loose.length > 0) && <DropdownMenuSeparator />}
          </>
        )}

        {groups.map((group) => (
          <DropdownMenuSub key={group.key}>
            <DropdownMenuSubTrigger>{group.label}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-[60vh] w-64 overflow-y-auto">
              {group.options.map(item)}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ))}

        {taxonomy.loose.length > 0 && groups.length > 0 && <DropdownMenuSeparator />}
        {taxonomy.loose.map(item)}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
