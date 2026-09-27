/**
 * REST helpers for the upload widgets, against the resource's dedicated image endpoints
 * (`field.image.endpoints`). They go through the data provider's `custom()`, multipart included,
 * so an upload authenticates, renews and steps up exactly as any other request: a route marked
 * `freshAuth` opens the step-up dialog and is sent again, instead of failing with a 403.
 */
import type { DataProvider } from '@refinedev/core'

export { absoluteUrl } from '@/lib/utils'

/**
 * Pull image files out of a clipboard/paste DataTransfer (pasted screenshots or
 * copied images). Returns [] for text-only pastes (e.g. a pasted URL), so the
 * caller can ignore them and let the paste fall through.
 */
export function imagesFromClipboard(data: DataTransfer | null): File[] {
  if (!data) return []
  const out: File[] = []
  for (const item of Array.from(data.items ?? [])) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const f = item.getAsFile()
      if (f) out.push(f)
    }
  }
  // Some browsers expose pasted images directly under `files` instead of `items`.
  if (!out.length) {
    for (const f of Array.from(data.files ?? [])) {
      if (f.type.startsWith('image/')) out.push(f)
    }
  }
  return out
}

function custom(provider: DataProvider) {
  if (!provider.custom) throw new Error('Uploads require a data provider with custom() support')
  return provider.custom
}

/**
 * Extract files an upload widget staged during create (deferred upload). On
 * create there is no record id yet, so the widget keeps the picked File(s) on
 * its value (gallery items carry `_file`, the single-image value is
 * `{ url, _pendingFile }`); AutoForm reads them out and uploads once the record
 * exists. Order follows the value's order (the gallery is position-sorted).
 */
export function pendingFiles(value: unknown): File[] {
  if (Array.isArray(value)) {
    return value.map((it: any) => it?._file).filter((f: unknown): f is File => f instanceof File)
  }
  if (value && typeof value === 'object' && (value as any)._pendingFile instanceof File) {
    return [(value as any)._pendingFile]
  }
  return []
}

/** POST a multipart upload (one or more files under the `files` field). */
export async function uploadFiles(provider: DataProvider, path: string, files: File[]): Promise<any> {
  const form = new FormData()
  for (const f of files) form.append('files', f)
  const { data } = await custom(provider)({ url: path, method: 'post', payload: form })
  return data
}

type Verb = 'get' | 'delete' | 'head' | 'options' | 'post' | 'put' | 'patch'

/** Send a JSON request (reorder/update/remove) to an image endpoint. */
export async function sendJson(provider: DataProvider, method: string, path: string, body?: unknown): Promise<any> {
  const { data } = await custom(provider)({
    url: path,
    method: method.toLowerCase() as Verb,
    payload: body as Record<string, unknown> | undefined
  })
  return data
}

