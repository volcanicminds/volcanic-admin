# Manifest — Piano di implementazione (multi-repo)

> Piano operativo per la **capability manifest** dell'ecosistema Volcanic Minds: il backend
> (`@volcanicminds/backend`) genera OOTB un **manifest descrittore** (core + endpoint custom del progetto);
> l'admin (`@volcanicminds/admin`) lo consuma a **build-time** e ci sovrappone le personalizzazioni; Dionisi
> è la prima istanza reale che lo valida.
>
> **Stato**: design in corso. Contratto target = **Manifest v2** (vedi `MANIFEST_DESIGN.md`). L'engine admin
> oggi implementa la **v1** (`src/engine/types/manifest.ts`): la v2 è un refactor breaking pianificato e
> migrato nei task ADM-1/M3.
>
> **Repo coinvolti**: `volcanic-backend` (framework), `volcanic-backend-sample`, `volcanic-admin` (prodotto admin),
> `dionisi-group/backend` (consumer BE), `dionisi-group/backoffice` (istanza admin).
>
> **Documento gemello**: `MANIFEST_DESIGN.md` (M0-1) — contratto e lifecycle. Tutti i documenti del manifest
> vivono in questo repo (`volcanic-admin`).

---

## Decisioni architetturali fissate

1. **Una sorgente, due proiezioni.** `route + schema (+ entity)` alimentano *sia* l'OAS/Swagger (già OOTB) *sia*
   il manifest. Coerenza by-construction, zero doppia manutenzione.
2. **Identità canonica del campo = `(resource, field)`**, non `(schema, property)`. Il generatore **collassa** le N
   proiezioni schema (body/response/public) sull'identità canonica → override per-entity, non per-schema.
3. **Ripartizione BE ↔ Admin**:
   - **BE** = struttura + dominio + sicurezza/federazione: risorse/campi esposti (whitelist/blacklist), tipi-dominio,
     enum-values, relazioni, vincoli (required/min/max/pattern), roles, binding endpoint reali (CRUD + azioni).
   - **Admin** = presentazione: widget/componenti, gruppi sidebar (label/icon/order), `form.group`/sezioni, layouts,
     colori, label i18n, views, default UI, theming, dashboard, shortcut.
4. **Modello a 3 livelli**:
   - **L0 zero-config** (BE, euristiche): group=dir, titleField=euristica, tipi/required da schema.
   - **L1 structural hints** (BE, dentro `config` del `routes.ts`): `group`, `resource:{titleField,subtitleField,globalSearch}`.
     Dominio, opzionale, additivo, niente UI.
   - **L2 presentation** (Admin, overrides): tutta la UI.
5. **Consumo build-time** con **split `generated` / `overrides`**:
   - `manifest.generated.ts` → **sempre** prodotto dal BE, mai editato a mano (sovrascritto a ogni refresh).
   - `manifest.overrides.ts` → solo progetto, scaffold vuoto alla prima generazione, mai toccato dal rigeneratore.
   - admin a build: `merge(generated, overrides)`. Risolve il drift mantenendo gli override.
6. **Sicurezza**: il manifest build-time è **full** (non per-utente) → porta `roles[]` dichiarati per capability; il gating
   per-ruolo è admin a runtime + **enforcement autorevole sugli endpoint BE**.
7. **AutoCrud NON implementato ora** (né framework né Dionisi): Dionisi ha endpoint hand-written ricchi; il manifest
   funziona sopra di essi. Resta capability futura separata.

### Decisioni bloccate nel brainstorming (2026-06-28)

8. **Contratto = Manifest v2**, array unificato **`capabilities`** (`CapabilitySpec[]`): collassa i v1
   `permissions` + `capabilities`(boolean) + `actions` in **una sola lista**, con `roles` in un posto solo.
   Stesso tipo usato in `resources[].capabilities` (CRUD + azioni sulla risorsa) e nel **`capabilities[]` top-level**
   (sezioni *operation* standalone, non legate a un'entità). `version: 2`. `search` resta config di lista
   (`resource.search`), NON una capability. Dettaglio in `MANIFEST_DESIGN.md`.
9. **Scope = risorse + sezioni operation**: il manifest ha `resources[]` **e** `capabilities[]` top-level per gli
   endpoint non-CRUD (storefront/tool/azioni pure → pagina/azione dedicata generata dall'engine).
10. **Fedeltà = solo JSON Schema**: il generatore NON dipende dal data layer. Conseguenza: `relation` esce **magra**
    (solo `resource` target; niente `kind`/`foreignKey`, non deducibili dallo schema); enum-values solo se presenti
    nello schema. Il di più si colma negli `overrides` admin.
11. **Sensitive = policy graduata**: `password` esclusa da read/list ma ammessa **write-only** in create/update;
    `token`/`mfaSecret`/`externalId` esclusi **sempre**. Blacklist estensibile via config. Niente esclusione binaria.
12. **Naming/copertura**: omni → **`globalSearch`**; `image` config → no BE (override admin); `defaults`
    (pageSizes/bulk) → solo admin; `list.visible/sortable` → admin (BE può imporre `sortable:false`); `titleField`/
    `subtitleField` → BE indica la lista campi, l'admin opzionalmente un template i18n con variabili, fallback =
    concatenazione.

---

## M0 — Design & contratto *(prima di toccare codice)*

- [x] **M0-1** `MANIFEST_DESIGN.md` (volcanic-admin): contratto v2 completo + lifecycle + split generated/overrides +
      copertura BE↔admin + modello override + multi-tenant + sicurezza + diff v1→v2. **Ha assorbito e sostituito
      `VOLCANIC_ADMIN_BLUEPRINT.md`** (ritirato), riallineando generatore→schema-only, niente autoCrud, build-time.
- [x] **M0-2** Contratto v2 `capabilities`: `CapabilityKind` + campi + derivazioni engine + `capabilities[]` top-level
      → specificato in `MANIFEST_DESIGN.md §2.2`. (Tipo TS + JSON Schema discendono da qui.)
- [x] **M0-3** **JSON Schema del Manifest v2** → `manifest.v2.schema.json` (draft 2020-12, `$id` volcanicminds).
      Contratto di confine BE↔admin: il BE produce JSON validato, l'engine lo interpreta. Il tipo TS `Manifest`
      resta nell'engine (`src/engine/types/manifest.ts`, da migrare a v2 in ADM-1) e deve coincidere con questo schema.
      **Validatore eseguibile**: `npm run validate:manifest` (Ajv 2020 + `ajv-formats`, `scripts/validate-manifest.mjs`)
      valida un manifest contro lo schema; default = `manifest.v2.example.json` (fixture v2 valida, smoke CI). Da
      cablare in CI e nel generatore BE (BE-3/BE-5).
- [x] **M0-4** Spec degli **structural hints** in `config` del `routes.ts` (`resource.name/titleField/subtitleField/
      globalSearch`, `group`) → specificata in `MANIFEST_DESIGN.md §3.4`. (Implementazione tipo = BE-2.)

### Allineamento documentale (fatto 2026-06-28)
Consolidata la fonte canonica su `MANIFEST_DESIGN.md` (v2). Interventi:
- 🔴 `dionisi-group/VOLCANIC_ADMIN_BLUEPRINT.md` → **fuso in `MANIFEST_DESIGN.md` e rimosso** (era v1: permissions/
  capabilities/actions separati, entity-metadata, autoCrud, `defineAdminResource`).
- 🟡 `BACKEND_IMPLEMENTATION_TODO.md` → Fase 8 a v2; nota autoCrud (D6).
- 🟡 `BO_ADMIN_IMPLEMENTATION_TODO.md` → fonte di verità + `permissions`→`capabilities.roles` + riferimenti.
- 🟡 `BACKOFFICE_BLUEPRINT.md` → cross-ref §10.5 a `MANIFEST_DESIGN.md` (resta analisi di dominio valida).
- ⚫ `dionisi-group/VOLCANIC_BACKEND_V3.md` → banner **obsoleto** (merge v3 completato).
- 🟡 `volcanic-admin/README.md` → rimando a `MANIFEST_DESIGN.md`.
- ⏳ **Restano v1 fino ad ADM-1** (codice, non doc): `src/engine/types/manifest.ts`, `src/mock/*` (commenti citano i
  blueprint rimossi), `README.md §Architecture`, `docs/CONSUMING.md` (terminologia `actions`). Li migra ADM-1/ADM-6.

## M1 — Framework backend `@volcanicminds/backend`

- [x] **BE-1** Esporre `global.routes` (+ tipo `var routes: ConfiguredRoute[]` in `types/global.d.ts`). FATTO:
      `apply()` (`lib/loader/router.ts`) ora salva le rotte montate (enabled+valid) in `global.routes` prima di
      `applyRoutes`. `check-all` (lint/type-check/depcruise) + test suite verdi. *(test dedicato → BE-7)*
- [x] **BE-2** FATTO: `ResourceHints` + `RouteConfig.{group,resource}` in `types/global.d.ts`; `ConfiguredRoute`
      ora porta `group`/`resource` (da `config` file-level con override per-route, computati in `processRoute`).
      Additivo, zero-breaking. `check-all` + test verdi. *(test dedicato → BE-7)*
- [x] **BE-3** FATTO: `lib/manifest/generator.ts` — `buildManifest({routes,schemas,options})` (puro) + `generateManifest(server)`
      (legge `global.routes` + `server.getSchemas()`, auth da `AUTH_MODE`, tenancy da `multi_tenant`). Risolve i `$ref`,
      collassa body+response su `(resource,field)`, mappa tipo schema→FieldType, dedup CRUD per kind + azioni custom,
      classifica resource vs `capabilities[]` top-level. depcruise pulito (no data layer). 8 unit test verdi.
      *Primo cut*: `relation` magra/non-detected, enum inline (no catalogo/`enumRef`), ampiezza tipi → hardening BE-7.
- [x] **BE-4** FATTO (dentro il generatore, `collectFields`): `password` write-only (solo body, mai readable);
      `token`/`externalId`/`mfaSecret`/`refreshToken`/`resetPasswordToken`/`confirmationToken` esclusi sempre; blacklist
      estensibile via `options.sensitiveAlways/sensitiveWriteOnly`. Coperto dai test.
- [x] **BE-5** FATTO: endpoint `GET /admin/manifest` (full, `roles:[admin]`) come **API nativa** `lib/api/admin`
      (route+controller, chiama `generateManifest(req.server)`). Opt-in via **`config.options.manifest.enabled`**
      (NON nel `start()` — coerente con `scheduler`/`multi_tenant`; tipo + default in `general.ts`). Smoke runtime:
      ON→401 (montata+gated), OFF→404 (assente). *(e2e con token admin + validazione Ajv → BE-7)*
- [x] **BE-6** FATTO: hook env in `start()` — `MANIFEST_DUMP=<path>` scrive il manifest su file; `MANIFEST_DUMP_EXIT=true`
      salta `listen()` e ritorna (comando di dump puro per la CI). `generateManifest`/`buildManifest` esportati da `index.ts`.
      **Cross-check verificato**: il manifest dumpato dalle route native del framework **valida contro `manifest.v2.schema.json`
      (Ajv)** ✓. *(npm script lato consumer + e2e committato → BE-7)*
- [x] **BE-7** Test BE core (core 64 + typeorm 52 verdi) + **docs `llms.txt §11.4`** (capability, opt-in config,
      schema-only, hint, sensitive, dump, `autoCrud` *non* implementato). Unico residuo: e2e committato del file dump (BE-6). Copertura per pezzo:
  - [x] **BE-1** `global.routes` popolato dopo boot: array, path con slash, roles, include `/admin/manifest`. (`test/unit/routes.ts`)
  - [x] **BE-2** hint `config` file-level + override per-route nell'oggetto route (group, resource.*). (idem, via `processRoute`)
  - [x] **BE-3** generatore: fixture route+schema → manifest atteso; `$ref` collassati su `(resource,field)`,
        classificazione resource vs operation, derivazione `capabilities` (CRUD+action) e `roles`. (`test/unit/manifest.ts`)
  - [x] **BE-4** sensitive policy: `password` write-only (in create/update, fuori da read/list); `externalId` mai presente. (idem)
  - [x] **BE-5** e2e committato (`test/e2e/manifest.ts`): `GET /admin/manifest` → 401 senza token; `generateManifest(server)`
        sulle route live → manifest v2 valido (kind ammessi, include `/admin/manifest`). (200 con token admin: manca seed utente → follow-up)
  - [~] **BE-6** dump/snapshot: file emesso valido contro lo schema Ajv — **verificato manualmente** (manifest nativo ⊨ v2);
        e2e committato del file dump ancora da scrivere.

## M2 — Sample `volcanic-backend-sample` *(opzionale ma consigliato)*

- [ ] **SMP-1** Attivare `admin:{manifest}` + qualche hint `config` → smoke del generatore su un secondo dominio
      (evita over-fitting su Dionisi).

## M3 — Admin `@volcanicminds/admin` (engine/ui + libreria)

- [x] **ADM-1** FATTO: `types/manifest.ts` riscritto v2 (`CapabilitySpec` unificato); `ResourceModel` espone
      `hasAction`/`roles`/`actions`; migrati `interpreter`, `accessControl`, `ListView`, `ShowView`; mock
      `manifest.ts` + `manifestUnchanged.ts` riscritti a v2 (subagent sonnet). Guardia runtime `version===2`
      (validazione Ajv piena = build script). **type-check + lint + build verdi.** Pulizia: rimosso
      `manifestUnchanged.ts` (scratch morto, non importato); aggiunti plugin eslint `react`/`react-hooks` alla
      flat-config (risolti i 2 errori "rule not found" pre-esistenti) → `npm run lint` ora 0 errori/0 warning.
- [x] **ADM-2** FATTO: CLI **`scripts/pull-manifest.mjs`** (`bin: volcanic-admin-pull`, npm `pull:manifest`) —
      fetch `GET <url>/admin/manifest` o `--from <file>`, **valida Ajv** vs `manifest.v2.schema.json`, scrive
      `manifest.generated.ts` (sempre, header AUTO-GENERATED) e scaffolda `manifest.overrides.ts` **solo se assente**.
      Schema + scripts aggiunti ai `files` del package. Smoke: re-run rigenera generated e **preserva overrides** ✅.
- [x] **ADM-3** FATTO: **`engine/merge.ts`** — `mergeManifest(generated, overrides)` + `ManifestOverrides`/`ResourceOverride`/
      `FieldOverride`/`CapabilityOverride` (merge per identità `(resource,field)`/capability-name; patch/add/exclude;
      `deepMerge`). Cablato nel `ManifestProvider` (+ prop `manifestOverrides` su `<VolcanicAdmin>`), applicato sia al
      manifest preloaded sia al fetch. Demo `mock/overrides.ts`. **Smoke verde**: override `tag.list.visible=false` →
      colonna "Tag" sparita dalla lista veicoli. type-check + lint + build verdi.
- [ ] **ADM-4** **Zero-config rendering dal manifest generato** (i generator esistono già: pilotarli dal generated):
      sidebar da `resources`+`groups`, lista table/card, dettaglio layout standard, **sezioni operation** top-level.
- [~] **ADM-5** **Rendering azioni manifest FATTO** (capability↔endpoint, il pezzo chiave): `engine/actions.ts`
      (`interpolatePath`/`matchVisibleWhen`/`actionsByTarget`); `ui/actions/` (`useCapabilityRunner` via `dataProvider.custom`
      + toast + invalidate + download CSV; `ActionButtons` con override registry `action` + confirm). Cablato in
      ListView (collection), ListTable/ListCards (row, `visibleWhen`), ShowView. Mock `custom` (status/export).
      **Smoke verde**: archivia BMW X3 → stato cambia + Pubblica riappare; Download CSV esporta il file. 0 errori.
      Resta del registry esteso (separato): widget/view già esistenti, sidebar exclude/add, ~~logo~~ (FATTO, vedi sotto),
      theming (già via prop `theme`), dashboard, shortcut, `titleField` template i18n, **relation kind/foreignKey** override.
- [x] **ADM-5b (branding/logo)** FATTO: prima il logo + nome app erano hardcoded ("V" + "Volcanic Admin" in
      `ui/layout/Sidebar.tsx`). Aggiunto prop **`branding?: AdminBranding`** (`{appName, logo, logoCollapsed}`) su
      `<VolcanicAdmin>` **e** su `AdminPlugin` (compone come `theme`, prop diretta vince), propagato via
      `AdminConfigProvider`/`useAdminConfig` e consumato in `Sidebar` (logo esteso/collapsed con fallback al badge
      iniziale del nome). Tipo esportato dall'API pubblica; documentato in `CONSUMING.md` (§3.3 + tabella prop).
      type-check + lint + build verdi.
- [x] **ADM-6** FATTO: `docs/CONSUMING.md` riscritto col flusso **build-time pull (generated + overrides)** in testa
      (§1.1 `volcanic-admin-pull` + `manifest`/`manifestOverrides`; §1.2 runtime-fetch come variante), tabella prop
      aggiornata (`apiBasePath`, `manifestOverrides`, nota `manifest` vs `overrides`), corretta la nota roadmap stale
      sulle azioni (ora renderizzate, ADM-5). `examples/client-starter` e `client-advanced`: aggiunto
      `manifest.overrides.ts` (strato client-owned), script `pull:manifest`, main.tsx con `manifestOverrides`, README
      al nuovo flusso. type-check + lint + build verdi.

## M4 — Dionisi backend `dionisi-group/backend`

> **Prerequisito FATTO**: `@volcanicminds/backend` **3.2.0 pubblicato su npm** (con la capability manifest BE-1..7);
> Dionisi aggiornato a `^3.2.0`. *(Lungo la strada: CI del framework era già rossa — rimosso `npm-upgrade` che rompeva
> publint, aggiunto `JWT_SECRET` di test a `test:core`; ora verde. publish manuale `npm publish` come la 3.1.0.)*
- [x] **DIO-BE-1** FATTO: `config.options.manifest.enabled = true` → `GET /admin/manifest` (generatore 3.2.0).
- [x] **DIO-BE-2** FATTO: hint nei `routes.ts` (group + `resource{name,titleField,subtitleField,globalSearch}`) per
      vehicle/brand/newsletter (catalog/crm) e company (settings); `globalSearch` **single-source** coi `SEARCH_FIELDS`
      dei controller; aggiunto `splitOmniSearch` a brand/newsletter (la search dichiarata ora funziona).
- [ ] **DIO-BE-3** **Dizionario i18n IT** — il manifest emette le chiavi (`res./field./enum./action./group.`); il
      dizionario è **consumato lato BO** → lo produco in **M5** (backoffice).
- [x] **DIO-BE-4** FATTO: `GET /admin/manifest` Dionisi generato e **valido contro `manifest.v2.schema.json` (Ajv)**;
      snapshot via `MANIFEST_DUMP`. Limiti generatore emersi (→ override BO M5): company singleton (list+put), native
      users/token/health, sezioni operation `/public`+`/auth`, enum inline, relazioni thin.
      ⚠️ *Follow-up framework*: `MANIFEST_DUMP_EXIT` non chiude la connessione DB → il processo non esce da solo.

## M5 — Dionisi backoffice `dionisi-group/backoffice`

- [x] **DIO-BO-1** FATTO: app Vite+React in `dionisi-group/backoffice` con `<VolcanicAdmin>`; dep `@volcanicminds/admin`
      via **`file:`** (app privata frontend, niente issue reflect-metadata); `manifest.generated.ts` **pullato dal BE
      Dionisi reale** (`volcanic-admin-pull`) + `manifest.overrides.ts`; main.tsx (apiUrl+manifest+overrides+i18n).
- [x] **DIO-BO-2** FATTO: `overrides.ts` Dionisi — exclude token/health; gruppi+icone (catalog/crm/settings);
      vehicle (brand thin→relation+reference-select, hide brandId, gallery-reorder, status→**publish/archive** row+bulk
      con payload/visibleWhen, sezioni form); **company singleton** (read/update); user=Operatori; brand logo image-single.
      type-check **type-corretto contro i tipi reali del manifest** + build verdi.
- [x] **DIO-BO-3** i18n IT (`src/i18n.ts`) + **smoke E2E live FATTO**: seed Dionisi (`seed.ts`: admin + brand/veicoli
      + azienda) → BE pglite + BO → **login** → lista veicoli con **dati reali**, **publish/archive** con `visibleWhen`
      (Bozza: Pubblica+Archivia; Pubblicato: solo Archivia), sidebar a gruppi, **enum IT**, company singleton (vista edit).
      **Fix engine emersi**: prop **`apiBasePath`** (= '' per rotte reali) + **niente `x-tenant-id` in single-tenant**
      (`5a9cbdc`); **singleton data-load** su base path `GET/PUT /company` senza id (`c95c8dd`, via `meta.singleton`) →
      **company round-trip verificato** (load + edit + Save → PUT persiste).
      ✅ **Miglioramenti framework `3.2.1` (pubblicato)**: il generatore raccoglie il body del **PUT sul base path**
      (singleton update) → **campi singleton writable nativamente** (workaround `readOnly:false` **rimosso** dal BO,
      commit `3613fbf`); **`MANIFEST_DUMP_EXIT` chiude la connessione DB** → il processo esce da solo (~2s). Verificato
      E2E: company editabile **senza override**, dati persistiti.
      ✅ **Cosmetico FATTO (smoke live)**: dizionario IT completo (23 campi `company` + sezioni form); **branding Dionisi**
      (logo wordmark + tema rosso `#ED1C24` via prop `branding`+`theme`, engine ADM-5b); raggruppamento form `company`
      in sezioni; **fix risorsa `users`**: il generatore la nomina `users` (plurale, dal path, niente `resource.name`
      hint sull'API nativa) → realineate le chiavi override/i18n a `users` (prima la sidebar mostrava "Plural" non
      tradotto, ora "Operatori" sotto Impostazioni). ⚠️ *Follow-up framework opzionale*: dare alle API native
      (`users`/`tenants`/`token`/`health`) un `resource.name` hint per nomi singolari + chiavi label coerenti, così i
      consumer non devono rimappare `res.users.*`.

## Trasversale

- [~] **E2E-1** Validazione fine-a-fine Dionisi **FATTA** (vehicles): BE 3.2.0 genera → BO pulla → override merge →
      pannello live con dati reali + azioni + i18n. Misura "gratis vs override": liste/form/enum/relazioni/azioni **gratis**
      dal generato+merge; override = gruppi/icone, publish-vs-archive split, gallery, singleton, exclude native. Resta:
      smoke su company singleton (post-fix data-load) + theming.
      applicati. Misura **quanto del mock è "gratis" vs override**.

---

## Catena critica e primo passo

`M0 → BE-1 → BE-3 → BE-5 → (ADM-1/2/3, DIO-BE) → M5`.
**Primo passo eseguibile**: `BE-1` (esporre `global.routes`), costo quasi nullo.

## Decisioni ancora aperte *(non bloccano la stesura del design)*

- [ ] one-vs-two mapping files → proposta: **two** (generated/overrides).
- [ ] drift detection via **hash/version** del manifest (avviso "stale" a runtime) → rimandato.
- [ ] `autoCrud` (CRUD generico auto-montato `/admin/<path>`) → **escluso ora**, eventuale capability futura.
- [ ] `i18n` defaultLocale/locales: admin o config progetto? (probabile admin/progetto).
- [ ] `tenancy.switchable`: derivato da `mode` (BE) o override admin?
- [ ] `relation.kind`/`foreignKey`: confermato **non** generato (schema-only) → solo via overrides. Riconsiderare se in
      futuro si accetta una sorgente entity-metadata opzionale.
