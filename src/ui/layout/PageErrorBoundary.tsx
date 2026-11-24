import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  t: (key: string) => string
  children: ReactNode
}

interface State {
  failed: boolean
}

/**
 * Keeps a page that throws while rendering inside the main area: the sidebar and the header stay
 * usable, so the user can move to another page. The layout keys it by path, so leaving the page
 * clears the error.
 */
export class PageErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[volcanic-admin] page failed to render', error, info.componentStack)
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children
    const { t } = this.props
    return (
      <div role="alert" className="mx-auto mt-12 flex max-w-md flex-col items-center gap-3 text-center">
        <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
        <p className="font-medium">{t('error.page')}</p>
        <p className="text-sm text-muted-foreground">{t('error.pageHint')}</p>
      </div>
    )
  }
}
