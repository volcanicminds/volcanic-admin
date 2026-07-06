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
- **Sticky list header** — keep the list toolbar (search / filters / action bar) pinned while
  the rows scroll, mirroring the sticky toolbar the create/edit/show views already have.
- **Per-field help tooltip** — an info icon next to a field/label that reveals the field's
  explanation on click/hover, complementing the current inline `help` text.
- **Mobile-responsive sidebar** — collapse to a hamburger drawer on small viewports.

## Data / features

- **Saveable column filters** — column-level filtering with named presets persisted in
  `localStorage`, so frequently used filter sets are one click away.
- **Dashboard widgets** — built-in chart/stat widgets to compose landing dashboards from the
  manifest data (today dashboards are hand-built custom pages).
- **Activity / audit log** — optional generated tables for activity and change logs.
