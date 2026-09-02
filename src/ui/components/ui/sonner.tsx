import { Toaster as Sonner } from 'sonner'
import { useTheme } from '@/ui/theme'

type ToasterProps = React.ComponentProps<typeof Sonner>

export function Toaster(props: ToasterProps) {
  // Sonner defaults to `theme="light"`, and `richColors` paints its success /
  // error / warning variants from that theme's palette: pale fills that stay
  // pale over the dark background. Hand it the resolved theme so it follows the
  // admin's own light/dark/system switch. An explicit `theme` prop still wins.
  const { resolved } = useTheme()
  return (
    <Sonner
      theme={resolved}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground'
        }
      }}
      {...props}
    />
  )
}
