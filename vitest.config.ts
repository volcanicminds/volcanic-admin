import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

// Reuses the app config so the `@/` alias has a single source (vite.config.ts).
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'node',
      include: ['test/**/*.test.ts']
    }
  })
)
