/** Tenant switcher — visible only in multi-tenant, switchable mode. */
import { Building2, ChevronsUpDown } from 'lucide-react'
import { useTenant } from '@/engine'
import { Button } from '@/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/ui/components/ui/dropdown-menu'

export function TenantSwitcher() {
  const { switchable, tenants, currentTenantId, setTenant } = useTenant()
  if (!switchable) return null

  const current = tenants.find((tn) => tn.id === currentTenantId)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Building2 className="h-4 w-4" />
          {current?.name ?? '—'}
          <ChevronsUpDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Tenant</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tenants.map((tn) => (
          <DropdownMenuItem key={tn.id} onClick={() => setTenant(tn.id)}>
            {tn.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
