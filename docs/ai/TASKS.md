# Tasks

See `IMPLEMENTATION_STATUS.md` for the authoritative feature-by-feature status — this file tracks the next concrete steps, not a historical log.

## Done this pass

☑ Admin UI hot-fix pass:
  - `BaseMetricCard` never rendered an icon (pages passed `:icon` but it only had an `#icon`
    slot) — added the prop; dashboard and attendance cards now show icons
  - Members search and filters did nothing without pressing Apply, and the course/year
    dropdowns were built from the *filtered* rows so options vanished irrecoverably — both fixed
  - Renamed `supervisor` → `orientador` throughout and kept `monitor`, matching the FCT roles
  - Added `originSchool`/`isExternal` to members so interns from other schools are modelled
  - Extracted `InternshipFormDialog` and added the create-member → "also an intern?" handoff
  - Dashboard: dropped the "Attendance control center" header, merged signals+snapshot into one
    threshold-driven clickable card, replaced the quick-actions card with a slim rail
  - Attendance: full-width log, merged entry→exit column, icon actions, details as a modal,
    confirm before delete
  - Certificates: PDF template upload per track + per-member signed-copy attachment
  - Reports: rebuilt around the cross-member work journal (activity / coverage / projects /
    exports) with an optional `projectId` on daily entries
  - Users: permission-gated actions from a new `staffRole`, roster access tab, icon matrix
  - Settings: four tabs (Account & security, Notifications, Work hours, System) and a
    structural `syncForm` that no longer drops new nested fields

## Previously

☑ Remove PrimeVue and replace every usage with the native `src/components/base` component library

☑ Fold legacy `src/pages/*` compatibility pages into their `src/modules/**` counterparts

☑ Finish Devices (add/edit modal, restart/remove confirmation), Reports (real filters + download), Attendance (correction flow)

☑ Add the RFID Cards admin page (register, assign, deactivate, replace)

☑ Clarify Members vs Users labeling in navigation and page copy

☑ Fill in missing global CSS for structural layout classes (filter rows, list rows, form grids, dashboard panels) that had no padding/spacing before

☑ Correct the participation model: Equipa Técnica runs inside the school, so internships are
FCT-only and always hosted at the school (removed placement site and participant origin)

☑ Split volunteer team hours (`teamHours`) from FCT internship hours, with separate reports and
separate certificates

☑ Minimalist UI pass: removed the New scan / Generate report topbar buttons, the duplicated
topbar title, page eyebrows, breadcrumbs and the second description line on nav items

☑ Give the eight unstyled base components (StatsCard, DataCard, Badge, Section, Toolbar,
EmptyState, Loading, FilterPanel) real styling so the card structure holds

☑ Replace the member photo URL field with a real image upload (`uploads.service.ts` is the
single swap point for the server endpoint)

## Next up

☐ Wire the store/service layer to the real OCaml backend over SQLite (everything currently runs against `mockDatabase.ts`)

☐ Point `uploadImage()` in `src/services/uploads.service.ts` at the real upload endpoint — it
currently inlines a data URL so the app works offline

☐ Derive `teamHours` from attendance records server-side instead of storing it on the member

☐ JWT-based session handling to replace the mock auth store

☐ Attendance calendar view (admin side) to mirror the student calendar

☐ Grow the work journal into a project board. `DailyLogEntry.projectId` and `mockDatabase.projects`
are already the schema for it — a board would add task records under a project, assign them to
members, and let a daily entry reference the task rather than just the project.

☐ Open the daily log to members who are not interns in the student workspace nav — the data model
and the admin-side journal already treat every member as a possible author.

☐ `refreshAuthSession` parses the refresh token with `split("-")`, but account ids contain a hyphen
(`adm-1`), so the parsed id is wrong and refresh always fails. Encode the token properly.

☐ Revisit `docs/ai/PROJECT.md` and `Architecture.md` once the backend integration lands
