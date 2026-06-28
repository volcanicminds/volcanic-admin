#!/usr/bin/env node
/**
 * Validate a manifest JSON against `manifest.v2.schema.json` (JSON Schema 2020-12).
 *
 * Usage:
 *   node scripts/validate-manifest.mjs               # validates the bundled v2 example (smoke)
 *   node scripts/validate-manifest.mjs path/to/manifest.json
 *
 * Exit codes: 0 = valid · 1 = invalid instance · 2 = unreadable/invalid schema or file.
 * Used in CI and (later) by the backend generator to keep the emitted manifest in contract.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import Ajv2020Module from 'ajv/dist/2020.js'
import addFormatsModule from 'ajv-formats'

const Ajv2020 = Ajv2020Module.default ?? Ajv2020Module
const addFormats = addFormatsModule.default ?? addFormatsModule

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SCHEMA_PATH = resolve(root, 'manifest.v2.schema.json')
const DEFAULT_TARGET = resolve(root, 'manifest.v2.example.json')

const targetArg = process.argv[2]
const targetPath = targetArg ? resolve(process.cwd(), targetArg) : DEFAULT_TARGET

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (e) {
    console.error(`✖ Cannot read/parse ${label} (${path}): ${e.message}`)
    process.exit(2)
  }
}

const schema = readJson(SCHEMA_PATH, 'schema')
const manifest = readJson(targetPath, 'manifest')

const ajv = new Ajv2020({ allErrors: true, strict: true })
addFormats(ajv)

let validate
try {
  validate = ajv.compile(schema)
} catch (e) {
  console.error(`✖ The schema itself is invalid: ${e.message}`)
  process.exit(2)
}

if (validate(manifest)) {
  console.log(`✓ ${targetPath} is a valid Manifest v2`)
  process.exit(0)
}

console.error(`✖ ${targetPath} failed Manifest v2 validation — ${validate.errors.length} error(s):`)
for (const err of validate.errors) {
  const where = err.instancePath || '(root)'
  const params = err.params && Object.keys(err.params).length ? ` ${JSON.stringify(err.params)}` : ''
  console.error(`  ${where} ${err.message}${params}`)
}
process.exit(1)
