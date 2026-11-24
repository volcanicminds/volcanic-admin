/**
 * i18n — the manifest emits KEYS only (res.*, field.*, enum.*, action.*,
 * group.*). The project supplies translation dictionaries; missing keys fall
 * back to a humanized last segment (the resource name, for resource labels) so
 * the UI never shows a raw key.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Dictionary = Record<string, string>
export type Dictionaries = Record<string, Dictionary>

interface I18nContextValue {
  locale: string
  locales: string[]
  setLocale: (l: string) => void
  t: (key?: string, vars?: Record<string, string | number>) => string
  /** Whether a dictionary of the locale or of the default one holds the key. */
  has: (key: string) => boolean
}

const I18nContext = createContext<I18nContextValue | null>(null)

// Resource labels are `res.<name>.singular|plural`: their last segment is the
// same for every resource, so the fallback names the resource instead.
const LABEL_FORMS = new Set(['singular', 'plural'])

function humanize(key: string): string {
  const segments = key.split('.')
  const last = segments.pop() ?? key
  const subject = LABEL_FORMS.has(last) && segments.length > 1 ? segments.pop()! : last
  return subject
    .replace(/[_-]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^\w/, (c) => c.toUpperCase())
}

function interpolate(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`))
}

// Module-level mirror of the active translate fn, kept in sync by the provider.
// Lets non-React code (data provider, notification provider) localize keys without
// a hook. Falls back to humanizing the key when no provider is mounted yet.
let activeTranslate: I18nContextValue['t'] = (key) => (key ? humanize(key) : '')

/** Translate a key outside the React tree (uses the active locale's dictionary). */
export function translate(key?: string, vars?: Record<string, string | number>): string {
  return activeTranslate(key, vars)
}

export interface I18nProviderProps {
  dictionaries: Dictionaries
  defaultLocale: string
  locales: string[]
  children: ReactNode
}

// The language chosen on this device, as the theme is: a device preference, not a user setting.
const LOCALE_KEY = 'volcanic.admin.locale'

/** The locale to open with: the one chosen on this device while the app still offers it, else the default. */
export function initialLocale(stored: string | null, locales: readonly string[], defaultLocale: string): string {
  return stored !== null && locales.includes(stored) ? stored : defaultLocale
}

function readStoredLocale(): string | null {
  return typeof localStorage === 'undefined' ? null : localStorage.getItem(LOCALE_KEY)
}

export function I18nProvider({
  dictionaries,
  defaultLocale,
  locales,
  children
}: I18nProviderProps) {
  const [chosen, choose] = useState(() => initialLocale(readStoredLocale(), locales, defaultLocale))
  // A list that drops the chosen language falls back to the default, without forgetting the choice.
  const locale = locales.includes(chosen) ? chosen : defaultLocale

  const setLocale = useCallback(
    (next: string) => {
      if (!locales.includes(next)) return
      choose(next)
      if (typeof localStorage !== 'undefined') localStorage.setItem(LOCALE_KEY, next)
    },
    [locales]
  )

  // Screen readers and the browser's hyphenation read the page's language from <html lang>.
  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.lang = locale
  }, [locale])

  const value = useMemo<I18nContextValue>(() => {
    const dict = dictionaries[locale] ?? {}
    return {
      locale,
      locales,
      setLocale,
      t: (key, vars) => {
        if (!key) return ''
        const raw = dict[key] ?? dictionaries[defaultLocale]?.[key]
        return interpolate(raw ?? humanize(key), vars)
      },
      has: (key) => dict[key] !== undefined || dictionaries[defaultLocale]?.[key] !== undefined
    }
  }, [dictionaries, locale, locales, defaultLocale, setLocale])

  // Mirror the active translate fn for non-React consumers (see `translate`).
  useEffect(() => {
    activeTranslate = value.t
    return () => {
      activeTranslate = (key) => (key ? humanize(key) : '')
    }
  }, [value])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within an I18nProvider')
  return ctx
}

/** Convenience hook returning just the translate function. */
export function useT() {
  return useI18n().t
}

/**
 * Engine-shipped base translations (lowest priority — projects override any key).
 * Covers the strings the engine itself emits outside the manifest, notably the
 * humanized backend error messages (see providers/errors.ts).
 */
export const defaultDictionaries: Dictionaries = {
  en: {
    'error.unique': 'This value already exists.',
    'error.reference': 'This item is still linked to other records.',
    'error.required': 'A required field is missing.',
    'error.forbidden': 'You are not allowed to perform this action.',
    'error.notFound': 'Not found.',
    'error.conflict': 'The change could not be applied (conflict).',
    'error.invalidQuery': 'The list could not be read: the filter is not valid.',
    'error.tenantRequired': 'No workspace selected.',
    'error.tenantNotFound': 'That workspace does not exist or is not active.',
    'error.tenantDestroyed': 'That workspace was destroyed and can no longer be changed.',
    'error.unavailable': 'Temporarily unavailable. Try again shortly.',
    'error.invalidCredentials': 'Wrong email or password.',
    'error.passwordExpired': 'Your password has expired: set a new one.',
    'error.generic': 'Something went wrong. Please try again.',
    'error.page': 'This page could not be shown.',
    'error.pageHint': 'The rest of the console still works: choose another page from the menu.',
    'error.actionsUnsupported': 'Actions require a data provider with custom() support.',
    'error.uploadsUnsupported': 'Uploads require a data provider with custom() support.',
    'meta.id': 'ID',
    'meta.createdAt': 'Created',
    'meta.updatedAt': 'Updated',
    'detail.showEmpty': 'Show empty fields ({count})',
    'detail.hideEmpty': 'Hide empty fields',
    'action.menu': 'Actions',
    'docTitle.create': 'New',
    'docTitle.edit': 'Edit',
    'docTitle.clone': 'Clone',
    'nav.account': 'Account',
    'nav.notices': 'Notices',
    'nav.menu': 'Menu',
    'nav.openMenu': 'Open the menu',
    'nav.closeMenu': 'Close the menu',
    'nav.expand': 'Expand',
    'nav.collapse': 'Collapse',
    'nav.logout': 'Logout',
    'nav.user': 'User',
    'nav.tenant': 'Workspace',
    'notices.title': 'Notices',
    'notices.dialog.title': 'New notices',
    'notices.dialog.all': 'See all',
    'notices.dialog.close': 'Close',
    'notices.markAll': 'Mark all as seen',
    'notices.new': 'New',
    'notices.empty': 'No notices.',
    'notices.failed': 'Some notices could not be read: {sources}.',
    'notices.fallback': 'Notice from {source}: {kind}.',
    'notices.level.info': 'Information',
    'notices.level.warning': 'Warning',
    'notices.error.seen': 'The notices could not be marked as seen.',
    'state.loading': 'Loading',
    'state.empty': 'No records',
    'list.pageInfo': 'Page {page} of {pageCount}',
    'list.pageSize': 'Rows per page',
    'list.prev': 'Previous',
    'list.next': 'Next',
    'list.selected': 'Selected: {count}',
    'list.selectAll': 'Select all on this page',
    'list.selectRow': 'Select',
    'list.clearSelection': 'Clear selection',
    'list.prevImage': 'Previous image',
    'list.nextImage': 'Next image',
    'list.layout.table': 'Table',
    'list.layout.card': 'Cards',
    'form.saveError': 'The record could not be saved.',
    'validation.required': 'This field is required.',
    'validation.pattern': 'The format is not valid.',
    'action.new': 'New',
    'action.save': 'Save',
    'action.search': 'Search',
    'action.back': 'Back',
    'action.edit': 'Edit',
    'action.copy': 'Copy',
    'action.show': 'Open',
    'value.yes': 'Yes',
    'value.no': 'No',
    'value.unset': 'Not set',
    'action.clone': 'Clone',
    'action.remove': 'Remove',
    'action.delete': 'Delete',
    'action.cancel': 'Cancel',
    'action.confirm': 'Confirm',
    'action.delete.confirmTitle': 'Delete this record?',
    'action.delete.confirmText': "This action can't be undone.",
    'action.deleteMany.confirmTitle': 'Delete the selected records ({count})?',
    'action.bulk.done': '{label}: {count} done.',
    'action.bulk.failed': '{label}: {failed} of {count} failed.',
    // Two-phase container destruction (the `tenant-destroy` action component).
    'destroy.title': 'Destroy this container',
    'destroy.step1': 'Step 1 of 2 · what would be destroyed',
    'destroy.step2': 'Step 2 of 2 · confirm',
    'destroy.check': 'Check what would be destroyed',
    'destroy.empty': 'This container reports nothing to destroy.',
    'destroy.tokenOnce': 'The permission below is shown once and expires. It is never put in a link.',
    'destroy.expires': 'Expires at',
    'destroy.slug': 'Type the slug to confirm',
    'destroy.otp': 'The code of your authenticator app',
    'destroy.otp.email': 'The code we sent to {destination}',
    'destroy.confirm': 'Destroy permanently',
    'destroy.warning': 'The container is exported first, then destroyed. This cannot be undone.',
    'destroy.done': 'Container destroyed',
    'destroy.already': 'That container was already destroyed.',
    'destroy.error.notAvailable': 'This backend cannot destroy containers.',
    'destroy.error.factorUnavailable': 'No second factor can reach you: set up two-factor authentication first.',
    'destroy.error.tokenInvalid': 'This permission is no longer valid: check again what would be destroyed.',
    'destroy.error.slugMismatch': 'The slug does not match this container.',
    'destroy.error.otpInvalid': 'The code is not valid.',
    'destroy.error.otpExhausted': 'No attempts left: check again what would be destroyed to get a new code.',
    'destroy.error.exportFailed': 'The export failed, so nothing was destroyed.',
    'unsaved.title': 'Discard unsaved changes?',
    'unsaved.text': 'You have unsaved changes that will be lost if you leave this page.',
    'unsaved.leave': 'Leave without saving',
    'unsaved.stay': 'Stay on this page',
    'badge.featured': 'Featured',
    'upload.button': 'Upload',
    'upload.hint': 'Drop, paste, or click Upload',
    'upload.dropHint': 'or drag & drop / paste images here',
    'upload.saveFirst': 'Save the record first to upload images',
    'upload.deferredHint': 'Images upload when you save',
    'upload.partialFail': 'Record saved, but some images failed to upload',
    'upload.tooLarge': 'File too large',
    'upload.failed': 'Upload failed',
    'upload.cover': 'cover',
    'upload.alt': 'alt text',
    'upload.preview': 'Image preview',
    'tags.add': 'Add tag',
    'tags.placeholder': 'Search or type a tag',
    'tags.create': 'Create “{value}”',
    'tags.noResults': 'No matching tag',
    'tags.remove': 'Remove tag',
    'sort.by': 'Sort by',
    'sort.asc': 'Ascending',
    'sort.desc': 'Descending',
    'sort.clear': 'Clear sort',
    'filter.title': 'Filters',
    'filter.clear': 'Clear',
    'filter.any': 'Any',
    'filter.yes': 'Yes',
    'filter.no': 'No',
    'filter.min': 'Min',
    'filter.max': 'Max',
    'io.exportFailed': 'Export failed',
    'io.importFailed': 'Import failed',
    'io.importDone': 'Import done: {parts}.',
    'io.created': '{count} created',
    'io.updated': '{count} updated',
    'io.failed': '{count} failed',
    'io.skipped': '{count} skipped',
    'input.options': 'Options',
    'richtext.bold': 'Bold',
    'richtext.italic': 'Italic',
    'richtext.underline': 'Underline',
    'richtext.strike': 'Strikethrough',
    'richtext.h2': 'Heading 2',
    'richtext.h3': 'Heading 3',
    'richtext.bulletList': 'Bullet list',
    'richtext.orderedList': 'Numbered list',
    'richtext.blockquote': 'Quote',
    'richtext.link': 'Link',
    'richtext.clearFormat': 'Clear formatting',
    'richtext.undo': 'Undo',
    'richtext.redo': 'Redo',
    // The login flow. Methods and providers are drawn by id: the backend sends codes, never labels.
    'login.title': 'Sign in',
    'login.subtitle': 'Enter your credentials to access',
    'login.organization': 'Organization',
    'login.email': 'Email',
    'login.password': 'Password',
    'login.forgot': 'Forgot password?',
    'login.submit': 'Sign in',
    'login.or': 'or',
    'login.method.email-otp': 'Email me a sign-in code',
    'login.continueWith': 'Continue with {provider}',
    'login.code': 'Code',
    'login.verify': 'Verify',
    'login.cancel': 'Cancel',
    'login.useMethod': 'Use {method} instead',
    'login.stage.totp': 'Enter the 6-digit code from your authenticator',
    'login.stage.email-otp': 'Enter the code we sent to {destination}',
    'login.stage.email-otp.send': 'We can email you a code to confirm it is you',
    'login.stage.enrol': 'Two-factor authentication is required: set up an authenticator app',
    'login.stage.enrolScan': 'Scan the QR with your authenticator, then enter the code',
    'login.stage.unsupported': 'This console cannot complete this sign-in method.',
    'login.stage.returning': 'Completing the sign-in',
    'login.method.totp': 'the authenticator app',
    'login.method.email-otp.short': 'an email code',
    'login.send': 'Send the code',
    'login.resend': 'Send a new code',
    'login.resendIn': 'New code in {seconds}s',
    'login.enrol': 'Set up',
    'login.enable': 'Enable and continue',
    'login.title.stage': 'Two-factor',
    'login.title.enrol': 'Set up two-factor',
    'login.poweredBy': 'Powered by Volcanic Minds',
    'login.error.unknownOrganization': 'Unknown organization',
    'login.error.organizationRequired': 'Enter your organization',
    'login.error.codeInvalid': 'Wrong code.',
    'login.error.remaining': '{remaining} attempts left.',
    'login.error.codeExpired': 'The code has expired: ask for a new one.',
    'login.error.sendLimit': 'Too many codes sent: try again later.',
    'login.error.attemptsExhausted': 'Too many wrong codes: sign in again.',
    'login.error.flowExpired': 'The sign-in has expired: start again.',
    'login.error.enrolmentRefused': 'Two-factor cannot be set up for this account: contact an administrator.',
    'login.error.idpDenied': 'The sign-in was declined by the provider.',
    'login.error.idpFailed': 'The provider sign-in failed: try again.',
    'login.error.idpNotLinked': 'This provider account is not linked to a user here.',
    'login.error.pendingApproval': 'Your account is waiting for an administrator to approve it.',
    'login.error.methodNotAllowed': 'This sign-in method is not allowed for this account.',
    // The step-up dialog: a sensitive action asks for a recent sign-in.
    'stepUp.title': 'Confirm it is you',
    'stepUp.description': 'This action needs a recent sign-in. Enter your password to continue.',
    'stepUp.description.code': 'This action needs a recent sign-in. We can email you a code to confirm it is you.',
    'stepUp.confirm': 'Confirm',
    'stepUp.relogin': 'Sign in again',
    'stepUp.reloginOnly': 'This action needs a recent sign-in, and this session can be confirmed only by signing in again.',
    'stepUp.error.notAvailable': 'This session cannot be confirmed: sign in again.',
    'password.new': 'New password',
    'password.confirm': 'Confirm password',
    'password.update': 'Update password',
    'password.mismatch': 'Passwords do not match',
    'reset.title': 'Set a new password',
    'reset.choose': 'Choose a new password for your account.',
    'reset.tokenInvalid': 'Missing or invalid reset token.',
    'reset.requestLink': 'Request a new link',
    'reset.done': 'Password updated. Please sign in.',
    'reset.failed': 'Reset failed',
    'forgot.title': 'Reset password',
    'forgot.prompt': 'Enter your account email.',
    'forgot.sent': 'If the email exists, a reset link has been sent.',
    'forgot.submit': 'Send reset link',
    'forgot.back': 'Back to sign in',
    'account.profile': 'Profile',
    'account.name': 'Name',
    'account.username': 'Username',
    'account.roles': 'Roles',
    'account.appearance': 'Appearance',
    'account.theme': 'Theme',
    'account.theme.light': 'Light',
    'account.theme.dark': 'Dark',
    'account.theme.system': 'System',
    'account.password.title': 'Change password',
    'account.password.current': 'Current password',
    'account.mfa.title': 'Two-factor authentication',
    'account.mfa.enabled': 'Enabled',
    'account.mfa.disabled': 'Disabled',
    'account.mfa.enable': 'Enable two-factor',
    'account.mfa.disable': 'Disable two-factor',
    'account.mfa.intro': 'Add an extra layer of security with a TOTP authenticator app.',
    'account.mfa.resetByAdmin': 'Another administrator can reset it.',
    'account.mfa.code': 'Authentication code',
    'account.mfa.confirm': 'Confirm and enable',
    'account.mfa.enabledToast': 'Two-factor enabled',
    'account.mfa.disabledToast': 'Two-factor disabled',
    'account.mfa.error.start': 'Failed to start the two-factor setup',
    'account.mfa.error.code': 'Invalid code',
    'account.mfa.error.disable': 'Failed to disable two-factor',
    'account.sessions.title': 'Active sessions',
    'account.sessions.intro': 'Every device signed in with this account. Closing one stops it renewing straight away.',
    'account.sessions.none': 'No session is open.',
    'account.sessions.device': 'Device',
    'account.sessions.address': 'Address',
    'account.sessions.lastUsed': 'Last used',
    'account.sessions.thisDevice': 'This device',
    'account.sessions.close': 'Close',
    'account.sessions.closed': 'Session closed',
    'account.sessions.error.close': 'Failed to close the session',
    'account.sessions.confirmCurrent': 'Sign out on this device?',
    'account.sessions.confirmCurrentText': 'You will be signed out here and will have to log in again.',
    'account.sessions.confirmOther': 'Close this session?',
    'account.sessions.confirmOtherText': 'That device will have to log in again. Anything it holds stops working at once.',
    'account.sessions.confirm': 'Close session',
    'account.device.unknown': 'Unknown device',
    'account.device.on': '{browser} on {system}'
  },
  it: {
    'error.unique': 'Valore già presente.',
    'error.reference': 'Elemento ancora collegato ad altri record.',
    'error.required': 'Manca un campo obbligatorio.',
    'error.forbidden': 'Operazione non consentita.',
    'error.notFound': 'Elemento non trovato.',
    'error.conflict': 'Modifica non applicabile (conflitto).',
    'error.invalidQuery': 'Elenco non leggibile: il filtro non è valido.',
    'error.tenantRequired': 'Nessuno spazio di lavoro selezionato.',
    'error.tenantNotFound': 'Spazio di lavoro inesistente o non attivo.',
    'error.tenantDestroyed': 'Quello spazio di lavoro è stato distrutto e non si può più modificare.',
    'error.unavailable': 'Momentaneamente non disponibile. Riprova fra poco.',
    'error.invalidCredentials': 'Email o password errate.',
    'error.passwordExpired': 'La password è scaduta: impostane una nuova.',
    'error.generic': 'Si è verificato un errore. Riprova.',
    'error.page': 'Questa pagina non può essere mostrata.',
    'error.pageHint': 'Il resto della console funziona: scegli un\'altra pagina dal menu.',
    'error.actionsUnsupported': 'Le azioni richiedono un data provider con supporto custom().',
    'error.uploadsUnsupported': 'I caricamenti richiedono un data provider con supporto custom().',
    'meta.id': 'ID',
    'meta.createdAt': 'Creato',
    'meta.updatedAt': 'Aggiornato',
    'detail.showEmpty': 'Mostra campi vuoti ({count})',
    'detail.hideEmpty': 'Nascondi campi vuoti',
    'action.menu': 'Azioni',
    'docTitle.create': 'Nuovo',
    'docTitle.edit': 'Modifica',
    'docTitle.clone': 'Duplica',
    'nav.account': 'Account',
    'nav.notices': 'Avvisi',
    'nav.menu': 'Menu',
    'nav.openMenu': 'Apri il menu',
    'nav.closeMenu': 'Chiudi il menu',
    'nav.expand': 'Espandi',
    'nav.collapse': 'Comprimi',
    'nav.logout': 'Esci',
    'nav.user': 'Utente',
    'nav.tenant': 'Spazio di lavoro',
    'notices.title': 'Avvisi',
    'notices.dialog.title': 'Nuovi avvisi',
    'notices.dialog.all': 'Vedi tutti',
    'notices.dialog.close': 'Chiudi',
    'notices.markAll': 'Segna tutti come visti',
    'notices.new': 'Nuovo',
    'notices.empty': 'Nessun avviso.',
    'notices.failed': 'Alcuni avvisi non sono leggibili: {sources}.',
    'notices.fallback': 'Avviso da {source}: {kind}.',
    'notices.level.info': 'Informazione',
    'notices.level.warning': 'Attenzione',
    'notices.error.seen': 'Non è stato possibile segnare gli avvisi come visti.',
    'state.loading': 'Caricamento in corso',
    'state.empty': 'Nessun record',
    'list.pageInfo': 'Pagina {page} di {pageCount}',
    'list.pageSize': 'Righe per pagina',
    'list.prev': 'Precedente',
    'list.next': 'Successiva',
    'list.selected': 'Selezionati: {count}',
    'list.selectAll': 'Seleziona tutta la pagina',
    'list.selectRow': 'Seleziona',
    'list.clearSelection': 'Deseleziona',
    'list.prevImage': 'Immagine precedente',
    'list.nextImage': 'Immagine successiva',
    'list.layout.table': 'Tabella',
    'list.layout.card': 'Schede',
    'form.saveError': 'Non è stato possibile salvare il record.',
    'validation.required': 'Campo obbligatorio.',
    'validation.pattern': 'Il formato non è valido.',
    'action.new': 'Nuovo',
    'action.save': 'Salva',
    'action.search': 'Cerca',
    'action.back': 'Elenco',
    'action.edit': 'Modifica',
    'action.copy': 'Copia',
    'action.show': 'Apri',
    'value.yes': 'Sì',
    'value.no': 'No',
    'value.unset': 'Non impostato',
    'action.clone': 'Clona',
    'action.remove': 'Rimuovi',
    'action.delete': 'Elimina',
    'action.cancel': 'Annulla',
    'action.confirm': 'Conferma',
    'action.delete.confirmTitle': 'Eliminare questo record?',
    'action.delete.confirmText': 'Questa azione non può essere annullata.',
    'action.deleteMany.confirmTitle': 'Eliminare i record selezionati ({count})?',
    'action.bulk.done': '{label}: eseguita su {count} record.',
    'action.bulk.failed': '{label}: {failed} su {count} con errore.',
    // Distruzione del contenitore in due fasi (componente azione `tenant-destroy`).
    'destroy.title': 'Distruggi questo contenitore',
    'destroy.step1': 'Passo 1 di 2 · che cosa sparirebbe',
    'destroy.step2': 'Passo 2 di 2 · conferma',
    'destroy.check': 'Verifica che cosa sparirebbe',
    'destroy.empty': 'Questo contenitore dichiara che non c’è nulla da distruggere.',
    'destroy.tokenOnce': 'Il permesso qui sotto si vede una volta sola e scade. Non finisce mai in un link.',
    'destroy.expires': 'Scade il',
    'destroy.slug': 'Ribatti lo slug per confermare',
    'destroy.otp': "Il codice dell'app di autenticazione",
    'destroy.otp.email': 'Il codice inviato a {destination}',
    'destroy.confirm': 'Distruggi definitivamente',
    'destroy.warning': 'Il contenitore viene prima esportato, poi distrutto. Non si torna indietro.',
    'destroy.done': 'Contenitore distrutto',
    'destroy.already': 'Quel contenitore era già stato distrutto.',
    'destroy.error.notAvailable': 'Questo backend non può distruggere contenitori.',
    'destroy.error.factorUnavailable': 'Nessun secondo fattore può raggiungerti: configura prima i due fattori.',
    'destroy.error.tokenInvalid': 'Questo permesso non è più valido: verifica di nuovo che cosa sparirebbe.',
    'destroy.error.slugMismatch': 'Lo slug non corrisponde a questo contenitore.',
    'destroy.error.otpInvalid': 'Il codice non è valido.',
    'destroy.error.otpExhausted': 'Tentativi esauriti: verifica di nuovo che cosa sparirebbe per ricevere un codice nuovo.',
    'destroy.error.exportFailed': "L'esportazione non è riuscita, quindi non è stato distrutto nulla.",
    'unsaved.title': 'Scartare le modifiche non salvate?',
    'unsaved.text': 'Ci sono modifiche non salvate che andranno perse se lasci la pagina.',
    'unsaved.leave': 'Esci senza salvare',
    'unsaved.stay': 'Resta sulla pagina',
    'badge.featured': 'In evidenza',
    'upload.button': 'Carica',
    'upload.hint': "Trascina, incolla o clicca Carica",
    'upload.dropHint': 'oppure trascina o incolla qui le immagini',
    'upload.saveFirst': 'Salva prima il record per caricare le immagini',
    'upload.deferredHint': 'Le immagini vengono caricate al salvataggio',
    'upload.partialFail': 'Record salvato, ma alcune immagini non sono state caricate',
    'upload.tooLarge': 'File troppo grande',
    'upload.failed': 'Caricamento fallito',
    'upload.cover': 'copertina',
    'upload.alt': 'testo alternativo',
    'upload.preview': 'Anteprima immagine',
    'tags.add': 'Aggiungi tag',
    'tags.placeholder': 'Cerca o scrivi un tag',
    'tags.create': 'Crea «{value}»',
    'tags.noResults': 'Nessun tag corrispondente',
    'tags.remove': 'Rimuovi tag',
    'sort.by': 'Ordina per',
    'sort.asc': 'Crescente',
    'sort.desc': 'Decrescente',
    'sort.clear': 'Rimuovi ordinamento',
    'filter.title': 'Filtri',
    'filter.clear': 'Pulisci',
    'filter.any': 'Tutti',
    'filter.yes': 'Sì',
    'filter.no': 'No',
    'filter.min': 'Min',
    'filter.max': 'Max',
    'io.exportFailed': 'Esportazione non riuscita',
    'io.importFailed': 'Importazione non riuscita',
    'io.importDone': 'Importazione completata: {parts}.',
    'io.created': '{count} creati',
    'io.updated': '{count} aggiornati',
    'io.failed': '{count} non riusciti',
    'io.skipped': '{count} saltati',
    'input.options': 'Opzioni',
    'richtext.bold': 'Grassetto',
    'richtext.italic': 'Corsivo',
    'richtext.underline': 'Sottolineato',
    'richtext.strike': 'Barrato',
    'richtext.h2': 'Titolo 2',
    'richtext.h3': 'Titolo 3',
    'richtext.bulletList': 'Elenco puntato',
    'richtext.orderedList': 'Elenco numerato',
    'richtext.blockquote': 'Citazione',
    'richtext.link': 'Link',
    'richtext.clearFormat': 'Rimuovi formattazione',
    'richtext.undo': 'Annulla',
    'richtext.redo': 'Ripristina',
    'login.title': 'Accedi',
    'login.subtitle': 'Inserisci le credenziali per accedere',
    'login.organization': 'Organizzazione',
    'login.email': 'Email',
    'login.password': 'Password',
    'login.forgot': 'Password dimenticata?',
    'login.submit': 'Accedi',
    'login.or': 'oppure',
    'login.method.email-otp': 'Ricevi un codice via email',
    'login.continueWith': 'Continua con {provider}',
    'login.code': 'Codice',
    'login.verify': 'Verifica',
    'login.cancel': 'Annulla',
    'login.useMethod': 'Usa {method}',
    'login.stage.totp': "Inserisci il codice a 6 cifre dell'app di autenticazione",
    'login.stage.email-otp': 'Inserisci il codice inviato a {destination}',
    'login.stage.email-otp.send': 'Possiamo inviarti un codice via email per confermare che sei tu',
    'login.stage.enrol': "L'autenticazione a due fattori è obbligatoria: configura un'app di autenticazione",
    'login.stage.enrolScan': "Inquadra il QR con l'app di autenticazione, poi inserisci il codice",
    'login.stage.unsupported': 'Questa console non può completare questo metodo di accesso.',
    'login.stage.returning': "Completamento dell'accesso",
    'login.method.totp': "l'app di autenticazione",
    'login.method.email-otp.short': 'un codice via email',
    'login.send': 'Invia il codice',
    'login.resend': 'Invia un nuovo codice',
    'login.resendIn': 'Nuovo codice tra {seconds}s',
    'login.enrol': 'Configura',
    'login.enable': 'Attiva e continua',
    'login.title.stage': 'Due fattori',
    'login.title.enrol': 'Configura i due fattori',
    'login.poweredBy': 'Sviluppato da Volcanic Minds',
    'login.error.unknownOrganization': 'Organizzazione sconosciuta',
    'login.error.organizationRequired': "Inserisci l'organizzazione",
    'login.error.codeInvalid': 'Codice errato.',
    'login.error.remaining': 'Tentativi rimasti: {remaining}.',
    'login.error.codeExpired': 'Il codice è scaduto: chiedine uno nuovo.',
    'login.error.sendLimit': 'Troppi codici inviati: riprova più tardi.',
    'login.error.attemptsExhausted': "Troppi codici errati: ripeti l'accesso.",
    'login.error.flowExpired': "L'accesso è scaduto: ricomincia.",
    'login.error.enrolmentRefused': "Non è possibile configurare i due fattori per questo account: contatta un amministratore.",
    'login.error.idpDenied': "Il provider ha rifiutato l'accesso.",
    'login.error.idpFailed': "L'accesso tramite provider non è riuscito: riprova.",
    'login.error.idpNotLinked': 'Questo account del provider non è collegato a nessun utente.',
    'login.error.pendingApproval': "L'account è in attesa dell'approvazione di un amministratore.",
    'login.error.methodNotAllowed': 'Questo metodo di accesso non è ammesso per questo account.',
    'stepUp.title': 'Conferma la tua identità',
    'stepUp.description': 'Questa operazione richiede un accesso recente. Inserisci la password per continuare.',
    'stepUp.description.code':
      'Questa operazione richiede un accesso recente. Possiamo inviarti un codice via email per confermare che sei tu.',
    'stepUp.confirm': 'Conferma',
    'stepUp.relogin': 'Accedi di nuovo',
    'stepUp.reloginOnly':
      'Questa operazione richiede un accesso recente, e questa sessione si può confermare solo accedendo di nuovo.',
    'stepUp.error.notAvailable': 'Questa sessione non può essere confermata: accedi di nuovo.',
    'password.new': 'Nuova password',
    'password.confirm': 'Conferma password',
    'password.update': 'Aggiorna password',
    'password.mismatch': 'Le password non coincidono',
    'reset.title': 'Imposta una nuova password',
    'reset.choose': 'Scegli una nuova password per il tuo account.',
    'reset.tokenInvalid': 'Il link per reimpostare la password manca o non è valido.',
    'reset.requestLink': 'Richiedi un nuovo link',
    'reset.done': 'Password aggiornata. Ora puoi accedere.',
    'reset.failed': 'Reimpostazione non riuscita',
    'forgot.title': 'Reimposta la password',
    'forgot.prompt': "Inserisci l'email del tuo account.",
    'forgot.sent': "Se l'email esiste, abbiamo inviato un link per reimpostare la password.",
    'forgot.submit': 'Invia il link di reimpostazione',
    'forgot.back': "Torna all'accesso",
    'account.profile': 'Profilo',
    'account.name': 'Nome',
    'account.username': 'Nome utente',
    'account.roles': 'Ruoli',
    'account.appearance': 'Aspetto',
    'account.theme': 'Tema',
    'account.theme.light': 'Chiaro',
    'account.theme.dark': 'Scuro',
    'account.theme.system': 'Sistema',
    'account.password.title': 'Cambia password',
    'account.password.current': 'Password attuale',
    'account.mfa.title': 'Autenticazione a due fattori',
    'account.mfa.enabled': 'Attiva',
    'account.mfa.disabled': 'Non attiva',
    'account.mfa.enable': 'Attiva i due fattori',
    'account.mfa.disable': 'Disattiva i due fattori',
    'account.mfa.intro': "Aggiungi un livello di sicurezza in più con un'app di autenticazione TOTP.",
    'account.mfa.resetByAdmin': 'Un altro amministratore può reimpostare i due fattori.',
    'account.mfa.code': 'Codice di autenticazione',
    'account.mfa.confirm': 'Conferma e attiva',
    'account.mfa.enabledToast': 'Due fattori attivati',
    'account.mfa.disabledToast': 'Due fattori disattivati',
    'account.mfa.error.start': 'Non è stato possibile avviare la configurazione dei due fattori',
    'account.mfa.error.code': 'Codice non valido',
    'account.mfa.error.disable': 'Non è stato possibile disattivare i due fattori',
    'account.sessions.title': 'Sessioni attive',
    'account.sessions.intro': "Ogni dispositivo che ha effettuato l'accesso con questo account. Chiuderne uno gli impedisce subito di rinnovare la sessione.",
    'account.sessions.none': 'Nessuna sessione aperta.',
    'account.sessions.device': 'Dispositivo',
    'account.sessions.address': 'Indirizzo',
    'account.sessions.lastUsed': 'Ultimo utilizzo',
    'account.sessions.thisDevice': 'Questo dispositivo',
    'account.sessions.close': 'Chiudi',
    'account.sessions.closed': 'Sessione chiusa',
    'account.sessions.error.close': 'Non è stato possibile chiudere la sessione',
    'account.sessions.confirmCurrent': 'Uscire da questo dispositivo?',
    'account.sessions.confirmCurrentText': 'Uscirai da qui e dovrai accedere di nuovo.',
    'account.sessions.confirmOther': 'Chiudere questa sessione?',
    'account.sessions.confirmOtherText': 'Quel dispositivo dovrà accedere di nuovo. Ciò che ha in uso smette subito di funzionare.',
    'account.sessions.confirm': 'Chiudi la sessione',
    'account.device.unknown': 'Dispositivo sconosciuto',
    'account.device.on': '{browser} su {system}'
  }
}
