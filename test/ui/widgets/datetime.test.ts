import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { fromLocalInput, toLocalInput } from '@/ui/widgets/datetime'

// The browser's zone, with summer time: an offset of zero would hide a value sent as it was typed.
const zone = process.env.TZ
beforeAll(() => {
  process.env.TZ = 'Europe/Rome'
})
afterAll(() => {
  process.env.TZ = zone
})

describe('datetime-local values', () => {
  it('sends the instant the browser shows, as a full ISO date a date-time schema accepts', () => {
    expect(fromLocalInput('2026-12-31T10:00')).toBe('2026-12-31T09:00:00.000Z')
    expect(fromLocalInput('2026-07-01T10:00')).toBe('2026-07-01T08:00:00.000Z')
  })

  it('shows an instant in the browser zone, and back to the same instant', () => {
    expect(toLocalInput('2026-12-31T09:00:00.000Z')).toBe('2026-12-31T10:00')
    expect(toLocalInput('2026-07-01T08:00:00+00:00')).toBe('2026-07-01T10:00')
    expect(fromLocalInput(toLocalInput('2026-12-31T09:00:00.000Z'))).toBe('2026-12-31T09:00:00.000Z')
  })

  it('leaves an empty field empty, so the form sends null, and shows nothing for a value that is no date', () => {
    expect(fromLocalInput('')).toBe('')
    for (const value of ['', null, undefined, 42, 'not a date']) expect(toLocalInput(value)).toBe('')
  })
})
