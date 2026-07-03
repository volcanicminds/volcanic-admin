# Manifest — Overview (for everyone)

> A simple introduction to the manifest-driven backoffice of the Volcanic Minds ecosystem. Written for newcomers,
> even **non-technical** ones. For the contract and the implementation details see `MANIFEST_DESIGN.md`; for the work
> plan see `MANIFEST_PLAN.md`.

## The idea in one sentence

The backend **compiles a "descriptive sheet"** of everything that can be administered (the **manifest**), and the
admin panel **builds itself** by reading that sheet. Nobody draws the screens by hand: the backend *describes*,
the admin *builds*.

> **Analogy (IKEA furniture).** The backend is the manufacturer: inside the box it puts the **assembly sheet** (the
> manifest). The admin is the assembler: it reads the sheet and puts the furniture together (the screens) on its own.
> In the end, you only add the personal touches — the color, the handles, a special drawer (the customizations).

## Who does what

| Actor | What it does | Does it write it by hand? |
|---|---|---|
| **BE core** (the framework) | Knows how to *read* the project's routes and schemas and *transform* them automatically into the manifest. It also provides the standard things (users, login). | No: it generates the manifest |
| **BE custom** (your project, e.g. Dionisi) | Declares the **real data** (vehicles, brands…), the **endpoints** and the **validation schemas**. It adds small **hints** (which group it belongs to, which is the "title" field, which fields it searches on). | It writes the data/endpoints, **not** the manifest |
| **The manifest** | The "descriptive sheet" (a file) produced automatically: it lists every resource, its fields, the types, the possible operations and **who** can perform them. | It is generated, not written |
| **Admin** (the panel engine) | Reads the manifest and **builds by itself** lists, detail views, filters, buttons. | No: it generates the screens |
| **Admin custom** (your instance, e.g. the Dionisi backoffice) | Adds the **presentation touches**: logo, colors, a special widget (e.g. a draggable photo gallery). | It writes only the customizations |

## The path, step by step

```
   YOUR PROJECT (BE custom)                 THE FRAMEWORK (BE core)
   ┌───────────────────────────┐           ┌──────────────────────┐
   │ declares: vehicles, brands,│  reads →  │  GENERATES the manif.│
   │ endpoints, schemas, + hints│           │  (the descript. sheet)│
   └───────────────────────────┘           └──────────┬───────────┘
                                                       │ delivers the manifest
                                                       ▼
   THE PANEL (Admin)                         ┌──────────────────────┐
   ┌───────────────────────────┐  reads →   │   MANIFEST (file)     │
   │ BUILDS by itself:         │ ◀──────────│  vehicle: fields,     │
   │ menu, lists, detail views,│            │  operations, roles…   │
   │ filters, buttons          │            └──────────────────────┘
   └─────────────┬─────────────┘
                 │ + your touches
                 ▼
   ┌───────────────────────────┐
   │ logo, colors, special      │  ← the CUSTOMIZATIONS (admin custom)
   │ widgets (photo gallery…)   │
   └───────────────────────────┘
```

1. **You (the project) declare the data** and the endpoints (e.g. "the *vehicle* exists, with name, price, brand; it
   can be created, edited, published").
2. **The framework reads and generates the manifest** automatically — it does not rummage through the database, it
   relies only on what you have publicly declared (routes + schemas). It adds your small hints (group, title field, search fields).
3. **The admin receives the manifest** (live in development, or from a "snapshot" saved when the build is made).
4. **The admin builds the panel by itself**: left-hand menu, vehicle list with filters, edit view with the right
   fields, "Publish" button.
5. **You add the final touches**: the logo, the colors, the draggable image gallery. Only this is written by hand.

## The detail that avoids messes

The panel keeps **two separate sheets**:

- one **written by the machine** (the copy of the manifest) → **never touched**, rewritten on every update;
- one **yours, personal** (the customizations) → the machine never touches it.

That way, if tomorrow you add a field to the vehicle, the first sheet updates itself and your customizations stay
intact. Nothing steps on anyone's toes.

## In one line

**The project declares → the framework describes (manifest) → the admin builds → you refine.** The manifest is the
"bridge": the single source of truth that keeps backend and panel always aligned, without redrawing anything by hand.
