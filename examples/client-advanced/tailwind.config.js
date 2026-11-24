import volcanicPreset from '@volcanicminds/admin/tailwind-preset'

/** @type {import('tailwindcss').Config} */
export default {
  presets: [volcanicPreset],
  // Your components and pages, and the engine's build: one sheet holds both.
  content: ['./index.html', './src/**/*.{ts,tsx}', './node_modules/@volcanicminds/admin/dist/**/*.js']
}
