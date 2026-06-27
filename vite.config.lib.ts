import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'
import path from 'node:path'

/** Shared peers stay external so the consumer app provides a single copy. */
const isExternal = (id: string) => /^react($|[-/])/.test(id) || /^@refinedev\//.test(id)

// Library build for publishing @volcanicminds/admin.
// (Use vite.config.ts for the demo/dev app.)
export default defineConfig({
  plugins: [
    react(),
    dts({
      entryRoot: 'src',
      include: ['src/index.ts', 'src/VolcanicAdmin.tsx', 'src/engine', 'src/ui', 'src/lib'],
      exclude: ['src/mock/**', 'src/App.tsx', 'src/main.tsx', 'src/vite-env.d.ts'],
      insertTypesEntry: true
    })
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: () => 'index.js'
    },
    cssCodeSplit: false,
    sourcemap: true,
    emptyOutDir: true,
    rollupOptions: {
      external: isExternal,
      output: {
        assetFileNames: (asset) => {
          const name = asset.names?.[0] ?? (asset as { name?: string }).name ?? ''
          return name.endsWith('.css') ? 'style.css' : 'assets/[name][extname]'
        }
      }
    }
  }
})
