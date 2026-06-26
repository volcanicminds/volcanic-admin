/**
 * Admin shell — sidebar + topbar (tenant switcher, locale, user menu) + content
 * outlet. Consumes engine hooks only; no manifest knowledge beyond what the
 * Sidebar reads.
 */
import { Outlet, useNavigate } from 'react-router'
import { useGetIdentity, useLogout } from '@refinedev/core'
import { LogOut, Globe, UserCog, Building2 } from 'lucide-react'
import { useI18n } from '@/engine'
import { Button } from '@/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/ui/components/ui/dropdown-menu'
import { Sidebar } from './Sidebar'
import { TenantSwitcher } from './TenantSwitcher'

interface Identity {
  firstName?: string
  lastName?: string
  email?: string
  username?: string
}

export function AdminLayout() {
  const { data: identity } = useGetIdentity<Identity>()
  const { mutate: logout } = useLogout()
  const { locale, locales, setLocale, t } = useI18n()
  const navigate = useNavigate()

  const name =
    [identity?.firstName, identity?.lastName].filter(Boolean).join(' ') ||
    identity?.username ||
    identity?.email ||
    'User'

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b px-6">
          <TenantSwitcher />
          <div className="ml-auto flex items-center gap-2">
            {locales.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 uppercase">
                    <Globe className="h-4 w-4" />
                    {locale}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {locales.map((l) => (
                    <DropdownMenuItem key={l} onClick={() => setLocale(l)} className="uppercase">
                      {l}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  {name}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="truncate">{identity?.email ?? name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/account')}>
                  <UserCog className="h-4 w-4" /> Account
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/company')}>
                  <Building2 className="h-4 w-4" /> {t('res.company.plural')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => logout()}>
                  <LogOut className="h-4 w-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="relative min-h-0 flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
