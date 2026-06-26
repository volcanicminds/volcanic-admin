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
          if (id.includes('@refinedev') || id.includes('@tanstack')) return 'refine'
          // Keep the react chunk a leaf (no deps on other chunks) to avoid
          // circular chunks; react-router pulls in vendor deps, so it stays in vendor.
          if (id.includes('/react-dom/') || id.includes('/react/') || id.includes('/scheduler/'))
            return 'react'
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
