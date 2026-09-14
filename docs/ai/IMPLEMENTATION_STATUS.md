# Frontend Progress

## Authentication
✅ Completed

## Student Workspace
✅ Completed
- Dashboard
- Attendance
- Worked Hours
- Calendar
- Internship
- Daily Report
- Internship Reports (monthly + final)
- Certificates
- Profile
- Settings
- Announcements (audience-filtered, reads admin announcements)

## Administrator Workspace
✅ Completed
- Dashboard
- Members (full Equipa Técnica roster with volunteer team hours, card assignment, photo upload)
- Cards (RFID inventory: register, assign, deactivate, replace — independent of a member record)
- Attendance (log, drill-down, corrections)
- Internships (FCT only; also lists team members eligible to be assigned one)
- Announcements
- Devices (fleet monitoring, add/edit modal, restart/remove confirmation, firmware channel)
- Certificates (surplus-hours and FCT tracks side by side; PDF template upload per track,
  generation from the stored template, and per-member signed-copy attachment)
- Reports (work-journal activity feed, per-member coverage, per-project rollup, and the
  team-hours/FCT exports)
- Users (accounts and permission tiers — distinct from Members, which owns identity)
- Audit
- Settings (Account & security, Notifications, Work hours, System)

## Participation model
✅ Modelled

Equipa Técnica is a **school-founded IT club that runs entirely inside the school**. The model
follows from that:

- **Every member is a volunteer team member.** They help around, get projects assigned, and
  accumulate `teamHours` from registered attendance. Those hours earn the *surplus-hours
  certificate*.
- **Some members additionally carry out their FCT internship** inside the club. That creates a
  separate internship record with its own `completedHours`, which earn the *FCT certificate*.
- **The two hour buckets are never mixed** — they count towards two different things. Updating
  internship progress does not touch team hours, and vice versa.
- **Internships are always *hosted* at the school.** There is no internal/external placement
  site; the host entity comes from `INTERNSHIP_HOST_ENTITY` and is not user-editable.
- **Interns may be enrolled at a different school.** The host is always us, but the intern is
  not always ours. `MemberSummary.originSchool` records where they are enrolled and
  `isExternal` is derived from it. For an external intern the academic fields (course, class,
  academic year) belong to their own school and are optional here, and their *orientador de
  estágio* is a teacher there.
- **Two named internship roles, no "supervisor".** The regulated document set names the
  *orientador de estágio* (teacher at the intern's school, `InternshipSummary.orientador`) and
  the *monitor de estágio* (the Equipa Técnica person supervising day to day,
  `InternshipSummary.monitor`). The old single `supervisor` field modelled neither and is gone.
- **Members owns the person, Internships owns the internship.** Everyone on the roster is a
  member first — that is the identity a card, attendance and team hours hang off. The FCT
  record lives separately and is only ever edited from the Internships page; the Members page
  reaches it through the shared `components/internships/InternshipFormDialog.vue`, offered as a
  one-question handoff right after a member is created.
- Reporting reflects the split: a `team-hours` report for volunteer time and an `internship`
  report for FCT time.

**Classification authority, audited and confirmed.** `src/utils/participation.ts`'s
`summariseParticipation` is the *only* place attendance is sorted into Team /
Internship / Unclassified — every caller (`members.service.ts`,
`internships.service.ts`, `portal.service.ts`, `certificates.service.ts`,
`reports.service.ts`) goes through `computeParticipationHours`, and no hour
total is stored anywhere. Verified directly, not just read:

- **The critical case holds.** A historical attendance record corrected today
  keeps counting under whichever participation period covered its *original*
  `date` — correction never touches `date`, and classification keys off it, not
  off today or off whichever period is currently open. Reproduced live: an
  admin correction to a June 2026 record (during a closed Team period) changed
  only the Team total; the later Internship total was untouched to the decimal.
- Pending, rejected and withdrawn correction requests never touch the
  attendance row — verified the totals are bit-for-bit identical before and
  after a rejection.
- A report's date range narrows which attendance rows are *summed*; it never
  changes which period a day is classified under — verified a July-only query
  still splits July across the Team period (ending July 14) and the Internship
  period (starting July 15) rather than collapsing them.
- Period overlap validation correctly allows a same-day-adjacent transition
  (Team ends July 14, Internship starts July 15) and correctly rejects two
  periods that would both claim the same calendar day.

**One real defect found and fixed**, in the admin's *direct* record edit (not
the correction-request flow, which was already correct): `applyAttendanceCorrection`
rewrote `entry`/`exit` but left the stored `hours` at its old value and accepted
any time pair, including exit before entry. A corrected record could show times
that did not match its own hour total, and that stale number is what every
downstream total sums. Fixed to validate `exit > entry` and recompute `hours`
via a `hoursBetween` helper shared with the correction-request path (moved to
`src/utils/date.ts` so the two write paths cannot compute the same arithmetic
two different ways). See `docs/ai/BACKEND_CONTRACTS.md` § *Attendance correction
requests* for the endpoint contract this implies.

## Work journal
✅ Modelled

Daily entries (`DailyLogEntry`) are written by members themselves — optional but recommended.
For an intern they are the raw material the monthly and final FCT reports are assembled from;
for everyone they are the record of what the club actually did. Entries can be tagged with an
optional `projectId`, which gives the admin Reports page a per-project rollup and is the seam a
fuller task board would grow from.

## UI Component Library
✅ Completed
- PrimeVue removed entirely (no `primevue`, `@primevue/themes`, or `primeicons` dependency)
- Native, dependency-free component set in `src/components/base/` (Button, Select, TextInput, Textarea, InputNumber, DatePicker, Checkbox, ToggleSwitch, Divider, Menu, Chart, Table/TableColumn, Dialog family, Avatar, Timeline, etc.)
- Shared via `src/shared/components/base` barrel; consumed identically by every admin and student page

## Shared UI
✅ Completed
- Base table, dialogs, headers, loading and empty states are shared across every page
- Legacy root `src/pages/*` compatibility pages have been folded directly into their `src/modules/**` counterparts — no more duplicate layout/data-loading indirection

## Route and Shell Layer
✅ Completed
- Role-based routing
- Login and workspace shells
- Profile and logout menus (native popover, no PrimeVue)
- Lazy-loaded route components

## Workspace UX review
✅ Completed — see `docs/PARTICIPATION_IMPLEMENTATION_STATUS.md`
§ *UX and Workflow Review* for the authoritative record.

Summary of what changed on top of the page list above:

- **Student** gained a **Project management** sidebar group (Projects + My tasks)
  with the same Kanban board the admin workspace uses — students move, create,
  edit and archive tasks, with a confirmation before removal — plus a calendar
  with a real selected-day workflow, shared events and deadlines that open the
  board, a rebuilt dashboard led by "Needs your attention", profile change
  requests, a restructured Internship Reports workflow (creation dialog →
  read-only generated preview → explicit Edit; drafts stay editable),
  request-driven Certificates gated on eligibility, per-notice "Mark as read" on
  Announcements, and Settings with alert preferences and sidebar ordering.
  **My Work was folded into My tasks** and its route redirects.
- **Admin** gained a Calendar, internship report review queues on Reports, an
  internship details modal, terminal-based card registration, a certificate
  request queue with per-school FCT profiles, publish-first Announcements with
  Published/Drafts/Archived tabs, a completed Add-device form with IP validation,
  project activity in the audit trail, and per-account permissions.
- **Day-of-week hour aggregation was removed everywhere.** `hoursByWeekday` is
  gone; charts group by week of month or by calendar week.

## Language support

✅ Completed — Portuguese and English, Portuguese default.

`vue-i18n` v11 (`legacy: false`, `globalInjection: true`). Messages live in
`src/i18n/locales/{en,pt}/`, split into eleven domain files that mirror each
other; `src/i18n/vocabulary.ts` owns every enum → label helper. The full rules,
the terminology decisions and the list of terms deliberately left untranslated
are in `docs/ai/FRONTEND.md` § *Language and translation*.

- Portuguese is the **default and reference** language. The browser's `Accept-
  Language` is deliberately not consulted: a lab machine imaged with an English
  Windows install is evidence about the machine, not about the reader.
- English is the second language **and** the fallback, so a missing Portuguese
  key renders an English string rather than a key path.
- The choice persists in `localStorage` under `picaponto.locale` and is applied
  before mount, so the first paint is already correct. `<html lang>` follows.
- Switching is live — no reload. This required two structural changes:
  - **Labels are functions, not constants.** A `Record<Status, string>` evaluates
    once at import and freezes the language.
  - **Stored and derived data carries keys, not text**: `DashboardMetric.labelKey`,
    `DashboardActivity.titleKey`, `ProjectActivityEvent.messageKey` +
    `messageParams`, `CertificateEligibility.reasonKey`. These are produced by a
    service and cached in a store, so a resolved string would be stuck in
    whichever language was active at fetch time.
- Dates, times and numbers format through `Intl` with the active locale
  (`src/utils/date.ts`).
- **Validation messages, store feedback banners and service errors are
  translated too**, not just the visible chrome. These were the last holdout,
  and each hid from a different scanner: a `return "…"` inside a validator, a
  ternary inside a `computed`, and prose sitting between the interpolations of a
  backtick template literal (`` `${name} (holds ${uid})` ``), which reads as an
  expression to every grep and as English to a reader.

**Not translated, on purpose.** Portuguese school and legal terms stay Portuguese
in the English interface (`FCT`, `Estágio`, `Relatório de Estágio`, `Orientador
de Estágio`, `Monitor de Estágio`, `Equipa Técnica`); operator vocabulary stays
English in the Portuguese interface (`RFID`, `UID`, `firmware`, `heartbeat`,
`OTA`, the firmware channels, `Kanban`, `Excel`, `CSV`, `PDF`). Recorded text —
audit-log descriptions, correction reasons, review notes, journal entries,
announcement bodies, project and task titles — is shown as written, in either
language, because rewriting a record misreports it.

## Project permissions

✅ Completed in the frontend — ⚠️ **no part of it is a security boundary.**

`src/types/projectPermissions.ts` states the model once: a member is an `owner`,
`coordinator`, `participant`, `assignee` or `none` on a given project, and the
rights follow from that. The table, and what the API has to enforce, are in
`docs/ai/BACKEND_CONTRACTS.md` § *Student project access*.

- **A student can no longer assign work to anybody else by default.** Only a
  project owner or a named task coordinator can. Everybody else gets an "assign
  this to me" checkbox where the participant picker would have been — the picker
  is **absent, not disabled**, because a disabled control still advertises a
  feature that is not theirs.
- `resolveAssigneeIds` **rewrites rather than rejects**: a member who may not
  assign others keeps the assignees already on a task and toggles only
  themselves, so ticking themselves onto a shared task cannot silently drop the
  two people already on it.
- Editing and removing are limited to a member's **own** tasks (assigned to them
  *or* created by them) unless they own or coordinate the project. Moving a card
  stays open to everyone on the project: a board only its owner can move is a
  status report, not a board.
- The store had a real hole, now closed: it called `updateTaskStatus` directly
  when a student dragged a card, which skipped the membership check entirely and
  recorded the change under a staff actor. It goes through
  `moveMemberTaskStatus` like every other member action.
- Admin-workspace permission gates are unchanged and behave the opposite way on
  purpose: they stay visible and disabled with the reason in the tooltip
  (`authStore.denialReason`, now translated). See `docs/ai/UI_GUIDELINES.md`
  § *Honest interfaces*.

**What still requires backend support.** All of it. Every rule above runs in the
browser against a member id the browser supplied. It keeps the interface coherent
and it stops nobody with developer tools open. No mock service performs
authorization.

## Layout and spacing

✅ Completed — a systematic pass, not a margin trim.

- Four rhythm tokens in `src/styles/tokens.css` (`--layout-gap-section`,
  `--layout-gap-grid`, `--layout-pad-card`, `--layout-gap-card`) plus
  `--layout-metric-min` / `--layout-card-min` for the point a grid drops a
  column. Pages use the tokens instead of ad-hoc values.
- **Grids respond to their container, not the viewport.** `.app-shell__main` is a
  `container-type: inline-size` context and grids use `@container page (…)` with
  `repeat(auto-fit, minmax(…, 1fr))`. This was the root cause of the empty space
  on the dashboard: `@media (max-width: 1280px)` collapsed the metric row on a
  *viewport* measurement, but the content area is the window minus a 264px
  sidebar — so the most common laptop size drew four cards 471px wide each
  holding one short caption. Measured after the change: 4 columns at 1440px,
  3 at 900px, 2 at 700px with the dashboard grid collapsing to 1, and no
  horizontal overflow at any of them.
- **Dialogs scroll their body, not the whole box.** Header and footer are
  `flex: none`; `.base-dialog__body` owns the scroll. Previously the confirm
  button scrolled away with the content — on the twelve-field member form at a
  laptop height, "Save" was below the fold.
- Every topbar control is one height (`--topbar-control-height: 34px`). The
  profile trigger was the reported bug: it had no explicit height and no
  `overflow`, so the 32px avatar set the button's height from the inside and
  spilled past the 1px lining. It now has the shared height, `overflow: hidden`,
  a 260px cap and an ellipsis on the name — the avatar is a 26px `small` and sits
  inside the box. Verified by measurement, not by eye.
- **A follow-up pass found two more control-consistency defects, both fixed:**
  - `.settings-grid label { font-size: var(--text-xs); … }` targeted the whole
    `<label>` wrapper, and form controls use `font: inherit` — so every input,
    select and textarea inside a `.settings-grid` (16 files, both workspaces:
    settings, calendar events, internships, participation periods, profile
    requests, report creation, and more) was inheriting the caption's 12px
    instead of the app's 14px baseline, rendering ~3px shorter than a sibling
    field outside the grid. The rule now targets `.settings-grid label >
    span:first-child` — the caption only — matching the pattern `.report-field`
    already used correctly.
  - `BaseDatePicker.vue` hardcoded `color-scheme: dark`, a leftover from before
    the light theme existed. In light mode this rendered the native
    calendar-picker icon assuming a dark surface — white-on-white, invisible.
    Removed; it now inherits the active theme's scheme from `:root` like every
    other token. Separately, three files (`AdminAttendancePage.vue`,
    `MemberAttendanceHistoryPage.vue`, `ParticipationPeriodDialog.vue` — six
    fields) used a raw `<BaseTextInput type="date">` instead of
    `BaseDatePicker`, which rendered 2px taller than its sibling filter controls
    because of the native date-input's own chrome; swapped to `BaseDatePicker`.

## Verification performed

- `npx vue-tsc --noEmit` — clean.
- `npm run build` — clean.
- Both languages driven through **all 19 admin routes and all student routes** in
  the browser, checking for raw key paths and for text left in the other
  language. Clean apart from the terms listed above as intentional.
- Locale parity checked mechanically: `en` and `pt` hold the identical key tree
  (2504 keys each), and every `t(...)` / `$t(...)` key referenced anywhere in
  `src/` exists. A missing Portuguese key silently falls back to English, so
  nothing but a check like this catches one.
- Four scanners run over `src/`, each looking at a shape the others cannot see —
  template text nodes, prose adjacent to an interpolation, script literals, and
  prose *inside* a template literal. What they still report is the documented
  set: stored record text, actor names written into records, timezone
  identifiers and `v-for` expressions.
- Language switch verified live (labels flip without a reload, including the
  dashboard metrics) and verified to persist across a full page reload. The
  activity strip's audit rows were a genuine exception to this until a
  follow-up pass caught and fixed them — see *Language and translation* in
  `docs/ai/FRONTEND.md` § *Rules that are not obvious* — and are now verified
  the same way: switched live, round-tripped both directions, no reload.
- Student task dialog verified at both levels: as a **coordinator** on one
  project the participant picker renders; as a plain **participant** on another
  it is absent and replaced by the self-assign checkbox, with no disabled
  controls in the dialog.
- Topbar profile trigger measured: avatar fully inside the trigger's box, all
  four topbar controls 34px.
- Dialog scrolling measured at 900px and at 620px viewport height: body scrolls,
  header and footer stay put, footer on screen.
- Browser console clean across the sweep — including the `Extraneous non-props
  attributes` warnings that `BaseDialog` produced on every page. Its root is a
  `<Teleport>`, so every `class` a caller passed (`base-form-dialog`,
  `app-profile-dialog`, …) was being dropped into nothing; attributes are now
  bound to the dialog box explicitly.

**Final regression pass** (after the fixes above, plus the participation/
attendance and i18n fixes described elsewhere in this document): `npx vue-tsc
--noEmit` clean, `npm run build` clean. Re-swept all 19 admin routes and all
student routes from a fresh reload with cleared storage, in both languages —
no raw key paths, no leftover wrong-language text beyond the documented
exceptions, console clean. Re-verified the date-picker and settings-grid fixes
hold on the pages they touch, the dashboard activity strip's live language
switch, the student task-assignment permission split (picker present for a
coordinator, absent for a participant), and no horizontal overflow at 375px on
the routes exercised. Session persists correctly across a hard reload on both
workspaces.

## Current Focus
- Wiring the mock service/store layer to the real OCaml/SQLite backend (everything today runs against `mockDatabase.ts` + `mockTransport.ts`)
- Server-side authorization for every workflow — no permission control in either
  workspace is currently a security boundary (`docs/ai/BACKEND_CONTRACTS.md`).
  The per-project rights model is now stated in one place
  (`src/types/projectPermissions.ts`) precisely so the API can reimplement it
  rather than infer it from the UI.
- Further visual polish pass as real usage surfaces gaps
