/**
 * Tag picker for a multi-valued enum field: a taxonomy menu, a "contains" typeahead
 * that also accepts hand-typed text, and the chosen tags as removable chips.
 *
 * The stored value is a plain `string[]` of option values (plus any free text), so it
 * round-trips through a Postgres `text[]` and displays through the existing enum
 * badge renderer with no special casing.
 *
 * Two rules worth stating because breaking either is silent:
 *   - typing a label that exists in the taxonomy stores its CODE, never the text —
 *     otherwise one concept ends up with two stored spellings;
 *   - the widget only ever emits on a real user action. Normalizing the incoming
 *     value through onChange (on mount, or when the featured group changes) would
 *     mark a form dirty that nobody touched.
 */
import { useMemo, useRef, useState } from 'react'
import { useWatch } from 'react-hook-form'
import { X } from 'lucide-react'
import { Badge } from '@/ui/components/ui/badge'
import { Input } from '@/ui/components/ui/input'
import { cn } from '@/lib/utils'
import type { EnumOption } from '@/engine'
import type { WidgetProps } from '../types'
import { TagsMenu } from './TagsMenu'
import {
  addValue,
  buildTaxonomy,
  exactOption,
  featuredGroupOf,
  filterOptions,
  keyOf,
  normalizeFreeText,
  removeValue,
  toArray
} from './taxonomy'

export function TagsWidget({ field, value, onChange, disabled, t, control }: WidgetProps) {
  // Memoized: the `?? []` fallback would otherwise be a fresh array on every render
  // and invalidate every memo below it.
  const options = useMemo(() => field.options ?? [], [field.options])
  const freeText = field.form?.freeText ?? 'verbatim'
  const featureFrom = field.form?.featureFrom
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)

  // The sibling field that decides the featured group. `useWatch` needs a name, and
  // hooks can't be conditional, so an absent `featureFrom` watches a name no field
  // uses — which simply yields undefined, i.e. "nothing featured".
  const siblingValue = useWatch({ control, name: featureFrom ?? '__noFeatureField' })
  const featuredKey = featureFrom
    ? featuredGroupOf(siblingValue, field.form?.featureOptions)
    : undefined

  const selected = useMemo(() => toArray(value), [value])
  const selectedKeys = useMemo(() => new Set(selected.map(keyOf)), [selected])

  // Memoized on `t` as well: the sort key is the TRANSLATED label, so a locale switch
  // must reorder the groups.
  const taxonomy = useMemo(
    () => buildTaxonomy(options, t, featuredKey),
    [options, t, featuredKey]
  )
  const suggestions = useMemo(() => filterOptions(options, query, t), [options, query, t])

  const byValue = useMemo(() => {
    const map = new Map<string, EnumOption>()
    for (const opt of options) map.set(keyOf(opt.value), opt)
    return map
  }, [options])

  const commit = (next: string[]) => {
    if (next !== selected) onChange(next)
  }
  const toggle = (v: string) =>
    commit(selectedKeys.has(keyOf(v)) ? removeValue(selected, v) : addValue(selected, v))
  const add = (v: string) => {
    commit(addValue(selected, v))
    setQuery('')
    setHighlight(0)
  }

  /** Enter / comma: take the highlighted suggestion, else an exact taxonomy match,
   *  else — when allowed — the typed text. */
  const commitQuery = () => {
    const picked = suggestions[highlight]?.option ?? exactOption(options, query, t)
    if (picked) return add(picked.value)
    const free = normalizeFreeText(query, freeText)
    if (free) add(free)
    else setQuery('')
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Enter inside a form submits it — always suppress before doing anything else.
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commitQuery()
      return
    }
    if (e.key === 'ArrowDown' && suggestions.length) {
      e.preventDefault()
      setHighlight((h) => (h + 1) % suggestions.length)
      return
    }
    if (e.key === 'ArrowUp' && suggestions.length) {
      e.preventDefault()
      setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length)
      return
    }
    if (e.key === 'Escape') {
      setQuery('')
      return
    }
    // Standard tag-input affordance: backspace on an empty query eats the last chip.
    if (e.key === 'Backspace' && query === '' && selected.length) {
      commit(selected.slice(0, -1))
    }
  }

  return (
    <div className="space-y-2">
      <div ref={boxRef} className="relative flex gap-2">
        <Input
          className="flex-1"
          value={query}
          disabled={disabled}
          placeholder={t(field.form?.placeholder ?? 'tags.placeholder')}
          role="combobox"
          aria-expanded={suggestions.length > 0}
          aria-autocomplete="list"
          onChange={(e) => {
            setQuery(e.target.value)
            setHighlight(0)
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setQuery((q) => q)}
        />
        <TagsMenu
          taxonomy={taxonomy}
          selected={selectedKeys}
          featuredKey={featuredKey}
          disabled={disabled}
          onToggle={toggle}
          t={t}
        />

        {/* Absolutely-positioned panel rather than a Popover (the engine ships no
            Popover primitive) — the same approach as the combobox widget. */}
        {query.trim() !== '' && (
          <div className="absolute left-0 top-full z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
            {suggestions.length === 0 && freeText === 'off' && (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">{t('tags.noResults')}</div>
            )}
            {suggestions.map((s, i) => (
              <button
                key={s.option.value}
                type="button"
                role="option"
                aria-selected={i === highlight}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm',
                  i === highlight ? 'bg-accent text-accent-foreground' : 'hover:bg-accent'
                )}
                onMouseEnter={() => setHighlight(i)}
                // The input must not blur before the click registers.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => toggle(s.option.value)}
              >
                <span className={selectedKeys.has(keyOf(s.option.value)) ? 'font-medium' : undefined}>
                  {selectedKeys.has(keyOf(s.option.value)) ? '✓ ' : ''}
                  {s.label}
                </span>
                {s.groupLabel && (
                  <span className="shrink-0 text-xs text-muted-foreground">{s.groupLabel}</span>
                )}
              </button>
            ))}
            {freeText !== 'off' && !exactOption(options, query, t) && (
              <button
                type="button"
                className="flex w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                onMouseDown={(e) => e.preventDefault()}
                onClick={commitQuery}
              >
                {t('tags.create', { value: normalizeFreeText(query, freeText) })}
              </button>
            )}
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((v) => {
            const opt = byValue.get(keyOf(v))
            return (
              <button
                key={v}
                type="button"
                disabled={disabled}
                title={t('tags.remove')}
                aria-label={`${t('tags.remove')}: ${opt ? t(opt.label) : v}`}
                onClick={() => commit(removeValue(selected, v))}
                className="disabled:opacity-60"
              >
                {/* Outline marks a tag that is NOT in the taxonomy — usually a typo,
                    and worth seeing at a glance. */}
                <Badge variant={opt ? 'secondary' : 'outline'} className="gap-1">
                  {opt ? t(opt.label) : v}
                  <X className="h-3 w-3" />
                </Badge>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
