import tailwindcssAnimate from 'tailwindcss-animate'
import typography from '@tailwindcss/typography'

/**
 * `.prose` colors, bound to the design-system tokens instead of the plugin's
 * fixed grays. Values stay in `hsl(var(--token))` form so they resolve against
 * whichever token block is active (`:root` or `.dark`) at paint time.
 *
 * `kbd-shadows` is left alone: the plugin feeds it to `rgb(... / <alpha>)`, so it
 * wants a bare RGB triplet, which the HSL tokens cannot provide.
 */
const PROSE_TOKENS = {
  '--tw-prose-body': 'hsl(var(--foreground))',
  '--tw-prose-headings': 'hsl(var(--foreground))',
  '--tw-prose-lead': 'hsl(var(--muted-foreground))',
  '--tw-prose-links': 'hsl(var(--primary))',
  '--tw-prose-bold': 'hsl(var(--foreground))',
  '--tw-prose-counters': 'hsl(var(--muted-foreground))',
  '--tw-prose-bullets': 'hsl(var(--muted-foreground) / 0.6)',
  '--tw-prose-hr': 'hsl(var(--border))',
  '--tw-prose-quotes': 'hsl(var(--foreground))',
  '--tw-prose-quote-borders': 'hsl(var(--border))',
  '--tw-prose-captions': 'hsl(var(--muted-foreground))',
  '--tw-prose-kbd': 'hsl(var(--foreground))',
  '--tw-prose-code': 'hsl(var(--foreground))',
  '--tw-prose-pre-code': 'hsl(var(--foreground))',
  '--tw-prose-pre-bg': 'hsl(var(--muted))',
  '--tw-prose-th-borders': 'hsl(var(--border))',
  '--tw-prose-td-borders': 'hsl(var(--border))'
}

/** Same variables under their `invert` names, so `dark:prose-invert` (which
 *  remaps every variable to its invert twin) resolves back to these tokens
 *  instead of flipping the palette to the plugin's grays. */
const PROSE_INVERT_TOKENS = Object.fromEntries(
  Object.entries(PROSE_TOKENS).map(([k, v]) => [k.replace('--tw-prose-', '--tw-prose-invert-'), v])
)

/**
 * Element rules layered on top of the plugin defaults. The plugin wraps inline
 * code in literal backticks, markdown punctuation in a WYSIWYG field where the
 * user never typed them. A tinted chip says the same thing without the noise;
 * inside a `pre` the chip would double up on the block's own background, so it
 * is cleared there.
 */
const PROSE_RULES = {
  code: {
    backgroundColor: 'hsl(var(--muted))',
    padding: '0.15em 0.35em',
    borderRadius: 'calc(var(--radius) - 4px)',
    fontWeight: '500'
  },
  'code::before': { content: 'none' },
  'code::after': { content: 'none' },
  'pre code': { backgroundColor: 'transparent', padding: '0', fontWeight: '400' }
}

/** The light theme's tokens, HSL triplets read through `hsl(var(--token))`. */
const LIGHT = {
  '--background': '0 0% 100%',
  '--foreground': '240 10% 3.9%',
  '--card': '0 0% 100%',
  '--card-foreground': '240 10% 3.9%',
  '--popover': '0 0% 100%',
  '--popover-foreground': '240 10% 3.9%',
  // Volcanic accent, ember. Deeper here than in .dark: white on it and it as text on white both
  // need 4.5:1 (5.66, and 4.7 on hover's /90); the bright 53% gives 2.85.
  '--primary': '22 92% 36%',
  '--primary-foreground': '0 0% 100%',
  '--secondary': '240 4.8% 95.9%',
  '--secondary-foreground': '240 5.9% 10%',
  '--muted': '240 4.8% 95.9%',
  // 44% keeps 4.5:1 on --muted and --accent too (4.74, 5.21 on white): the menu's initials and
  // a hovered nav item sit on them, where 46.1% gives 4.39.
  '--muted-foreground': '240 3.8% 44%',
  '--accent': '240 4.8% 95.9%',
  '--accent-foreground': '240 5.9% 10%',
  '--destructive': '0 72% 51%',
  '--destructive-foreground': '0 0% 98%',
  '--border': '240 5.9% 90%',
  '--input': '240 5.9% 90%',
  '--ring': '22 92% 36%',
  '--radius': '0.5rem',
  // The main area's padding. The sticky bars of the list, detail and form pages bleed into it
  // with negative margins, so they read it from here instead of repeating the breakpoint.
  '--page-padding': '1rem'
}

const DARK = {
  '--background': '240 10% 3.9%',
  '--foreground': '0 0% 98%',
  '--card': '240 10% 5.9%',
  '--card-foreground': '0 0% 98%',
  '--popover': '240 10% 3.9%',
  '--popover-foreground': '0 0% 98%',
  // The bright ember carries dark text: 6.99:1, where white on it gives 2.85.
  '--primary': '24 95% 53%',
  '--primary-foreground': '240 10% 3.9%',
  '--secondary': '240 3.7% 15.9%',
  '--secondary-foreground': '0 0% 98%',
  '--muted': '240 3.7% 15.9%',
  '--muted-foreground': '240 5% 64.9%',
  '--accent': '240 3.7% 15.9%',
  '--accent-foreground': '0 0% 98%',
  '--destructive': '0 62.8% 45%',
  '--destructive-foreground': '0 0% 98%',
  '--border': '240 3.7% 15.9%',
  '--input': '240 3.7% 15.9%',
  '--ring': '24 95% 53%'
}

/**
 * The theme tokens and the element rules every admin screen assumes, emitted in the base layer
 * of whichever sheet applies the preset: the admin's prebuilt `styles.css`, or a project's own
 * sheet, which then replaces `styles.css` instead of loading after it.
 */
function themeBase({ addBase, theme }) {
  addBase({
    ':root': LIGHT,
    [`@media (min-width: ${theme('screens.md')})`]: { ':root': { '--page-padding': '1.5rem' } },
    '.dark': DARK,
    '*': { borderColor: 'hsl(var(--border))' },
    'html, body, #root': { height: '100%' },
    body: {
      backgroundColor: 'hsl(var(--background))',
      color: 'hsl(var(--foreground))',
      fontFeatureSettings: "'rlig' 1, 'calt' 1"
    }
  })
}

/**
 * Shared Tailwind preset for the Volcanic Admin theme. A project with its own
 * Tailwind applies it and scans the engine's build, so one sheet holds the
 * engine's classes and the project's, in Tailwind's order:
 *
 *   import volcanicPreset from '@volcanicminds/admin/tailwind-preset'
 *   export default {
 *     presets: [volcanicPreset],
 *     content: ['./src/**\/*.{ts,tsx}', './node_modules/@volcanicminds/admin/dist/**\/*.js']
 *   }
 *
 * Such a project does not import '@volcanicminds/admin/styles.css': a second
 * sheet loaded after it would override the engine's responsive variants with
 * its own base utilities. A project without Tailwind imports only that sheet.
 *
 * @type {import('tailwindcss').Config}
 */
export default {
  darkMode: ['class'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' }
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' }
      },
      // Rich text (`.prose`, used by the richtext widget and its read-only
      // renderer) ships hard-coded grays: near-black headings on a near-black
      // background in dark mode. Rebinding every prose variable to the theme
      // tokens makes one class work in both themes, and makes it follow a
      // consumer's `theme` overrides (links pick up their brand primary).
      // The `invert` set is bound to the same tokens so a stray
      // `dark:prose-invert` in a consumer's markup stays a no-op instead of
      // flipping the palette back to gray.
      typography: {
        DEFAULT: { css: { ...PROSE_TOKENS, ...PROSE_RULES } },
        invert: { css: PROSE_INVERT_TOKENS }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out'
      }
    }
  },
  plugins: [themeBase, tailwindcssAnimate, typography]
}
