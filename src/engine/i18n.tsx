/**
 * i18n — the manifest emits KEYS only (res.*, field.*, enum.*, action.*,
 * group.*). The project supplies translation dictionaries; missing keys fall
 * back to a humanized last segment so the UI never shows a raw key.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Dictionary = Record<string, string>
export type Dictionaries = Record<string, Dictionary>

interface I18nContextValue {
  locale: string
  locales: string[]
  setLocale: (l: string) => void
  t: (key?: string, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

function humanize(key: string): string {
  const last = key.split('.').pop() ?? key
  return last
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

export function I18nProvider({
  dictionaries,
  defaultLocale,
  locales,
  children
}: I18nProviderProps) {
  const [locale, setLocale] = useState(defaultLocale)

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
      }
    }
  }, [dictionaries, locale, locales, defaultLocale])

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
    'error.unavailable': 'Temporarily unavailable. Try again shortly.',
    'error.invalidCredentials': 'Wrong email or password.',
    'error.passwordExpired': 'Your password has expired: set a new one.',
    'error.generic': 'Something went wrong. Please try again.',
    'meta.id': 'ID',
    'meta.createdAt': 'Created',
    'meta.updatedAt': 'Updated',
    'docTitle.create': 'New',
    'docTitle.edit': 'Edit',
    'docTitle.clone': 'Clone',
    'action.copy': 'Copy',
    'action.clone': 'Clone',
    'action.remove': 'Remove',
    'action.delete': 'Delete',
    'action.cancel': 'Cancel',
    'action.confirm': 'Confirm',
    'action.delete.confirmTitle': 'Delete this record?',
    'action.delete.confirmText': "This action can't be undone.",
    // Two-phase container destruction (the `tenant-destroy` action component).
    'destroy.title': 'Destroy this container',
    'destroy.step1': 'Step 1 of 2 · what would be destroyed',
    'destroy.step2': 'Step 2 of 2 · confirm',
    'destroy.check': 'Check what would be destroyed',
    'destroy.empty': 'This container reports nothing to destroy.',
    'destroy.tokenOnce': 'The permission below is shown once and expires. It is never put in a link.',
    'destroy.expires': 'Expires at',
    'destroy.slug': 'Type the slug to confirm',
    'destroy.otp': 'Your second factor',
    'destroy.confirm': 'Destroy permanently',
    'destroy.warning': 'The container is exported first, then destroyed. This cannot be undone.',
    'destroy.done': 'Container destroyed',
    'destroy.already': 'That container was already destroyed.',
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
    'login.error.methodNotAllowed': 'This sign-in method is not allowed for this account.'
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
    'error.unavailable': 'Momentaneamente non disponibile. Riprova fra poco.',
    'error.invalidCredentials': 'Email o password errate.',
    'error.passwordExpired': 'La password è scaduta: impostane una nuova.',
    'error.generic': 'Si è verificato un errore. Riprova.',
    'meta.id': 'ID',
    'meta.createdAt': 'Creato',
    'meta.updatedAt': 'Aggiornato',
    'docTitle.create': 'Nuovo',
    'docTitle.edit': 'Modifica',
    'docTitle.clone': 'Duplica',
    'action.copy': 'Copia',
    'action.clone': 'Clona',
    'action.remove': 'Rimuovi',
    'action.delete': 'Elimina',
    'action.cancel': 'Annulla',
    'action.confirm': 'Conferma',
    'action.delete.confirmTitle': 'Eliminare questo record?',
    'action.delete.confirmText': 'Questa azione non può essere annullata.',
    // Distruzione del contenitore in due fasi (componente azione `tenant-destroy`).
    'destroy.title': 'Distruggi questo contenitore',
    'destroy.step1': 'Passo 1 di 2 · che cosa sparirebbe',
    'destroy.step2': 'Passo 2 di 2 · conferma',
    'destroy.check': 'Verifica che cosa sparirebbe',
    'destroy.empty': 'Questo contenitore dichiara che non c’è nulla da distruggere.',
    'destroy.tokenOnce': 'Il permesso qui sotto si vede una volta sola e scade. Non finisce mai in un link.',
    'destroy.expires': 'Scade il',
    'destroy.slug': 'Ribatti lo slug per confermare',
    'destroy.otp': 'Il tuo secondo fattore',
    'destroy.confirm': 'Distruggi definitivamente',
    'destroy.warning': 'Il contenitore viene prima esportato, poi distrutto. Non si torna indietro.',
    'destroy.done': 'Contenitore distrutto',
    'destroy.already': 'Quel contenitore era già stato distrutto.',
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
    'login.error.methodNotAllowed': 'Questo metodo di accesso non è ammesso per questo account.'
  }
}
