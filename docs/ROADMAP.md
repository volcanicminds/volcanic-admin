# Roadmap

Candidate **engine-level** enhancements for `@volcanicminds/admin`, unordered and
non-binding. Nothing here is a commitment; it captures ideas worth doing. Items that only
concern a single consuming project do not belong here — this file is about the framework.
Done items are removed rather than checked off (git history is the record).

## UI / UX

- **Compact user identity in the topbar** — show `firstName` + abbreviated last name
  (e.g. `Mario R.`) instead of the full name.
- **Per-list count chip in the sidebar** — a badge with the total number of records next to
  each resource, refreshed when its list opens (only if cheap/fast).
- **Always-edit detail mode** — an opt-in where a resource has no separate read-only `show`
  view: `…/edit/:id` is the only detail screen.
- **Per-field help tooltip** — an info icon next to a field/label that reveals the field's
  explanation on click/hover, complementing the current inline `help` text.
- **Mobile-responsive sidebar**: collapse to a hamburger drawer on small viewports.
- **Complete default dictionaries and translated screens**: `action.save`, `form.saveError` and
  `validation.required` are used by `AutoForm.tsx` and `inputs.tsx` but missing from the `en`
  and `it` defaults, so every consumer adds them. The account, forgot-password and
  reset-password views and the fallback toasts of a failed action are English literals, and
  a field with no widget shows an English message meant for developers.

## Data / features

- **Saveable column filters** — column-level filtering with named presets persisted in
  `localStorage`, so frequently used filter sets are one click away.
- **Dashboard widgets** — built-in chart/stat widgets to compose landing dashboards from the
  manifest data (today dashboards are hand-built custom pages).
- **Activity / audit log**: optional generated tables for activity and change logs.
- **Bulk actions**: the manifest type and the docs declare the `bulk` target, but nothing
  renders it. There is no row selection in the table or the cards, `actionsByTarget` is only
  asked for `row` and `collection`, and `deleteMany` in the data provider is never called, so a
  capability declared for `bulk` is silently dropped. Wanted: row selection, a bar with the bulk
  capabilities, and bulk delete through `deleteMany`.
- **Hide the capabilities a widget already drives**: the upload and attachment routes an image
  widget calls also appear as row actions, and consumers exclude them by hand. A row action
  whose path has a parameter the record cannot fill (`:imageId`) is sent with the parameter left
  in the URL (`interpolatePath` in `src/engine/actions.ts`); it should not be offered.
- **Status transitions declared once**: publish and archive style actions repeat method, path,
  roles and the status enum on every resource that has them. A block naming the field and its
  transitions would generate the row and bulk actions with their `visibleWhen`; the
  `status-workflow` component imagined in `docs/ARCHITECTURE.md` was never built.
- **File widget**: the `file` type falls to a placeholder (`src/ui/widgets/inputs.tsx`). Wanted:
  upload, a list with name, type and download link, and a read-only fallback for media the
  browser cannot preview (HEIC, for example).
