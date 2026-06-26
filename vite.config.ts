import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5273,
    host: true
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          // Keep xlsx in its own chunk so it stays lazily loaded (dynamic import).
          if (id.includes('xlsx')) return 'xlsx'
          // Split the two heaviest, self-contained groups; React + router + the
          // rest stay together in `vendor` to keep the chunk graph acyclic.
          if (id.includes('@refinedev') || id.includes('@tanstack')) return 'refine'
          if (
            id.includes('@radix-ui') ||
            id.includes('lucide-react') ||
            id.includes('/sonner/') ||
            id.includes('class-variance-authority') ||
            id.includes('tailwind-merge') ||
            id.includes('/clsx/')
          )
            return 'ui'
          return 'vendor'
        }
      }
    }
  }
})
