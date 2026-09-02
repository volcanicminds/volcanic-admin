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

/**
 * Shared Tailwind preset for the Volcanic Admin theme. Consumer projects that
 * write their own components/overrides with Tailwind can apply it:
 *
 *   import volcanicPreset from '@volcanicminds/admin/tailwind-preset'
 *   export default { presets: [volcanicPreset], content: [...] }
 *
 * Projects that only use the prebuilt components can skip Tailwind entirely and
 * just import '@volcanicminds/admin/styles.css'.
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
  plugins: [tailwindcssAnimate, typography]
}
