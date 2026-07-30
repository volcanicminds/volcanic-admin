/**
 * Ambient types for `image-resize` (used by ui/widgets/upload/resize.ts).
 *
 * The package DOES ship `libs/types.d.ts`, but its `exports` map declares only
 * `import`/`require` — no `types` condition — so under `moduleResolution: bundler`
 * TypeScript cannot reach it and the import degrades to `any`. Mirrored here (same
 * shape as the shipped declaration) until upstream adds the condition.
 */
declare module 'image-resize' {
  export interface ImageResizeOptions {
    width?: number
    height?: number
    format?: 'png' | 'jpg' | 'webp'
    outputType?: 'base64' | 'canvas' | 'blob'
    quality?: number
    reSample?: number
    sharpen?: number
    bgColor?: string
  }

  export default function imageResize(
    src: string | File | Blob | HTMLCanvasElement,
    options?: ImageResizeOptions
  ): Promise<string | Blob | HTMLCanvasElement>
}
