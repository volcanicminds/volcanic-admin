import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { FilterBar, toCrudFilters, type FilterDraft } from '@/ui/generators/FilterBar'
import type { ResolvedField, ResourceModel } from '@/engine'
import { Input } from '@/ui/components/ui/input'
import { DateWidget } from '@/ui/widgets/inputs'
import type { WidgetProps } from '@/ui/widgets/types'

// The browser's zone, with summer time: an offset of zero would hide a bound sent as it was typed.
const zone = process.env.TZ
beforeAll(() => {
  process.env.TZ = 'Europe/Rome'
})
afterAll(() => {
  process.env.TZ = zone
})

const fields: ResolvedField[] = [
  { name: 'createdAt', type: 'datetime', label: 'Created' },
  { name: 'birthday', type: 'date', label: 'Birthday' }
]
const model = {
  spec: { name: 'people' },
  filterFields: fields,
  field: (name: string) => fields.find((f) => f.name === name)
} as unknown as ResourceModel
const t = (key?: string) => key ?? ''

type Props = { type?: string; onChange?: (e: { target: { value: string } }) => void; children?: ReactNode }

/** Every `Input` the dialog draws (no DOM here): the date widget, which has no hooks, is called
 * as a plain function; any other component is only walked through its children. */
function inputs(node: ReactNode): ReactElement<Props>[] {
  if (Array.isArray(node)) return node.flatMap(inputs)
  if (!isValidElement<Props>(node)) return []
  if (node.type === Input) return [node]
  if (node.type === DateWidget) return inputs(DateWidget(node.props as unknown as WidgetProps))
  return inputs(node.props.children)
}

/** The draft after typing `value` into the input at `index`. */
function type(index: number, value: string): FilterDraft {
  let draft: FilterDraft = {}
  const tree = FilterBar({ model, draft: {}, setDraft: (d) => (draft = d), t })
  inputs(tree)[index].props.onChange?.({ target: { value } })
  return draft
}

describe('list filters on dates', () => {
  it('draws a datetime bound as the browser shows it and a date as a calendar day', () => {
    const tree = FilterBar({ model, draft: {}, setDraft: () => {}, t })
    expect(inputs(tree).map((i) => i.props.type)).toEqual(['datetime-local', 'datetime-local', 'date', 'date'])
  })

  it('sends a datetime bound as the full ISO instant in the browser zone, never the time as typed', () => {
    const draft = type(1, '2026-07-01T10:00')
    expect(draft).toEqual({ createdAt: { max: '2026-07-01T08:00:00.000Z' } })
    expect(toCrudFilters(model, draft)).toEqual([{ field: 'createdAt', operator: 'lte', value: '2026-07-01T08:00:00.000Z' }])
  })

  it('sends a date bound as the day picked, which has no zone', () => {
    expect(toCrudFilters(model, type(2, '2026-12-31'))).toEqual([{ field: 'birthday', operator: 'gte', value: '2026-12-31' }])
  })

  it('drops a cleared bound', () => {
    expect(toCrudFilters(model, type(0, ''))).toEqual([])
  })
})
