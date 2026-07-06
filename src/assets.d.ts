// Ambient module declarations for imported static assets.
// Mirrors what `vite/client` provides, but that reference lives in
// `src/vite-env.d.ts`, which the library dts build excludes (see
// `vite.config.lib.ts`) — so its isolated TS program can't resolve `*.svg`
// imports (e.g. the login-page logos) without this file.
declare module '*.svg' {
  const src: string
  export default src
}
