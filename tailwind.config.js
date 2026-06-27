import volcanicPreset from './tailwind-preset.js'

/** @type {import('tailwindcss').Config} */
export default {
  presets: [volcanicPreset],
  content: ['./index.html', './src/**/*.{ts,tsx}']
}
