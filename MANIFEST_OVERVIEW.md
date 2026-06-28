# Manifest — Panoramica (per tutti)

> Introduzione semplice al backoffice manifest-driven dell'ecosistema Volcanic Minds. Pensata per chi arriva nuovo,
> anche **non tecnico**. Per il contratto e i dettagli implementativi vedi `MANIFEST_DESIGN.md`; per il piano di
> lavoro `MANIFEST_PLAN.md`.

## L'idea in una frase

Il backend **compila una "scheda descrittiva"** di tutto ciò che si può amministrare (il **manifest**), e il pannello
admin **si costruisce da solo** leggendo quella scheda. Nessuno disegna le schermate a mano: il backend *descrive*,
l'admin *costruisce*.

> **Analogia (mobile IKEA).** Il backend è il produttore: dentro la scatola mette il **foglio di montaggio** (il
> manifest). L'admin è chi monta: legge il foglio e tira su il mobile (le schermate) da solo. Tu, alla fine, aggiungi
> solo i tocchi personali — il colore, le maniglie, un cassetto speciale (le personalizzazioni).

## Chi fa cosa

| Attore | Cosa fa | Lo scrive a mano? |
|---|---|---|
| **BE core** (il framework) | Sa *leggere* le rotte e gli schemi del progetto e *trasformarli* automaticamente nel manifest. Fornisce anche le cose standard (utenti, login). | No: genera lui il manifest |
| **BE custom** (il tuo progetto, es. Dionisi) | Dichiara i **dati veri** (veicoli, brand…), gli **endpoint** e gli **schemi di validazione**. Aggiunge piccoli **suggerimenti** (in che gruppo sta, qual è il campo "titolo", su quali campi cerca). | Scrive i dati/endpoint, **non** il manifest |
| **Il manifest** | La "scheda descrittiva" (un file) prodotta in automatico: elenca ogni risorsa, i suoi campi, i tipi, le operazioni possibili e **chi** può farle. | È generato, non scritto |
| **Admin** (il motore del pannello) | Legge il manifest e **costruisce da solo** liste, schede, filtri, pulsanti. | No: genera le schermate |
| **Admin custom** (la tua istanza, es. backoffice Dionisi) | Aggiunge i **tocchi di presentazione**: logo, colori, un widget speciale (es. galleria foto trascinabile). | Scrive solo le personalizzazioni |

## Il percorso, passo per passo

```
   IL TUO PROGETTO (BE custom)              IL FRAMEWORK (BE core)
   ┌───────────────────────────┐           ┌──────────────────────┐
   │ dichiara: veicoli, brand, │  legge →  │  GENERA il manifest  │
   │ endpoint, schemi, + hint  │           │  (la scheda descritt.)│
   └───────────────────────────┘           └──────────┬───────────┘
                                                       │ consegna il manifest
                                                       ▼
   IL PANNELLO (Admin)                       ┌──────────────────────┐
   ┌───────────────────────────┐  legge →   │   MANIFEST (file)     │
   │ COSTRUISCE da solo:       │ ◀──────────│  veicolo: campi,      │
   │ menu, liste, schede,      │            │  operazioni, ruoli…   │
   │ filtri, pulsanti          │            └──────────────────────┘
   └─────────────┬─────────────┘
                 │ + i tuoi tocchi
                 ▼
   ┌───────────────────────────┐
   │ logo, colori, widget       │  ← le PERSONALIZZAZIONI (admin custom)
   │ speciali (galleria foto…)  │
   └───────────────────────────┘
```

1. **Tu (progetto) dichiari i dati** e gli endpoint (es. "esiste il *veicolo*, con nome, prezzo, marca; lo si può
   creare, modificare, pubblicare").
2. **Il framework legge e genera il manifest** automaticamente — non rovista nel database, si basa solo su ciò che hai
   dichiarato pubblicamente (rotte + schemi). Aggiunge i tuoi piccoli suggerimenti (gruppo, campo titolo, campi di ricerca).
3. **L'admin riceve il manifest** (dal vivo in sviluppo, oppure da una "fotografia" salvata quando si fa la build).
4. **L'admin costruisce il pannello da solo**: menù a sinistra, lista veicoli con filtri, scheda di modifica con i campi
   giusti, pulsante "Pubblica".
5. **Tu aggiungi i tocchi finali**: il logo, i colori, la galleria immagini trascinabile. Solo questo è scritto a mano.

## Il dettaglio che evita pasticci

Il pannello tiene **due fogli separati**:

- uno **scritto dalla macchina** (la copia del manifest) → **non si tocca mai**, viene riscritto a ogni aggiornamento;
- uno **tuo, personale** (le personalizzazioni) → la macchina non lo tocca mai.

Così, se domani aggiungi un campo al veicolo, il primo foglio si aggiorna da solo e le tue personalizzazioni restano
intatte. Niente si pesta i piedi.

## In una riga

**Il progetto dichiara → il framework descrive (manifest) → l'admin costruisce → tu rifinisci.** Il manifest è il
"ponte": l'unico punto di verità che tiene backend e pannello sempre allineati, senza ridisegnare niente a mano.
