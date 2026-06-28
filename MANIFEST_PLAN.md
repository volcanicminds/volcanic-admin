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
- [ ] **BE-2** Estendere `RouteConfig` (`types/global.d.ts:40`) con gli hint M0-4 e **far passare il `config` file-level +
      per-route fin dentro l'oggetto route esposto** (oggi `defaultConfig` in `router.ts:217` è usato solo per
      `controller`/`tenantContext` e NON è preservato in `ConfiguredRoute`). Additivo, opzionale, zero-breaking.
- [ ] **BE-3** **Manifest generator** core (schema-only): compone da `global.routes` + `server.getSchemas()`; **risolve i
      `$ref`** del `doc.body`/`doc.response`; mappa schema→resource via l'hint `resource.name` (M0-4); collassa le
      proiezioni su `(resource,field)`; emette `resources[]` (CRUD→`capabilities`) e `capabilities[]` top-level per gli
      endpoint non-resource. `relation` magra (no kind/fk). Niente accesso al data layer.
- [ ] **BE-4** **Sensitive policy graduata** (decisione #11): `password` write-only; `token`/`mfaSecret`/`externalId`
      esclusi sempre; blacklist estensibile via config.
- [ ] **BE-5** Endpoint `GET /admin/manifest` (full, `roles` dichiarati) dietro `admin:{manifest:true}` nel `start()`.
- [ ] **BE-6** **Dump/snapshot**: comando per emettere `manifest.json` su file (build CI admin disaccoppiato dal BE live).
- [ ] **BE-7** **Test BE core su tutte le parti del manifest** (suite in-memory, stile framework) + `llms.txt`/docs
      (capability, hint config, `autoCrud` esplicitamente *non* implementato). Copertura per pezzo:
  - [ ] **BE-1** `global.routes` popolato dopo `apply()`: shape `ConfiguredRoute[]`, solo rotte enabled, path/method/roles corretti.
  - [ ] **BE-2** hint `config` (file-level + per-route) presenti nell'oggetto route esposto (group, resource.*).
  - [ ] **BE-3** generatore: fixture route+schema → manifest atteso; `$ref` collassati su `(resource,field)`,
        classificazione resource vs operation, `relation` magra, derivazione `capabilities` (CRUD+action) e `roles`.
  - [ ] **BE-4** sensitive policy: `password` write-only (in create/update, fuori da read/list); `token`/`mfaSecret`/`externalId` mai presenti.
  - [ ] **BE-5** `GET /admin/manifest`: gating roles, manifest full, **validazione del manifest emesso contro
        `manifest.v2.schema.json` (Ajv)** — contratto eseguibile in CI.
  - [ ] **BE-6** dump/snapshot: il file `manifest.json` emesso è valido e identico al runtime.

## M2 — Sample `volcanic-backend-sample` *(opzionale ma consigliato)*

- [ ] **SMP-1** Attivare `admin:{manifest}` + qualche hint `config` → smoke del generatore su un secondo dominio
      (evita over-fitting su Dionisi).

## M3 — Admin `@volcanicminds/admin` (engine/ui + libreria)

- [ ] **ADM-1** **Migrazione tipo v1→v2**: riscrivere `src/engine/types/manifest.ts` (`CapabilitySpec`, `capabilities[]`),
      e i consumer: `interpreter.ts:59-62`, `providers/accessControl.ts:41`, `ui/generators/ListView.tsx:98-100/150`,
      `ui/generators/ShowView.tsx`, più `src/mock/manifest.ts` + `manifestUnchanged.ts`. + validazione runtime (JSON Schema M0-3).
- [ ] **ADM-2** **Fetch build-time + snapshot**: DEV = fetch all'avvio, BUILD = legge snapshot; genera `manifest.generated.ts`.
- [ ] **ADM-3** **Split generated/overrides + merge** per identità `(resource,field)`; scaffold `manifest.overrides.ts`
      vuoto alla prima generazione.
- [ ] **ADM-4** **Zero-config rendering dal manifest generato** (i generator esistono già: pilotarli dal generated):
      sidebar da `resources`+`groups`, lista table/card, dettaglio layout standard, **sezioni operation** top-level.
- [ ] **ADM-5** **Override registry esteso**: widget custom, escludi/aggiungi voci sidebar, logo, dizionari, theming,
      dashboard, capability↔endpoint, shortcut, `titleField` template i18n, **relation kind/foreignKey** (colma il limite schema-only).
- [ ] **ADM-6** Aggiornare `examples/client-starter` (+ `client-advanced`) e `docs/CONSUMING.md`: manifest "creato in
      automatico (generated + overrides), personalizzabile".

## M4 — Dionisi backend `dionisi-group/backend`

- [ ] **DIO-BE-1** Attivare `admin:{manifest:true}` nel wiring.
- [ ] **DIO-BE-2** Aggiungere gli **hint `config`** ai `routes.ts` (group, resource.name/titleField/subtitleField, globalSearch);
      far leggere al controller `globalSearch` dalla config (singola fonte, elimina la duplicazione con `omniSearch.ts`).
- [ ] **DIO-BE-3** **Dizionario i18n IT** (chiavi `res./field./enum./action./group.`).
- [ ] **DIO-BE-4** Verifica `GET /admin/manifest` Dionisi + snapshot.

## M5 — Dionisi backoffice `dionisi-group/backoffice`

- [ ] **DIO-BO-1** Scaffold istanza `<VolcanicAdmin>` che consuma il manifest Dionisi (generated + overrides).
- [ ] **DIO-BO-2** `overrides.ts` Dionisi: gruppi/icone/ordini, widget (gallery-reorder, rich-text, image-single),
      layouts, payload capability publish/archive, export CSV, singleton company, link/dashboard, relation kind/fk.
- [ ] **DIO-BO-3** Theming + logo + dizionari; build con snapshot; **smoke E2E** del pannello reale.

## Trasversale

- [ ] **E2E-1** Validazione fine-a-fine Dionisi: BE genera → admin builda → pannello usabile zero-config → override
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
