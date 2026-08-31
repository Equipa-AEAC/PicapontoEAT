# UI Guidelines

## Theme

Light is the default. Dark is the application's original palette, kept intact and
moved behind a `data-theme="dark"` attribute on `<html>`.

Both themes are driven by the same semantic tokens in `src/styles/tokens.css`.
A component that only uses tokens is automatically correct in both — never write a
`[data-theme]` selector inside a component, and never hardcode a colour.

The theme is owned by `useThemeStore` (`src/stores/theme.ts`), resolved before the
app mounts so the first paint is already correct. `ApplicationSettings.theme` sets
the institutional default; the topbar switch is a personal override stored in
`localStorage` under `picaponto.theme`.

## Tokens

Everything comes from `src/styles/tokens.css`:

- **Colour** — `--background`, `--surface`, `--surface-elevated`, `--foreground`,
  `--foreground-secondary`, `--foreground-muted`, `--border`, `--border-strong`,
  `--primary`, `--secondary`, `--success`, `--warning`, `--danger`, `--info`,
  `--sidebar*`, `--input*`, `--hover`, `--active`, `--selected`, `--focus-ring`.
- **Spacing** — `--space-1` … `--space-10` on a 4px grid. No literal pixel padding.
- **Radius** — `--radius-xs` (3px) … `--radius-xl` (10px), `--radius-pill`.
- **Type** — `--text-2xs` … `--text-3xl`, `--weight-*`, `--leading-*`, `--tracking-*`.

Chart.js paints to a canvas and cannot read CSS variables, so charts take their
colours from `useChartTheme()` (`src/composables/useChartTheme.ts`), which reads the
resolved tokens back off the document and re-evaluates on a theme switch.

## Typography

IBM Plex Sans Variable, bundled via `@fontsource-variable/ibm-plex-sans` — self-hosted,
never a CDN, because the desktop build has to render correctly offline.

Hierarchy comes from **weight, colour and spacing**, not size: a page title is only
~1.5× body text. Use the named roles in `src/styles/base.css` rather than raw sizes:
`.type-page-title`, `.type-section-title`, `.type-card-title`, `.type-body`,
`.type-label`, `.type-eyebrow`, `.type-nav`, `.type-table`, `.type-meta`,
`.type-status`, `.type-metric`, `.type-numeric`.

Uppercase is reserved for `.type-eyebrow` — non-clickable group headers only.
Anything numeric that lines up in a column gets `font-variant-numeric: tabular-nums`.

## Surfaces

Separation comes from **borders and background steps**, not shadows. Shadows are only
for things that genuinely float: dialogs, menus, popovers.

No gradients on structural surfaces. No zebra striping in tables — the row rule
already does that job.

## Layout

Desktop first, responsive after. The shell is a fixed sidebar plus a sticky topbar;
only the main region scrolls.

- One title per page — the page header owns it. The topbar shows *where you are*,
  never a second copy of the page title.
- One label per selectable item. Sidebar entries carry a label only.
- Content lives in cards. Pages never render bare text on the background.
- Primary navigation sits at the root of the sidebar; a sub-area (Project management)
  renders as a titled group with indented children.

## Icons

Phosphor (`@phosphor-icons/vue`), `weight="regular"` for navigation and controls,
`weight="fill"` only for status markers that must read at a glance.

## Interaction

- Every interactive element gets the global `:focus-visible` ring — do not remove it.
- Prefer inline controls over dialogs for single-field changes (a task's status is a
  select in the row, not a form).
- Empty, loading and error states are required on every page that loads data.

## Honest interfaces

These are the rules the second-pass audit added. They are about truthfulness, not
taste, so they carry more weight than anything above.

- **A badge states a computed fact or it does not exist.** `trendLabel` on
  `BaseMetricCard` / `BaseDataCard` is optional for this reason. A hardcoded
  "Healthy" that renders next to a count of zero, or "+12% vs last week" with no
  week-over-week series behind it, is a lie the interface tells every reader.
- **No statistic exists to fill a slot.** A metric card whose value is "how many
  rows you have selected" is decoration. Cut it.
- **User-facing copy never mentions the implementation.** No "mock dataset", no
  "will map to a REST endpoint later". An empty state describes the reader's
  situation and what to do about it.
- **A control either acts or it is not there.** A button with no handler is worse
  than a missing feature, because it costs the reader a click to discover the
  absence. If the real path is out-of-app (password resets go through the
  coordination team), say so plainly instead.
- **A count leads to its rows.** `BaseStatsCard` takes `interactive` + `@action`
  for this: if a number is worth showing, the reader should be able to reach what
  it counts.

## Filters

Every list page follows the same contract. It is worth stating because three
pages each had their own before, and a reader who learned one had to relearn the
next.

- **Filters apply as you change them. There is no Apply step.** Selects reload
  immediately; free text and date inputs are debounced 250 ms, because a
  `type="date"` field emits a value on every keystroke of the year and would
  otherwise fire a request for `0002-01-01` on the way to `2026`.
- **The filter state lives in the store, not in a local copy on the page.** A
  page-local mirror only stays correct until the two drift — which is how a
  Reset button came to clear the visible selects while leaving the store's
  filters in place, so the list stayed narrowed while the controls said "All".
- **One `Clear filters` button**, `:disabled="!hasActiveFilters"`. Not "Reset",
  not "Apply filters".
- **Wrap the strip in `BaseFilterPanel`** with the description
  `"Filters apply as you type — no Apply step."`
- **Filtering belongs to the service**, not to a second `computed` that
  re-filters the rows the service already filtered.
- **Dropdown options come from an unfiltered collection.** Building them from the
  filtered result means selecting `device` leaves `device` as the only option and
  no way back. `membersStore.allMembers` and `auditStore.allEntries` exist for
  this.
- **An empty result distinguishes the two reasons it can be empty**: no match for
  the current filters (offer `Clear filters` as the empty state's action), or
  nothing recorded yet (say that instead, and offer nothing).
- **A metric card above a filtered table describes the filtered view**, and its
  caption says so — "in the current view". A card that claims a fleet-wide number
  while the filter has already excluded most of the fleet is simply wrong.

## Formatting

- Never interpolate a stored value straight into a template. Dates go through
  `formatIsoDate` (a `YYYY-MM-DD` day) or `formatTimestamp` (anything with a
  time); statuses go through `BaseStatusPill` / `BaseBadge`, which run
  `toDisplayLabel` so a raw enum member (`submitted`) reads as "Submitted"
  without disturbing a label an author already wrote ("In review").
- `.status-pill` hugs its content. It sets `align-self: flex-start` because most
  of its parents are flex columns and would otherwise stretch it to full width.
