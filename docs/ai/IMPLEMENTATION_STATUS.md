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

## Current Focus
- Wiring the mock service/store layer to the real OCaml/SQLite backend (everything today runs against `mockDatabase.ts` + `mockTransport.ts`)
- Further visual polish pass as real usage surfaces gaps
