/**
 * Optional client-side downscale + format conversion of picked images, applied
 * before they reach an upload endpoint (or get staged for a deferred upload).
 * Driven entirely by the field's `image.resize` spec, so a project turns it on per
 * field from the manifest overrides and nothing changes where it is absent.
 *
 * Built on `image-resize` (canvas in a Web Worker, so the main thread keeps
 * painting). That library always scales to the requested box, so the "don't make
 * things worse" rules live here:
 *   - a source already inside the box is re-encoded at its own size, never enlarged;
 *   - vectors and animated GIFs are passed through (rasterizing them destroys the
 *     very thing that makes them useful);
 *   - a conversion that comes out heavier than the original is discarded;
 *   - any failure falls back to the original file — a broken encoder must never
 *     cost the user their upload.
 *
 * The library is loaded lazily: projects that never enable resizing don't pay for
 * it in their bundle.
 */
import type { ImageResizeSpec } from '@/engine'

const MIME_BY_FORMAT: Record<string, string> = {
  webp: 'image/webp',
  jpg: 'image/jpeg',
  png: 'image/png'
}

/** Formats we refuse to rasterize (see the module comment). */
const PASSTHROUGH = new Set(['image/svg+xml', 'image/gif'])

interface Size {
  width: number
  height: number
}

/** Pixel size of an image file, or null when the browser can't decode it. */
async function naturalSize(file: File): Promise<Size | null> {
  try {
    const bitmap = await createImageBitmap(file)
    const size = { width: bitmap.width, height: bitmap.height }
    bitmap.close?.()
    return size
  } catch {
    return null
  }
}

/** Swap the extension so the stored filename matches what's actually inside. */
function renameTo(name: string, format: string): string {
  const base = name.replace(/\.[^./\\]+$/, '') || 'image'
  return `${base}.${format === 'jpg' ? 'jpg' : format}`
}

/**
 * Target box for one file: the requested one, clamped to the source so the result
 * can only ever shrink (unless `upscale`). Returns null when there is nothing safe
 * to ask for — e.g. no dimension configured and an undecodable source, where
 * image-resize would silently fall back to its own 320px default.
 */
function targetBox(spec: ImageResizeSpec, size: Size | null): Partial<Size> | null {
  const { width, height, upscale } = spec
  if (upscale) {
    if (width == null && height == null) return size ? { height: size.height } : null
    return { width, height }
  }
  if (!size) {
    // Can't compare against the source: only a shrink we know is a shrink is safe,
    // and we don't know. Skip rather than risk upscaling.
    return width == null && height == null ? null : { width, height }
  }
  if (width == null && height == null) return { height: size.height }
  return {
    width: width != null ? Math.min(width, size.width) : undefined,
    height: height != null ? Math.min(height, size.height) : undefined
  }
}

async function convert(file: File, spec: ImageResizeSpec): Promise<File> {
  if (!file.type.startsWith('image/') || PASSTHROUGH.has(file.type)) return file
  if (spec.skipUnder != null && file.size <= spec.skipUnder) return file

  const size = await naturalSize(file)
  const box = targetBox(spec, size)
  if (!box) return file

  const format = spec.format ?? 'webp'
  const mime = MIME_BY_FORMAT[format]
  if (!mime) return file

  // Already the target format at a size inside the box: re-encoding would only lose
  // information (and, at these qualities, usually add bytes).
  const unchanged =
    file.type === mime &&
    size != null &&
    (spec.width == null || size.width <= spec.width) &&
    (spec.height == null || size.height <= spec.height)
  if (unchanged) return file

  const { default: imageResize } = await import('image-resize')
  const out = await imageResize(file, {
    ...box,
    format,
    outputType: 'blob',
    quality: spec.quality ?? 0.95,
    reSample: spec.reSample,
    sharpen: spec.sharpen,
    bgColor: spec.bgColor
  })
  if (!(out instanceof Blob)) return file
  // "or left as the original when that's the better outcome": a conversion that
  // gains nothing is not worth the quality loss.
  if (spec.keepIfLarger !== false && out.size >= file.size) return file
  return new File([out], renameTo(file.name, format), {
    type: mime,
    lastModified: file.lastModified
  })
}

/**
 * Run the field's resize spec over the picked files. Always resolves to one file
 * per input, in the same order (the gallery's order is its display order): a file
 * that can't or shouldn't be converted comes back untouched.
 */
export async function prepareUploads(files: File[], spec?: ImageResizeSpec): Promise<File[]> {
  if (!spec?.enabled || !files.length) return files
  return Promise.all(
    files.map(async (file) => {
      try {
        return await convert(file, spec)
      } catch (e) {
        // Never block an upload over a failed optimisation — the original still goes.
        console.warn(`[upload] resize skipped for ${file.name}`, e)
        return file
      }
    })
  )
}
