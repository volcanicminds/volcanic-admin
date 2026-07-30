/**
 * Pure helpers behind the `tags` widget: the value contract, the grouping/ordering
 * of the option set, filtering, and the free-text normalizers.
 *
 * Deliberately React-free. Every rule that is easy to get subtly wrong — what counts
 * as "empty", what counts as a duplicate, what a typed label resolves to — lives
 * here as a plain function so it can be reasoned about (and tested) on its own.
 */
import type { EnumOption, FreeTextMode, I18nKey } from '@/engine'

/** Comparison key for de-duplication. Case- and whitespace-insensitive, so a
 *  hand-typed "Mechanics " collides with the taxonomy code `mechanics`. */
export function keyOf(value: unknown): string {
  return String(value).trim().toLocaleLowerCase()
}

/**
 * The stored value as a clean array.
 *
 * Tolerates every shape the form layer can hand over: `undefined` before the record
 * loads, `''` from the Controller's default, `null` from a legacy row, a bare string,
 * or the array itself. Empty entries are dropped — which also repairs rows written
 * by the `['']` bug (see AutoForm.emptyToNull) — and duplicates collapse, first
 * occurrence winning so the author's order survives.
 */
export function toArray(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : value == null || value === '' ? [] : [value]
  const out: string[] = []
  const seen = new Set<string>()
  for (const entry of raw) {
    const str = String(entry).trim()
    if (!str) continue
    const key = keyOf(str)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(str)
  }
  return out
}

/** Append a value unless an equivalent one is already there. Never mutates. */
export function addValue(current: string[], value: string): string[] {
  const key = keyOf(value)
  if (!key || current.some((v) => keyOf(v) === key)) return current
  return [...current, value]
}

/** Remove a value by equivalence (not identity), so a chip always removes itself. */
export function removeValue(current: string[], value: string): string[] {
  const key = keyOf(value)
  return current.filter((v) => keyOf(v) !== key)
}

export interface OptionGroup {
  /** The group's i18n key, which is also its identity (see EnumOption.group). */
  key: I18nKey
  label: string
  options: EnumOption[]
}

export interface Taxonomy {
  groups: OptionGroup[]
  /** Options declaring no group: selectable leaves that sit at the top level. */
  loose: EnumOption[]
}

/**
 * Split an option set into groups + ungrouped leaves, ordered for display.
 *
 * `translate` is required rather than optional because the sort key is the TRANSLATED
 * label: sorting on the i18n key would order by "enum.blogTagGroup.*" — i.e. by the
 * developer's naming, not by what the reader sees. `localeCompare` with a base
 * sensitivity is what makes Italian accents sort where a reader expects.
 *
 * Within a group, declaration order is preserved: the author's ordering of a group's
 * own options is meaningful (broad first, narrow last) in a way alphabetical is not.
 */
export function buildTaxonomy(
  options: EnumOption[],
  translate: (key?: string) => string,
  featuredKey?: I18nKey
): Taxonomy {
  const byGroup = new Map<I18nKey, EnumOption[]>()
  const loose: EnumOption[] = []
  for (const opt of options) {
    if (!opt.group) {
      loose.push(opt)
      continue
    }
    const bucket = byGroup.get(opt.group)
    if (bucket) bucket.push(opt)
    else byGroup.set(opt.group, [opt])
  }

  const byLabel = (a: { label: string }, b: { label: string }) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })

  const groups = [...byGroup.entries()].map(([key, opts]) => ({
    key,
    label: translate(key),
    options: opts
  }))
  groups.sort(byLabel)

  // The featured group leads and must not also appear among the rest.
  const featuredAt = featuredKey ? groups.findIndex((g) => g.key === featuredKey) : -1
  if (featuredAt > 0) groups.unshift(...groups.splice(featuredAt, 1))

  return {
    groups,
    loose: [...loose].sort((a, b) => byLabel({ label: translate(a.label) }, { label: translate(b.label) }))
  }
}

/**
 * Which group to feature, from the sibling field's current value.
 *
 * Returns undefined for every degenerate case — no sibling value, a value outside the
 * sibling's own option set, or an option that declares no `linkedGroup`. Featuring is
 * a hint: the caller must keep every option reachable regardless.
 */
export function featuredGroupOf(
  siblingValue: unknown,
  siblingOptions: EnumOption[] | undefined
): I18nKey | undefined {
  if (siblingValue == null || siblingValue === '' || !siblingOptions?.length) return undefined
  const key = keyOf(siblingValue)
  return siblingOptions.find((o) => keyOf(o.value) === key)?.linkedGroup
}

export interface TagSuggestion {
  option: EnumOption
  label: string
  /** Translated group label, shown as context — the same word can be a leaf here and
   *  a group there, so a bare label is ambiguous in a flat result list. */
  groupLabel?: string
}

/**
 * Options whose label (or raw value) contains `query`, flattened across groups.
 *
 * The value is matched too, so typing a code works — handy while authoring, and it
 * keeps the "typed an exact code" path below honest. Already-selected options are
 * NOT filtered out: hiding them hides why committing a duplicate does nothing.
 */
export function filterOptions(
  options: EnumOption[],
  query: string,
  translate: (key?: string) => string,
  limit = 20
): TagSuggestion[] {
  const q = query.trim().toLocaleLowerCase()
  if (!q) return []
  const out: TagSuggestion[] = []
  for (const option of options) {
    const label = translate(option.label)
    if (!label.toLocaleLowerCase().includes(q) && !option.value.toLocaleLowerCase().includes(q)) continue
    out.push({ option, label, groupLabel: option.group ? translate(option.group) : undefined })
    if (out.length >= limit) break
  }
  return out
}

/**
 * The option whose translated label (or value) IS exactly what was typed.
 *
 * Load-bearing: without it, typing "Meccanica" and hitting Enter would store the free
 * text next to the existing `mechanics` code — two values for one concept, and the
 * frontend can only map one of them.
 */
export function exactOption(
  options: EnumOption[],
  query: string,
  translate: (key?: string) => string
): EnumOption | undefined {
  const q = keyOf(query)
  if (!q) return undefined
  return options.find((o) => keyOf(o.value) === q || keyOf(translate(o.label)) === q)
}

const MAX_FREE_TAG = 60

/** Trim, collapse inner whitespace, drop a leading '#', and strip commas — a stored
 *  comma would split into two tags on the XLSX export/import round-trip. */
function cleanFreeText(raw: string): string {
  return raw
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^#+/, '')
    .trim()
    .slice(0, MAX_FREE_TAG)
}

/** URL/filter-safe form, matching the `snake_case` style of the taxonomy codes. */
function slugify(raw: string): string {
  return cleanFreeText(raw)
    .toLocaleLowerCase()
    .normalize('NFD')
    // Combining diacritical marks, written as escapes so the source stays ASCII.
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, MAX_FREE_TAG)
}

/** Hand-typed text as it should be stored, or '' when it must not be. */
export function normalizeFreeText(raw: string, mode: FreeTextMode = 'verbatim'): string {
  if (mode === 'off') return ''
  return mode === 'slug' ? slugify(raw) : cleanFreeText(raw)
}
