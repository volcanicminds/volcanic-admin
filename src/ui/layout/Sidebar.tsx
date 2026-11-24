/**
 * Sidebar: grouped navigation built from the manifest groups and resources.
 * From the `md` breakpoint it is a column, collapsible (icons only) with the state persisted in
 * localStorage across reloads; when collapsed, items show their mapped icon, or the first letter
 * of the label as a pseudo-icon when no icon is available. Below `md` the same navigation opens
 * as a drawer from the header's menu button (`MobileNav`), so the page keeps the full width.
 */
import { useEffect, useState } from 'react'
import { NavLink } from 'react-router'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { usePermissions } from '@refinedev/core'
import { Bell, Menu, PanelLeftClose, PanelLeft, UserCog, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useModel, useT, canReachResource } from '@/engine'
import { Button } from '@/ui/components/ui/button'
import { Icon } from './icons'
import { useAdminConfig } from '@/ui/config'
import { useNotices } from '@/ui/notices/NoticesProvider'

const COLLAPSE_KEY = 'volcanic.admin.sidebar.collapsed'
// Tailwind's `md`: the column shows from here, the drawer below.
const DESKTOP = '(min-width: 768px)'

export function Sidebar() {
  const [collapsed, setCollapsed] = useState<boolean>(() => localStorage.getItem(COLLAPSE_KEY) === '1')

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
  }, [collapsed])

  // The breakpoint sits on a wrapper that carries no other display class: a project's own utility
  // CSS loads after the admin's, so its `.flex` or `.hidden` would beat a `md:` variant written
  // next to them on the same element.
  return (
    <div className="h-full shrink-0 max-md:hidden">
      <aside
        className={cn(
          'flex h-full flex-col border-r bg-card transition-[width] duration-200',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        <SidebarBody collapsed={collapsed} />
        <div className="border-t p-2">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? 'Expand' : 'Collapse'}
            className={cn(
              'flex w-full items-center gap-2 rounded-md py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
              collapsed ? 'justify-center px-0' : 'px-3'
            )}
          >
            {collapsed ? (
              <PanelLeft className="h-4 w-4 shrink-0" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4 shrink-0" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </div>
  )
}

/**
 * The menu button of the header below `md`, and the drawer it opens. A Radix dialog: focus moves
 * in and is trapped, Escape and the overlay close it, focus returns to the button. A link closes
 * it on the way to its page, and widening the window past `md` closes it as well, since the
 * column takes over there.
 */
export function MobileNav() {
  const t = useT()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const desktop = window.matchMedia(DESKTOP)
    const close = () => desktop.matches && setOpen(false)
    desktop.addEventListener('change', close)
    return () => desktop.removeEventListener('change', close)
  }, [open])

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      {/* On a wrapper of its own, as the column's breakpoint: the button's `inline-flex` would win. */}
      <div className="-ml-2 shrink-0 md:hidden">
        <DialogPrimitive.Trigger asChild>
          <Button variant="ghost" size="icon" aria-label={t('nav.openMenu')}>
            <Menu className="h-5 w-5" />
          </Button>
        </DialogPrimitive.Trigger>
      </div>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('a')) setOpen(false)
          }}
          className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r bg-card shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left"
        >
          <DialogPrimitive.Title className="sr-only">{t('nav.menu')}</DialogPrimitive.Title>
          <SidebarBody collapsed={false} />
          <DialogPrimitive.Close asChild>
            <Button variant="ghost" size="icon" className="absolute right-2 top-2.5" aria-label={t('nav.closeMenu')}>
              <X className="h-4 w-4" />
            </Button>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

/** The brand and the navigation, shared by the column and the drawer. */
function SidebarBody({ collapsed }: { collapsed: boolean }) {
  const model = useModel()
  const t = useT()
  const { navExtras, branding } = useAdminConfig()
  const notices = useNotices()
  const appName = branding?.appName ?? 'Volcanic Admin'

  // Hide resources the current user cannot reach (defense-in-depth; the API also enforces).
  // Until permissions resolve, show everything to avoid a flash of an empty menu.
  const { data: perms } = usePermissions<string[]>()
  const visibleResources =
    perms === undefined ? model.resources : model.resources.filter((res) => canReachResource(res, perms ?? []))

  const groups = [...model.manifest.groups].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const grouped = new Map<string, typeof model.resources>()
  const ungrouped: typeof model.resources = []

  for (const res of visibleResources) {
    const g = res.spec.group
    if (g && groups.some((gr) => gr.name === g)) {
      if (!grouped.has(g)) grouped.set(g, [])
      grouped.get(g)!.push(res)
    } else {
      ungrouped.push(res)
    }
  }

  const sortRes = (list: typeof model.resources) => [...list].sort((a, b) => (a.spec.order ?? 0) - (b.spec.order ?? 0))

  const renderItem = (res: (typeof model.resources)[number]) => {
    const label = t(res.spec.label.plural)
    return (
      <NavLink
        key={res.spec.name}
        to={`/${res.spec.path}`}
        title={collapsed ? label : undefined}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-2 rounded-md py-2 text-sm transition-colors',
            collapsed ? 'justify-center px-0' : 'px-3',
            isActive
              ? 'bg-primary/10 font-medium text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          )
        }
      >
        <Icon name={res.spec.icon} fallbackLabel={label} className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="truncate">{label}</span>}
      </NavLink>
    )
  }

  const visibleGroups = groups.filter((g) => grouped.get(g.name)?.length)

  const noticesLink = notices.available && (
    <NavLink
      to="/notices"
      title={collapsed ? t('nav.notices') : undefined}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2 rounded-md py-2 text-sm transition-colors',
          collapsed ? 'justify-center px-0' : 'px-3',
          isActive
            ? 'bg-primary/10 font-medium text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        )
      }
    >
      <span className="relative shrink-0">
        <Bell className="h-4 w-4" />
        {collapsed && notices.unseen > 0 && (
          <span className="absolute -right-1 -top-1 size-2 rounded-full bg-primary" aria-hidden />
        )}
      </span>
      {!collapsed && <span className="truncate">{t('nav.notices')}</span>}
      {!collapsed && notices.unseen > 0 && (
        <span className="ml-auto rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
          {notices.unseen}
        </span>
      )}
    </NavLink>
  )

  const personalLinks = (
    <>
      {noticesLink}
      <NavLink
        to="/account"
        title={collapsed ? t('nav.account') : undefined}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-2 rounded-md py-2 text-sm transition-colors',
            collapsed ? 'justify-center px-0' : 'px-3',
            isActive
              ? 'bg-primary/10 font-medium text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          )
        }
      >
        <UserCog className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="truncate">{t('nav.account')}</span>}
      </NavLink>
    </>
  )

  return (
    <>
      <div className={cn('flex h-14 shrink-0 items-center gap-2 border-b', collapsed ? 'justify-center px-0' : 'px-4')}>
        {branding?.logo && !collapsed ? (
          branding.logoDark ? (
            // Two variants swapped by the .dark class (CSS-only, no JS).
            <>
              <img
                src={branding.logo}
                alt={appName}
                className="block w-auto object-contain dark:hidden"
                style={{
                  height: branding.logoHeight ?? 28,
                  maxWidth: branding.logoMaxWidth ?? 170
                }}
              />
              <img
                src={branding.logoDark}
                alt={appName}
                className="hidden w-auto object-contain dark:block"
                style={{
                  height: branding.logoHeight ?? 28,
                  maxWidth: branding.logoMaxWidth ?? 170
                }}
              />
            </>
          ) : (
            <img
              src={branding.logo}
              alt={appName}
              className="w-auto object-contain"
              style={{
                height: branding.logoHeight ?? 28,
                maxWidth: branding.logoMaxWidth ?? 170
              }}
            />
          )
        ) : branding?.logoCollapsed && collapsed ? (
          branding.logoCollapsedDark ? (
            <>
              <img src={branding.logoCollapsed} alt={appName} className="block h-7 w-7 object-contain dark:hidden" />
              <img
                src={branding.logoCollapsedDark}
                alt={appName}
                className="hidden h-7 w-7 object-contain dark:block"
              />
            </>
          ) : (
            <img src={branding.logoCollapsed} alt={appName} className="h-7 w-7 object-contain" />
          )
        ) : (
          <>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <span className="text-sm font-bold">{appName.charAt(0).toUpperCase()}</span>
            </div>
            {!collapsed && <span className="truncate font-semibold">{appName}</span>}
          </>
        )}
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden p-2">
        {navExtras.length > 0 && (
          <div className="space-y-1">
            {[...navExtras]
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  title={collapsed ? t(item.label) : undefined}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 rounded-md py-2 text-sm transition-colors',
                      collapsed ? 'justify-center px-0' : 'px-3',
                      isActive
                        ? 'bg-primary/10 font-medium text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )
                  }
                >
                  <Icon name={item.icon} fallbackLabel={t(item.label)} className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="truncate">{t(item.label)}</span>}
                </NavLink>
              ))}
          </div>
        )}
        {visibleGroups.map((group, i) => (
          <div key={group.name} className="space-y-1">
            {collapsed ? (
              <div className="mx-2 border-t" />
            ) : (
              <div className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t(group.label)}
              </div>
            )}
            {sortRes(grouped.get(group.name)!).map(renderItem)}
            {/* Notices and account join the last group so they sit directly under its last item. */}
            {i === visibleGroups.length - 1 && ungrouped.length === 0 && personalLinks}
          </div>
        ))}
        {ungrouped.length > 0 && (
          <div className="space-y-1">
            {collapsed && <div className="mx-2 border-t" />}
            {sortRes(ungrouped).map(renderItem)}
            {personalLinks}
          </div>
        )}
        {visibleGroups.length === 0 && ungrouped.length === 0 && <div className="space-y-1">{personalLinks}</div>}
      </nav>
    </>
  )
}
