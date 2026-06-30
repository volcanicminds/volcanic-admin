import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Resolve a possibly-relative storage URL ("/media/…") against the API origin so
 *  <img> works when the admin is served from a different origin than the backend. */
export function absoluteUrl(apiUrl: string, url?: string | null): string {
  if (!url) return ''
  if (/^(https?:|data:|blob:)/.test(url)) return url
  return `${apiUrl}${url.startsWith('/') ? '' : '/'}${url}`
}
