/**
 * Interpreted resource model — the engine's normalized view over the manifest.
 * The UI consumes this (not the raw manifest): enums are resolved, list/form
 * field subsets and form sections are precomputed.
 */
import type {
  EnumOption,
  FieldSpec,
  Manifest,
  ResourceSpec,
  ActionKind
} from './manifest.js'

export interface ResolvedField extends FieldSpec {
  /** Enum options resolved from inline `enum` or `enumRef`. */
  options?: EnumOption[]
}

export interface FormSection {
  /** Group key (`field.form.group`); 'default' when unspecified. */
  group: string
  fields: ResolvedField[]
}

export interface ResourceModel {
  spec: ResourceSpec
  /** All fields, enums resolved. */
  fields: ResolvedField[]
  /** Fields visible in the list table, in declaration order. */
  listFields: ResolvedField[]
  /** Fields visible in forms, grouped into sections. */
  formSections: FormSection[]
  field(name: string): ResolvedField | undefined
  hasAction(action: 'list' | 'read' | 'create' | 'update' | 'delete'): boolean
}

export interface AdminModel {
  manifest: Manifest
  resources: ResourceModel[]
  resource(name: string): ResourceModel | undefined
  /** Resolve a shared enum by name. */
  enum(ref: string): EnumOption[] | undefined
}

export type { ActionKind }
