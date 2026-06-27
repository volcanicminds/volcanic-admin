import volcanicPreset from '@volcanicminds/admin/tailwind-preset'

/** @type {import('tailwindcss').Config} */
export default {
  presets: [volcanicPreset],
  // Scan your own components/pages (the prebuilt admin CSS covers the engine itself).
  content: ['./index.html', './src/**/*.{ts,tsx}']
}
