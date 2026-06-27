import { defineAdminPlugin } from '@volcanicminds/admin'

/** Brand theme as data — no CSS file needed. Colors are HSL channels. */
export const themePlugin = defineAdminPlugin({
  name: 'brand-theme',
  theme: {
    primary: '221 83% 53%',
    primaryForeground: '0 0% 100%',
    ring: '221 83% 53%',
    radius: '0.75rem',
    dark: { primary: '217 91% 60%' }
  }
})
