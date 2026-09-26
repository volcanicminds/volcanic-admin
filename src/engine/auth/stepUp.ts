/**
 * Step-up: a route that wants the person to prove, again, to be there (docs/AUTH_FLOW_V5.md §8.5
 * of the backend) answers 403 `STEP_UP_REQUIRED`, and the console asks for the proof in a dialog
 * before it sends the request again.
 *
 * The broker is the seam between the two: the data provider and the auth client call `confirm`,
 * the UI registers the dialog as the handler. Requests refused together share one dialog, so a
 * screen that fires three calls asks once.
 */
import type { AuthData } from './client.js'
import { tokenStore } from './tokenStore.js'

/** Resolves `true` once the person proved to be there, `false` when they gave up. */
export type StepUpHandler = (maxAge?: number) => Promise<boolean>

export interface StepUpBroker {
  /** What a refused request awaits. `false` when no dialog is mounted: the refusal stands. */
  confirm(maxAge?: number): Promise<boolean>
  /** Registers the dialog; the returned function unregisters it. */
  register(handler: StepUpHandler): () => void
}

export function createStepUpBroker(): StepUpBroker {
  let handler: StepUpHandler | null = null
  let pending: Promise<boolean> | null = null
  return {
    confirm(maxAge) {
      if (!handler) return Promise.resolve(false)
      const current = handler
      // Released in `.finally`, after the assignment, as the shared renewal is (./client.ts).
      pending ??= current(maxAge)
        .catch(() => false)
        .finally(() => {
          pending = null
        })
      return pending
    },
    register(next) {
      handler = next
      return () => {
        if (handler === next) handler = null
      }
    }
  }
}

/**
 * Keeps what the end of a step-up hands over: a new access token for the same session in bearer
 * mode, nothing in cookie mode (the backend replaced the cookie). The refresh token is left alone,
 * because a step-up does not rotate it; the login's own store would drop it.
 */
export function adoptStepUp(session: AuthData | undefined): void {
  if (typeof session?.token === 'string' && session.token) tokenStore.set(session.token)
}
