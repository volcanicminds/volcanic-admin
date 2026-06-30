/**
 * REST helpers for the upload widgets. Uploads can't go through the JSON data
 * provider (multipart vs. application/json), so they fetch directly against the
 * resource's dedicated image endpoints (`field.image.endpoints`), reusing the
 * same auth as the data provider (bearer token + credentials).
 */
import { tokenStore, tenantStore } from '@/engine'

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

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { ...tenantStore.headers() }
  const token = tokenStore.get()
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

async function parse(res: Response): Promise<any> {
  if (!res.ok) {
    let body: any
    try {
      body = await res.json()
    } catch {
      /* non-json */
    }
    throw Object.assign(new Error(body?.message ?? res.statusText), { statusCode: res.status, body })
  }
  if (res.status === 204) return undefined
  try {
    return await res.json()
  } catch {
    return undefined
  }
}

/** POST a multipart upload (one or more files under the `files` field). */
export async function uploadFiles(apiUrl: string, path: string, files: File[]): Promise<any> {
  const form = new FormData()
  for (const f of files) form.append('files', f)
  // NOTE: do not set Content-Type — the browser adds the multipart boundary.
  const res = await fetch(`${apiUrl}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'include',
    body: form
  })
  return parse(res)
}

/** Send a JSON request (reorder/update/remove) to an image endpoint. */
export async function sendJson(
  apiUrl: string,
  method: string,
  path: string,
  body?: unknown
): Promise<any> {
  const res = await fetch(`${apiUrl}${path}`, {
    method,
    headers: { ...authHeaders(), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined
  })
  return parse(res)
}

