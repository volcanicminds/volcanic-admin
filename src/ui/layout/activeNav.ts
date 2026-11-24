/**
 * The menu entry a location belongs to: the longest entry path that is the location or one of
 * its ancestors. Resource paths nest (`rag/admin/grants` and `rag/admin/grants/history`), so a
 * plain prefix match would light up both entries on the nested page.
 */
export function activeNavPath(pathname: string, paths: readonly string[]): string | undefined {
  const clean = (p: string) => '/' + p.replace(/^\/+|\/+$/g, '')
  const here = clean(pathname)
  let best: string | undefined
  for (const path of paths) {
    const own = clean(path)
    const inside = here === own || here.startsWith(own === '/' ? '/' : own + '/')
    if (inside && (best === undefined || clean(best).length < own.length)) best = path
  }
  return best
}
