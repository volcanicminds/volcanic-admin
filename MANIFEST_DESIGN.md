# Manifest & Engine — Design (v2)

> Documento **unico** di design del backoffice manifest-driven dell'ecosistema Volcanic Minds. Definisce il
> **contratto** (il Manifest v2), il **lifecycle** (come nasce, dove vive, come si consuma), l'**architettura
> engine/ui** (Refine + shadcn), il **modello di override** e il **multi-tenant**. Fonde e sostituisce il
> precedente `VOLCANIC_ADMIN_BLUEPRINT.md` (ritirato), riallineato alle decisioni v2.
> Documento gemello operativo: `MANIFEST_PLAN.md` (piano a task). In caso di conflitto col codice, **vince il codice**.
>
> **Stato**: design. L'engine admin implementa oggi la **v1** (`src/engine/types/manifest.ts`); questo documento
> descrive la **v2** target. La migrazione v1→v2 dell'engine è il task ADM-1 del piano.

---

## 0. Decisioni fondative (v2)

- **Base frontend**: **Refine** (MIT, headless) + **shadcn/ui**. Identità nostra, ownable.
- **Sorgente schema**: **Manifest Volcanic** emesso dal backend, derivato **solo da route + JSON Schema** (vedi §3).
- **Contratto = Manifest v2**: array unificato **`capabilities`** (`CapabilitySpec[]`) che collassa i v1
  `permissions` + `capabilities`(boolean) + `actions`; `roles` in un posto solo (decisione D1).
- **Scope**: `resources[]` (CRUD) **+** `capabilities[]` top-level (sezioni *operation* standalone) (D2).
- **Generazione schema-only**: il generatore **non** legge il data layer (niente entity-metadata). Conseguenza:
  `relation` magra (no `kind`/`foreignKey`), enum solo se nello schema; il di più va negli overrides (D3).
- **Sensitive graduata**: `password` write-only; `token`/`mfaSecret`/`externalId` esclusi sempre (D4).
- **Override**: structural hints lato BE in `config` del `routes.ts` + split **generated/overrides** lato admin
  (niente `defineAdminResource`) (D5).
- **Niente autoCrud**: il manifest descrive **endpoint hand-written reali** (`/vehicles`, …), non `/admin/<resource>`
  auto-montati. AutoCrud resta capability futura separata (D6).
- **Consumo build-time + snapshot**, manifest **full** con `roles[]` dichiarati (non runtime per-ruolo) (D7).
- **Packaging**: un solo pacchetto frontend `@volcanicminds/admin` (interno `engine` headless + `ui` shadcn); la
  generazione manifest è una **capability opzionale di `@volcanicminds/backend`**, non un secondo pacchetto.
- **Lingua codice**: tutto inglese (entità, field, enum, path, chiavi manifest). Etichette UI via i18n.

---

## 1. Cos'è il manifest

Un **descrittore JSON** dell'API amministrabile, prodotto dal backend e consumato dall'admin per **generare il
pannello senza codice**. È l'altra proiezione della stessa sorgente che alimenta Swagger: `route + schema`. Una
sola manutenzione, due output (OAS per gli sviluppatori, manifest per l'admin).

Principi invarianti:

- **Identità canonica del campo = `(resource, field)`**, non `(schema, property)`. Le N proiezioni schema
  (body/response/public) collassano sull'identità canonica.
- **Ogni label è una chiave i18n**, mai testo letterale. La traduzione è dato di progetto/admin.
- **Confine di responsabilità**: il BE descrive *struttura, dominio, sicurezza*; l'admin decide *presentazione*.

Differenza vs AdminJS (DB-coupled): lì si leggevano i model ORM bypassando la logica. Qui la ricchezza è derivata
dai metadati ma **consegnata via API/manifest**: il motore non tocca il DB, rispetta service layer, Magic Query,
multi-tenancy, sensitive fields, permessi.

---

## 2. Contratto v2 (tipi)

### 2.1 Top level

```ts
interface Manifest {
  version: 2
  generatedAt: string
  i18n: { defaultLocale: string; locales: string[] }
  auth: { mode: 'cookie' | 'bearer'; endpoints: { login: string; refresh: string; logout: string; [k: string]: string } }
  tenancy: { mode: 'single' | 'multi'; switchable?: boolean; header?: string; listEndpoint?: string }
  groups: GroupSpec[]
  enums: Record<string, EnumOption[]>
  resources: ResourceSpec[]
  capabilities?: CapabilitySpec[]   // sezioni "operation" standalone (non legate a una risorsa)
}
```

### 2.2 `CapabilitySpec` — il cuore della v2

Un solo tipo che **unifica** ciò che in v1 erano tre campi separati (`permissions` + `capabilities` booleano +
`actions`). Usato in **due posizioni**: dentro la risorsa (`ResourceSpec.capabilities`) e top-level
(`Manifest.capabilities`, le sezioni operation). I `roles` stanno **in un posto solo**.

```ts
type CapabilityKind = 'list' | 'read' | 'create' | 'update' | 'delete' | 'action'

interface CapabilitySpec {
  name: string                 // univoco nello scope: 'list' | 'create' | ... | 'publish' | 'export'
  kind: CapabilityKind         // CRUD standard, oppure 'action' per le custom
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string                 // binding all'endpoint REALE — fonte unica
  roles: string[]              // autorizzazione dichiarata (gating effettivo: admin runtime + enforcement BE)
  enabled?: boolean            // default true

  // --- solo per kind:'action' (presentazione/comportamento) ---
  label?: I18nKey
  icon?: string
  target?: ('row' | 'bulk' | 'collection')[]
  payload?: Record<string, unknown>          // body statico merge-ato nella richiesta
  confirm?: boolean
  confirmText?: I18nKey
  visibleWhen?: Record<string, Record<string, unknown>>   // condizione di riga (field→operator→value)
  refresh?: boolean
  download?: string                          // mime-type quando l'azione ritorna un file
  component?: string | null                  // override registry id; null → handler generico
}
```

**Regole di derivazione (engine):**

```ts
const can = (caps, kind) => caps.some(c => c.kind === kind && c.enabled !== false)
canCreate = can(resource.capabilities, 'create')
canUpdate = can(resource.capabilities, 'update')
canDelete = can(resource.capabilities, 'delete')
canBulkDelete = resource.capabilities.some(c => c.kind === 'delete' && c.target?.includes('bulk'))
// 'list'/'read' implicite alla presenza della risorsa; la ricerca è resource.search (vedi 2.4), non una capability.
```

### 2.3 `ResourceSpec`

```ts
interface ResourceSpec {
  name: string                 // singolare canonico (es. 'vehicle') — chiave del mapping schema→resource
  path: string                 // segmento URL plurale (es. 'vehicles')
  label: { singular: I18nKey; plural: I18nKey }
  icon?: string; group?: string; order?: number
  idField?: string
  titleField?: string | string[]      // BE indica i campi; template i18n = override admin
  subtitleField?: string | string[]
  tenantScoped?: boolean; softDelete?: boolean; singleton?: boolean
  capabilities: CapabilitySpec[]       // CRUD + azioni custom (sostituisce permissions+capabilities+actions v1)
  defaultSort?: SortSpec[]
  search?: SearchSpec                  // config ricerca (globalSearch), NON una capability
  listLayouts?: ('table' | 'card')[]
  defaultListLayout?: 'table' | 'card'
  cardFields?: string[]
  fields: FieldSpec[]
  views?: { list?: ViewMode; create?: ViewMode; edit?: ViewMode; show?: ViewMode }
}
```

### 2.4 `FieldSpec`, enums, search, relation

```ts
type FieldType =
  | 'string' | 'text' | 'richtext' | 'integer' | 'number' | 'boolean' | 'date' | 'datetime'
  | 'enum' | 'relation' | 'email' | 'url' | 'uuid' | 'json' | 'image' | 'file'

interface FieldSpec {
  name: string
  type: FieldType
  label?: I18nKey
  required?: boolean; readOnly?: boolean; nullable?: boolean; default?: unknown; help?: I18nKey
  enum?: EnumOption[]; enumRef?: string
  relation?: { resource: string; titleField?: string; kind?: RelationKind; foreignKey?: string }  // kind/fk: solo via override (schema-only)
  image?: ImageSpec            // popolato solo via override admin (il BE non lo genera)
  validation?: ValidationSpec  // required/min/max/minLength/maxLength/pattern/step — dallo schema
  list?: FieldListSpec         // presentazione lista → admin (BE può solo imporre sortable:false)
  form?: FieldFormSpec         // presentazione form → admin
}

interface SearchSpec { fields: string[]; operator?: FilterOperator }   // globalSearch: OR su più campi
interface EnumOption { value: string; label: I18nKey; color?: string }
```

**Tipi di campo (render default):** `string`→input · `text`→textarea · `richtext`→WYSIWYG (HTML sanitizzato lato
server) · `integer`/`number`→numerico · `boolean`→switch · `date`/`datetime`→picker · `enum`→select (inline o
`enumRef`) · `relation`→reference-select · `email`/`url`→input validato · `uuid`→readOnly · `json`→editor ·
`image`/`file`→uploader.

**Operatori filtro (`FilterOperator`)** = sottoinsieme Magic Query esposto alla UI: `eq, neq, contains[i],
ncontains[i], starts[i], ends[i], gt, ge, lt, le, between, in, nin, null, notNull`. `:raw` **mai** esposto. La
mappa tipo→operatori consigliati è una scelta di presentazione (admin); il BE può solo restringere.

---

## 3. Generazione lato backend (capability opzionale, schema-only)

Attivabile via `start({ admin: { manifest: true } })`. **Una** responsabilità: generare il manifest sopra gli
**endpoint hand-written esistenti**. **Niente** generic-CRUD auto-mount (D6): il manifest collega gli endpoint
reali; le rotte custom (immagini, status, export) restano nei loro moduli.

### 3.1 Le sorgenti (solo route + schema)

Il generatore **deriva**, non inventa, combinando in ordine di autorità crescente:

1. **`global.routes`** (esposto dal core, task BE-1): method, path **reale**, `roles`, e il `config` file-level +
   per-route con gli **hint strutturali** (§3.4).
2. **JSON Schema registrati** (`server.getSchemas()`): per ogni route, risolve i `$ref` di `doc.body`/`doc.response`
   → campi, tipi, `required`, `validation` (`min/max/minLength/maxLength/pattern/format`), `enum` inline.
3. **Hint `config`** del `routes.ts` (§3.4): `resource.name` (mapping schema→resource, niente euristica fragile),
   `group`, `titleField`, `subtitleField`, `globalSearch`.

> **Niente entity-metadata** (D3). Quindi `relation.kind`, `foreignKey`, `image`, e gli enum non dichiarati nello
> schema **non** sono generati: si colmano negli `overrides` admin. È un downgrade voluto di fedeltà in cambio del
> disaccoppiamento totale dal data layer (il core non importa né interroga `/typeorm`).

### 3.2 Pipeline

```
global.routes (+ config hints)  ─┐
server.getSchemas() ($ref deref) ─┼─▶ per resource:
hint config (group/title/search) ─┘   1. raggruppa le route per resource (hint resource.name + path)
                                       2. campi ← collasso proiezioni schema su (resource, field)
                                       3. capabilities ← verbi CRUD + rotte custom (kind:'action')
                                       4. roles ← route.roles (un posto solo)
                                       5. drop sensitive (graduata §5/§9)
                                       ▶ ResourceSpec
endpoint non-resource ───────────────▶ Manifest.capabilities[] (sezioni operation)
manifest = { meta, i18n, auth, tenancy, groups, enums, resources[], capabilities[] }
```

Precedenza per proprietà: **hint config > JSON Schema > default per tipo**.

### 3.3 i18n by convention

Il generatore emette **chiavi**, mai testo: `res.<name>.{singular,plural}`, `field.<resource>.<field>`,
`enum.<EnumName>.<value>`, `action.<resource>.<action>`, `group.<name>`, `op.<name>` (sezioni operation). Il
progetto fornisce le traduzioni; chiavi mancanti → fallback alla chiave o a una label umanizzata.

### 3.4 Hint strutturali nel `routes.ts` (L1, lato BE)

Additivi, opzionali, dominio (niente UI). Raggruppati sotto **`config.manifest`** (file-level e/o per-route), per
tenerli separati dalla config operativa della rotta (schema Fastify, controller, …):

```ts
export const config = {
  // …config operativa (title, controller, tags, …)…
  manifest: {
    group: 'catalog',
    resource: {
      name: 'vehicle',               // mapping schema→resource (autorevole); path 'vehicles' → name 'vehicle'
      titleField: 'name',
      subtitleField: 'trimLevel',
      globalSearch: ['name', 'trimLevel', 'description', 'tag', 'brand.name']
    }
  }
}
```

> **Convenzione (≥ 3.3.0)**: gli hint vivono sotto `config.manifest`; la forma flat `config.{group,resource}` **non è
> più supportata** (nessuna retro-compatibilità). Le API native del framework (`users`/`tenants`) dichiarano già gli
> hint → risorse `user`/`tenant` (nome singolare, `path` plurale invariato), gruppo `system`.

Se `group` manca → fallback al nome cartella dell'API. Se `titleField` manca → euristica (`name`→`title`→`label`→
primo `string`). `globalSearch` è la **fonte unica** dei campi omni-search (lato controller si legge da qui,
eliminando duplicazioni tipo `omniSearch.ts`).

### 3.5 Consegna: full manifest + build-time

- **Full manifest** (non per-utente): elenca tutte le risorse/capability con i `roles` **dichiarati**.
- **`GET /admin/manifest`** (DEV): l'admin fa fetch all'avvio.
- **Dump/snapshot** (BUILD): comando che emette `manifest.json` su file → la CI dell'admin builda senza il BE live.
- Il **gating per-ruolo** è admin a runtime (nasconde ciò che il ruolo non può usare) **+ enforcement autorevole
  sugli endpoint BE** (difesa in profondità). Niente cache per-ruolo lato BE (era un'esigenza del modello runtime v1,
  superata dal consumo build-time).

---

## 4. Lifecycle (build-time, split generated/overrides)

```
┌─ BE (volcanic-backend) ───────────────────────────────────────────────┐
│ start({ admin:{manifest:true} })                                       │
│   global.routes  +  server.getSchemas()   ── generator (schema-only) ──▶ Manifest JSON (full, roles dichiarati)
│   GET /admin/manifest        e/o          dump → manifest.json (snapshot CI)                                   │
└────────────────────────────────────────────────────────────────────────┘
                                   │ fetch (DEV all'avvio) / snapshot (BUILD)
                                   ▼
┌─ Admin (volcanic-admin) ──────────────────────────────────────────────┐
│ manifest.generated.ts   ← sempre rigenerato, MAI editato a mano        │
│ manifest.overrides.ts   ← solo progetto, scaffold vuoto, MAI rigenerato│
│                         merge( generated, overrides )  per (resource,field)
│                                   ▼                                     │
│                 engine + ui  → pannello (zero-config + override)        │
└────────────────────────────────────────────────────────────────────────┘
```

- **DEV**: fetch a `GET /admin/manifest` all'avvio. **BUILD**: legge lo snapshot committato (CI admin disaccoppiata).
- **Split**: il rigeneratore sovrascrive solo `generated`; gli `overrides` sopravvivono → niente drift distruttivo.
- **Merge per identità `(resource, field)`**: l'override aggancia per chiave canonica, non per posizione/schema.

---

## 5. Engine + UI (Refine, split interno)

Un pacchetto, due metà. L'**`engine`** è headless e **non importa shadcn**; la **`ui`** consuma l'engine e rende con
shadcn → la UI è sostituibile.

```
@volcanicminds/admin
  ├─ engine/   (headless)
  │   ├─ manifest interpreter   → manifest → modello risorse → <Resource> Refine
  │   ├─ dataProvider           → operazioni Refine → REST + Magic Query (field:op=value, sort, page/pageSize) + header v-*
  │   ├─ authProvider           → /auth (login/refresh/logout), AUTH_MODE BEARER|COOKIE
  │   ├─ accessControlProvider  → capabilities[].roles × ruoli utente → nasconde/disabilita
  │   ├─ tenantProvider         → switch tenant + header di contesto (attivo solo se tenancy.mode='multi')
  │   └─ override registry      → componentId → componente custom
  └─ ui/      (shadcn)
      ├─ resource generator     → field spec → list / create / edit / show
      ├─ widget set             → input per tipo (enum/relation/richtext/image/…)
      └─ theme / layout / i18n
```

**Flusso**: avvio → manifest (fetch DEV / snapshot BUILD) → l'engine costruisce il modello e registra le
`<Resource>` → la ui genera le schermate dai field spec; dove il manifest indica un `componentId`, il registry
inietta il componente di override.

**Zero-config rendering**: senza override, dal manifest si ottiene sidebar (da `groups`+`resources`), liste
table/card (`listLayouts`/`defaultListLayout`), dettaglio con layout standard, e le **sezioni operation** top-level
(`Manifest.capabilities[]`) come pagine/azioni dedicate.

---

## 6. Modello di override

Due piani, dal dominio alla presentazione:

- **L1 — structural hints (BE, `routes.ts` config)**: dominio. `resource.name/titleField/subtitleField/globalSearch`,
  `group`. Niente UI. Finiscono nel `generated`.
- **L2 — presentation overrides (admin, `manifest.overrides.ts` + props/plugin)**: UI. Quattro granularità, dal più
  fine al più grosso:
  1. **manifest tweak** — riordino campi, label, visibilità, operatori, gruppi form. Zero React.
  2. **widget di campo** — `field.form.widget = "gallery-reorder"` → componente custom per quell'input.
  3. **capability/action component** — `capability.component = "status-workflow"` per bottoni row/bulk/collection.
  4. **view/page** — `views.edit = "vehicle-edit-custom"` o pagina extra (dashboard/report) nel router del progetto.

Inoltre L2 colma i **limiti dello schema-only**: `relation.kind`/`foreignKey`, `image` config, enum non dichiarati.

Principio: **80% OOTB dal manifest, 20% override mirati**. Nessun progetto riscrive la base CRUD. Gli override sono
**iniettati** (props `overrides/routes/theme/dictionaries` o `plugins`), mai fork/monkey-patch.

---

## 7. Multi-tenant

- **single**: nessuno switcher; `tenancy.mode = 'single'`.
- **multi**: topbar con **selettore tenant** (lista da `tenancy.listEndpoint`, default `/tenants`); il tenant scelto
  definisce il contesto delle risorse `tenantScoped`. Le risorse globali (`tenant`, talvolta `user`) restano fuori
  scope. Il backend isola via `search_path`/`runInTenantContext` (mai switch globale); l'header di contesto
  (`tenancy.header`, es. `x-tenant-id`) è iniettato dal `tenantProvider` su ogni richiesta.

---

## 8. Ripartizione BE ↔ Admin (copertura)

| Informazione | Sorgente | Note |
|---|---|---|
| risorse, `path`, `name` | **BE** | da route + hint `resource.name` |
| campi, tipi, `required`, `validation` | **BE** | da JSON Schema (collasso `$ref`) |
| enum-values | **BE** | solo se presenti nello schema |
| `capabilities` (CRUD + azioni) | **BE** | binding endpoint reali + `roles` |
| `roles` per capability | **BE** | dichiarati; gating effettivo a runtime |
| `relation.resource` | **BE** | target |
| `relation.kind` / `foreignKey` | **Admin (override)** | non deducibili dallo schema |
| `image` config (accept/maxSize/storage/endpoints) | **Admin (override)** | il BE non lo genera |
| `group` (presenza), `titleField`/`subtitleField` (campi) | **BE** | hint `config`, fallback euristica |
| `group` label/icon/order, `titleField` template i18n | **Admin** | presentazione |
| `fields.list` / `fields.form` (widget, colSpan, group, visible…) | **Admin** | il BE può solo imporre `sortable:false` |
| layouts, `defaults`, theming, dashboard, shortcut, dizionari | **Admin** | presentazione pura |
| `globalSearch` (campi) | **BE** | hint `resource.globalSearch` |

---

## 9. Modello di sicurezza

- Il manifest build-time è **full**: elenca tutte le risorse/capability con i `roles` **dichiarati**.
- **Gating duplice**: l'admin nasconde a runtime ciò che il ruolo non può usare; il **BE resta l'autorità** e rifiuta
  comunque le chiamate non autorizzate sugli endpoint.
- **Sensitive policy graduata** (D4): `password` esclusa da read/list, ammessa **write-only** in create/update;
  `token`/`mfaSecret`/`externalId` esclusi **sempre**. Blacklist estensibile via config del BE.

---

## 10. Diff v1 → v2 (impatto migrazione)

| v1 (oggi, `src/engine/types/manifest.ts`) | v2 (target) |
|---|---|
| `version: 1` | `version: 2` |
| `resource.permissions: Partial<Record<CrudAction,string[]>>` | confluito in `capabilities[].roles` |
| `resource.capabilities: { create?:bool, … }` | confluito in `capabilities[]` (presenza/`enabled`) |
| `resource.actions: ActionSpec[]` | confluito in `capabilities[]` con `kind:'action'` |
| — | nuovo `Manifest.capabilities[]` top-level (sezioni operation) |
| `bulkDelete?: boolean` | `delete` con `target` incl. `'bulk'` |
| `search` (capability boolean) | derivato dalla presenza di `resource.search` |

**File da migrare (task ADM-1):** `src/engine/types/manifest.ts`, `src/engine/interpreter.ts` (`:59-62`),
`src/engine/providers/accessControl.ts` (`:41`), `src/ui/generators/ListView.tsx` (`:98-100`,`:150`),
`src/ui/generators/ShowView.tsx`, `src/mock/manifest.ts`, `src/mock/manifestUnchanged.ts`.

---

## 11. Esempio (risorsa `vehicle`, v2)

```ts
{
  name: 'vehicle', path: 'vehicles',
  label: { singular: 'res.vehicle.singular', plural: 'res.vehicle.plural' },
  group: 'catalog', titleField: 'name', subtitleField: 'trimLevel', tenantScoped: true,
  capabilities: [
    { name: 'list',    kind: 'list',   method: 'GET',    path: '/vehicles',           roles: ['admin'] },
    { name: 'read',    kind: 'read',   method: 'GET',    path: '/vehicles/:id',       roles: ['admin'] },
    { name: 'create',  kind: 'create', method: 'POST',   path: '/vehicles',           roles: ['admin'] },
    { name: 'update',  kind: 'update', method: 'PUT',    path: '/vehicles/:id',       roles: ['admin'] },
    { name: 'delete',  kind: 'delete', method: 'DELETE', path: '/vehicles/:id',       roles: ['admin'], target: ['row', 'bulk'] },
    { name: 'publish', kind: 'action', method: 'PATCH',  path: '/vehicles/:id/status', roles: ['admin'],
      target: ['row', 'bulk'], payload: { status: 'published' }, visibleWhen: { status: { neq: 'published' } }, refresh: true },
    { name: 'archive', kind: 'action', method: 'PATCH',  path: '/vehicles/:id/status', roles: ['admin'],
      target: ['row', 'bulk'], payload: { status: 'archived' }, refresh: true }
  ],
  search: { fields: ['name', 'trimLevel', 'description', 'tag'], operator: 'containsi' },
  defaultSort: [{ field: 'importance', order: 'desc' }],
  listLayouts: ['table', 'card'], defaultListLayout: 'card',
  fields: [ /* … (relation 'brand' magra: { resource:'brand', titleField:'name' }; kind/foreignKey via override) … */ ]
}
```

Sezione operation standalone (top-level `Manifest.capabilities[]`):

```ts
capabilities: [
  { name: 'rebuildSitemap', kind: 'action', method: 'POST', path: '/public/sitemap/rebuild',
    roles: ['admin'], label: 'op.sitemap.rebuild', icon: 'refresh', target: ['collection'], confirm: true }
]
```

---

## 12. Dionisi come prima istanza (validazione del contratto)

I 5 override Dionisi sono il test di completezza della v2 (devono essere esprimibili senza forzature):
`company` **singleton** (solo edit) · **gallery-reorder** con cover + dropdown `altView` · **status workflow**
(`publish`/`archive` come `capabilities` `kind:'action'`) · **export CSV** newsletter (capability `kind:'action'`,
`target:['collection']`, `download`) · **image-single** (logo brand). Dettaglio dominio in
`dionisi-group/BACKOFFICE_BLUEPRINT.md`; cablaggio in `BACKEND_IMPLEMENTATION_TODO.md` (Fase 8) e
`BO_ADMIN_IMPLEMENTATION_TODO.md`.
