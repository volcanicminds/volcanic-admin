/**
 * Validator for the BE-to-admin boundary contract (manifest.v2.schema.json, JSON Schema 2020-12).
 * Compiled once per test file; strict mode stays on so a schema the validator cannot read fails loudly.
 */
import Ajv2020 from 'ajv/dist/2020'
import addFormats from 'ajv-formats'
import schema from '../../manifest.v2.schema.json'

const ajv = new Ajv2020({ allErrors: true })
addFormats(ajv)
const validate = ajv.compile(schema)

/** The schema errors for `manifest`, empty when it is valid. */
export function manifestSchemaErrors(
  manifest: unknown
): Array<{ instancePath: string; message?: string; params: Record<string, unknown> }> {
  if (validate(manifest)) return []
  return (validate.errors ?? []).map(({ instancePath, message, params }) => ({ instancePath, message, params }))
}
