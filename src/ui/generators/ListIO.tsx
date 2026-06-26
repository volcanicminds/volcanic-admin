/**
 * List import/export toolbar — available on every list (table or card).
 *
 * Export: downloads the current result set (honoring active filters/sort) as an
 * .xlsx. Import: bulk edit — each row with an `id` updates that record, rows
 * without an `id` create new ones.
 *
 * Image/file fields are intentionally excluded from both directions: binary
 * assets are managed through dedicated upload endpoints, not bulk-editable.
 */
import { useRef, useState } from 'react'
import { useDataProvider, useInvalidate } from '@refinedev/core'
import type { CrudFilters, CrudSorting } from '@refinedev/core'
import { Download, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/ui/components/ui/button'
import type { ResourceModel, ResolvedField } from '@/engine'

/** Fields excluded from bulk edit (binary/asset or non-tabular). */
function isBulkEditable(field: ResolvedField): boolean {
  return !['image', 'file', 'json'].includes(field.type)
}

function columnKey(field: ResolvedField): string {
  if (field.type === 'relation' && field.relation?.foreignKey) return field.relation.foreignKey
  return field.name
}

function coerce(field: ResolvedField, value: unknown): unknown {
  if (value === '' || value === undefined || value === null) return undefined
  if (field.type === 'integer') return parseInt(String(value), 10)
  if (field.type === 'number') return Number(value)
  if (field.type === 'boolean') {
    const v = String(value).toLowerCase()
    return v === 'true' || v === '1' || v === 'yes'
  }
  return value
}

export interface ListIOProps {
  model: ResourceModel
  filters?: CrudFilters
  sorters?: CrudSorting
  /** Import requires write access. */
  canWrite: boolean
}

export function ListIO({ model, filters, sorters, canWrite }: ListIOProps) {
  const { spec } = model
  const getDataProvider = useDataProvider()
  const invalidate = useInvalidate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const editable = model.fields.filter(isBulkEditable)

  const onExport = async () => {
    setBusy(true)
    try {
      const dp = getDataProvider()
      const { data } = await dp.getList({
        resource: spec.name,
        pagination: { mode: 'off' },
        filters,
        sorters
      })
      const rows = (data as any[]).map((record) => {
        const row: Record<string, unknown> = { id: record.id }
        for (const f of editable) {
          const key = columnKey(f)
          row[key] = record[key] ?? (f.type === 'relation' ? record[f.name]?.id : undefined)
        }
        return row
      })
      const XLSX = await import('xlsx')
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, spec.name)
      XLSX.writeFile(wb, `${spec.path}.xlsx`)
    } catch (e: any) {
      toast.error(e?.message ?? 'Export failed')
    } finally {
      setBusy(false)
    }
  }

  const onImport = async (file: File) => {
    setBusy(true)
    const byKey = new Map(editable.map((f) => [columnKey(f), f]))
    let created = 0
    let updated = 0
    let failed = 0
    try {
      const XLSX = await import('xlsx')
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { blankrows: false })
      const dp = getDataProvider()
      let skipped = 0

      for (const raw of rows) {
        // Ignore empty rows (all cells blank/whitespace).
        const allBlank = Object.values(raw).every(
          (v) => v == null || String(v).trim() === ''
        )
        if (allBlank) {
          skipped++
          continue
        }

        const id = raw.id != null && String(raw.id).trim() !== '' ? String(raw.id) : undefined
        const variables: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(raw)) {
          if (key === 'id') continue
          const field = byKey.get(key)
          if (!field || field.readOnly || field.form?.widget === 'password') continue
          const v = coerce(field, value)
          if (v !== undefined) variables[key] = v
        }

        // Nothing to create and no id to update → skip.
        if (!id && Object.keys(variables).length === 0) {
          skipped++
          continue
        }

        try {
          if (id) {
            await dp.update({ resource: spec.name, id, variables })
            updated++
          } else {
            await dp.create({ resource: spec.name, variables })
            created++
          }
        } catch {
          failed++
        }
      }

      invalidate({ resource: spec.name, invalidates: ['list', 'many'] })
      toast.success(
        `Import done — ${created} created, ${updated} updated` +
          `${failed ? `, ${failed} failed` : ''}${skipped ? `, ${skipped} skipped` : ''}`
      )
    } catch (e: any) {
      toast.error(e?.message ?? 'Import failed')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="sm" disabled={busy} onClick={onExport}>
        <Download /> XLS
      </Button>
      {canWrite && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onImport(f)
            }}
          />
          <Button variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
            <Upload /> XLS
          </Button>
        </>
      )}
    </div>
  )
}
