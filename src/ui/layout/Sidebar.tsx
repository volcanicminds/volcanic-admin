/**
 * Sidebar — grouped navigation built from the manifest groups + resources.
 * Collapsible (icons only) with the state persisted in localStorage across
 * reloads. When collapsed, items show their mapped icon, or the first letter of
 * the label as a pseudo-icon when no icon is available.
 */
import { useEffect, useState } from 'react'
import { NavLink } from 'react-router'
import { PanelLeftClose, PanelLeft, UserCog } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useModel, useT } from '@/engine'
import { Icon } from './icons'

const COLLAPSE_KEY = 'volcanic.admin.sidebar.collapsed'

export function Sidebar() {
  const model = useModel()
  const t = useT()

  const [collapsed, setCollapsed] = useState<boolean>(
    () => localStorage.getItem(COLLAPSE_KEY) === '1'
  )

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
  }, [collapsed])

  const groups = [...model.manifest.groups].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const grouped = new Map<string, typeof model.resources>()
  const ungrouped: typeof model.resources = []

  for (const res of model.resources) {
    const g = res.spec.group
    if (g && groups.some((gr) => gr.name === g)) {
      if (!grouped.has(g)) grouped.set(g, [])
      grouped.get(g)!.push(res)
    } else {
      ungrouped.push(res)
    }
  }

  const sortRes = (list: typeof model.resources) =>
    [...list].sort((a, b) => (a.spec.order ?? 0) - (b.spec.order ?? 0))

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

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r bg-card transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div
        className={cn(
          'flex h-14 items-center gap-2 border-b',
          collapsed ? 'justify-center px-0' : 'px-4'
        )}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <span className="text-sm font-bold">V</span>
        </div>
        {!collapsed && <span className="truncate font-semibold">Volcanic Admin</span>}
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden p-2">
        {groups.map((group) => {
          const list = grouped.get(group.name)
          if (!list?.length) return null
          return (
            <div key={group.name} className="space-y-1">
              {collapsed ? (
                <div className="mx-2 border-t" />
              ) : (
                <div className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t(group.label)}
                </div>
              )}
              {sortRes(list).map(renderItem)}
            </div>
          )
        })}
        {ungrouped.length > 0 && (
          <div className="space-y-1">
            {collapsed && <div className="mx-2 border-t" />}
            {sortRes(ungrouped).map(renderItem)}
          </div>
        )}

        <div className="space-y-1">
          {collapsed && <div className="mx-2 border-t" />}
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
        </div>
      </nav>

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
  )
}
