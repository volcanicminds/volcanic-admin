/**
 * Labels for the resources every volcanic-backend describes on its own: users, tokens, the two
 * logs, and on the control plane system users, system tokens and workspaces (tenants). The
 * manifest names them by key only; without these an Italian console would show humanized English.
 * A consumer overrides any key through its own `dictionaries`, merged after these.
 */
import type { Dictionaries } from './i18n.js'

type Pair = { en: string; it: string }

/** Field labels shared by every built-in resource that has a field of that name. */
const FIELDS: Record<string, Pair> = {
  id: { en: 'ID', it: 'ID' },
  username: { en: 'Username', it: 'Nome utente' },
  email: { en: 'Email', it: 'Email' },
  password: { en: 'Password', it: 'Password' },
  blocked: { en: 'Blocked', it: 'Bloccato' },
  blockedReason: { en: 'Block reason', it: 'Motivo del blocco' },
  blockedAt: { en: 'Blocked at', it: 'Bloccato il' },
  confirmed: { en: 'Confirmed', it: 'Confermato' },
  confirmedAt: { en: 'Confirmed at', it: 'Confermato il' },
  approved: { en: 'Approved', it: 'Approvato' },
  approvedAt: { en: 'Approved at', it: 'Approvato il' },
  roles: { en: 'Roles', it: 'Ruoli' },
  attributes: { en: 'Attributes', it: 'Attributi' },
  mfaEnabled: { en: 'Two-factor', it: 'Due fattori' },
  version: { en: 'Version', it: 'Versione' },
  createdAt: { en: 'Created at', it: 'Creato il' },
  updatedAt: { en: 'Updated at', it: 'Aggiornato il' },
  name: { en: 'Name', it: 'Nome' },
  description: { en: 'Description', it: 'Descrizione' },
  expiresAt: { en: 'Expires at', it: 'Scade il' },
  occurredAt: { en: 'Occurred at', it: 'Avvenuto il' },
  action: { en: 'Action', it: 'Azione' },
  outcome: { en: 'Outcome', it: 'Esito' },
  intentId: { en: 'Intent ID', it: 'ID intento' },
  actorId: { en: 'Actor ID', it: 'ID autore' },
  actorKind: { en: 'Actor kind', it: 'Tipo di autore' },
  tenantId: { en: 'Workspace ID', it: 'ID spazio di lavoro' },
  targetId: { en: 'Target ID', it: 'ID oggetto' },
  detail: { en: 'Detail', it: 'Dettaglio' },
  requestId: { en: 'Request ID', it: 'ID richiesta' },
  ip: { en: 'IP address', it: 'Indirizzo IP' },
  scope: { en: 'Scope', it: 'Ambito' },
  event: { en: 'Event', it: 'Evento' },
  code: { en: 'Code', it: 'Codice' },
  subjectId: { en: 'Subject ID', it: 'ID soggetto' },
  methods: { en: 'Methods', it: 'Metodi' },
  provider: { en: 'Provider', it: 'Provider' },
  flowId: { en: 'Flow ID', it: 'ID flusso' },
  sid: { en: 'Session', it: 'Sessione' },
  slug: { en: 'Slug', it: 'Slug' },
  strategy: { en: 'Strategy', it: 'Strategia' },
  engine: { en: 'Engine', it: 'Motore' },
  locator: { en: 'Data location', it: 'Posizione dei dati' },
  schemaVersion: { en: 'Schema version', it: 'Versione dello schema' },
  status: { en: 'Status', it: 'Stato' },
  movedTo: { en: 'Moved to', it: 'Spostato in' },
  config: { en: 'Configuration', it: 'Configurazione' },
  admin: { en: 'Administrator', it: 'Amministratore' }
}

const USER = ['id', 'username', 'email', 'password', 'blocked', 'blockedReason', 'blockedAt', 'confirmed',
  'confirmedAt', 'approved', 'approvedAt', 'roles', 'attributes', 'mfaEnabled', 'version', 'createdAt', 'updatedAt']
const SYSTEM_USER = ['id', 'email', 'password', 'roles', 'blocked', 'blockedReason', 'blockedAt',
  'mfaEnabled', 'version', 'createdAt', 'updatedAt']
const TOKEN = ['id', 'name', 'description', 'expiresAt', 'roles']
const GOVERNANCE_LOG = ['id', 'occurredAt', 'action', 'outcome', 'intentId', 'actorId', 'actorKind', 'tenantId',
  'targetId', 'detail', 'requestId', 'ip']
const ACCESS_LOG = ['id', 'occurredAt', 'scope', 'event', 'outcome', 'code', 'subjectId', 'methods', 'provider',
  'flowId', 'sid', 'ip']
const TENANT = ['id', 'name', 'slug', 'strategy', 'engine', 'locator', 'schemaVersion', 'status', 'movedTo',
  'config', 'admin', 'createdAt', 'updatedAt']

/** Each built-in resource: its singular and plural label, and the fields it describes. */
const RESOURCES: Record<string, { singular: Pair; plural: Pair; fields: string[] }> = {
  user: { singular: { en: 'User', it: 'Utente' }, plural: { en: 'Users', it: 'Utenti' }, fields: USER },
  token: { singular: { en: 'Token', it: 'Token' }, plural: { en: 'Tokens', it: 'Token' }, fields: TOKEN },
  governanceLog: {
    singular: { en: 'Governance event', it: 'Evento di governance' },
    plural: { en: 'Governance log', it: 'Registro di governance' },
    fields: GOVERNANCE_LOG
  },
  accessLog: {
    singular: { en: 'Access event', it: 'Evento di accesso' },
    plural: { en: 'Access log', it: 'Registro degli accessi' },
    fields: ACCESS_LOG
  },
  systemUser: {
    singular: { en: 'System user', it: 'Utente di sistema' },
    plural: { en: 'System users', it: 'Utenti di sistema' },
    fields: SYSTEM_USER
  },
  systemToken: {
    singular: { en: 'System token', it: 'Token di sistema' },
    plural: { en: 'System tokens', it: 'Token di sistema' },
    fields: TOKEN
  },
  systemAccessLog: {
    singular: { en: 'System access event', it: 'Evento di accesso al sistema' },
    plural: { en: 'System access log', it: 'Registro degli accessi al sistema' },
    fields: ACCESS_LOG
  },
  tenant: {
    singular: { en: 'Workspace', it: 'Spazio di lavoro' },
    plural: { en: 'Workspaces', it: 'Spazi di lavoro' },
    fields: TENANT
  }
}

/** Enum values, keyed `enum.<field>.<value>` as the manifest emits them. */
const ENUMS: Record<string, Record<string, Pair>> = {
  outcome: {
    success: { en: 'Success', it: 'Riuscito' },
    intent: { en: 'Intent', it: 'Intento' },
    failure: { en: 'Failure', it: 'Non riuscito' }
  },
  actorKind: {
    user: { en: 'User', it: 'Utente' },
    system_user: { en: 'System user', it: 'Utente di sistema' },
    token: { en: 'Token', it: 'Token' }
  },
  scope: {
    tenant: { en: 'Workspace', it: 'Spazio di lavoro' },
    control: { en: 'Control plane', it: 'Piano di controllo' }
  },
  strategy: {
    schema: { en: 'Schema', it: 'Schema' },
    container: { en: 'Container', it: 'Container' }
  },
  engine: { postgres: { en: 'PostgreSQL', it: 'PostgreSQL' } },
  status: {
    active: { en: 'Active', it: 'Attivo' },
    suspended: { en: 'Suspended', it: 'Sospeso' },
    archived: { en: 'Archived', it: 'Archiviato' },
    moved: { en: 'Moved', it: 'Spostato' },
    destroyed: { en: 'Destroyed', it: 'Distrutto' }
  }
}

/** Custom actions, keyed `action.<resource>.<name>` as the manifest emits them. */
const ACTIONS: Record<string, Record<string, Pair>> = {
  user: {
    roles: { en: 'Roles', it: 'Ruoli' },
    me: { en: 'My profile', it: 'Il mio profilo' },
    me_put: { en: 'Update my profile', it: 'Aggiorna il mio profilo' },
    'is-admin': { en: 'Is administrator', it: 'È amministratore' },
    block: { en: 'Block', it: 'Blocca' },
    unblock: { en: 'Unblock', it: 'Sblocca' },
    approve: { en: 'Approve', it: 'Approva' },
    reset: { en: 'Reset two-factor', it: 'Reimposta i due fattori' },
    reset_post: { en: 'Reset password', it: 'Reimposta la password' },
    identities: { en: 'Linked identities', it: 'Identità collegate' },
    identities_post: { en: 'Link an identity', it: "Collega un'identità" },
    identities_delete: { en: 'Unlink an identity', it: "Scollega un'identità" }
  },
  token: {
    reissue: { en: 'Reissue', it: 'Riemetti' },
    'pairing-code': { en: 'Pairing code', it: 'Codice di abbinamento' },
    pair: { en: 'Pair', it: 'Abbina' },
    block: { en: 'Block', it: 'Blocca' },
    unblock: { en: 'Unblock', it: 'Sblocca' }
  }
}

function build(locale: keyof Pair): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [name, res] of Object.entries(RESOURCES)) {
    out[`res.${name}.singular`] = res.singular[locale]
    out[`res.${name}.plural`] = res.plural[locale]
    for (const field of res.fields) {
      const label = FIELDS[field]
      if (!label) throw new Error(`systemDictionaries: no label for field "${field}" of "${name}"`)
      out[`field.${name}.${field}`] = label[locale]
    }
  }
  for (const [field, values] of Object.entries(ENUMS)) {
    for (const [value, label] of Object.entries(values)) out[`enum.${field}.${value}`] = label[locale]
  }
  // The sidebar group the backend puts its own resources in.
  out['group.system'] = locale === 'it' ? 'Sistema' : 'System'
  for (const [res, actions] of Object.entries(ACTIONS)) {
    for (const [name, label] of Object.entries(actions)) out[`action.${res}.${name}`] = label[locale]
  }
  return out
}

export const systemDictionaries: Dictionaries = { en: build('en'), it: build('it') }
