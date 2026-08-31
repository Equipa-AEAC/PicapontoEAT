# Project context

Persistent context for future sessions. Read this before changing anything.

This document describes what the repository **actually contains**, verified by
reading the code and exercising it in the browser. Where something is intended
but not implemented, it says so. Nothing here is aspirational.

Companion documents, referenced rather than restated:

- `docs/ai/BACKEND_CONTRACTS.md` — what the API must provide. The authority on
  endpoint shapes, session identity, and server-side rules.
- `docs/ai/UI_GUIDELINES.md` — theme, tokens, filters, honest-interface rules.
- `docs/ai/Architecture.md` — module layout and layering.

---

## 1. Purpose

**Pica Ponto** is the management application for **Equipa Técnica**, a
school-founded IT club that runs entirely inside the school.

Every person on the roster is a **team member**: a volunteer who helps around,
gets assigned project work, and accumulates *team hours* credited towards an
Equipa Técnica **surplus-hours certificate**.

A subset of those members *additionally* carry out their **FCT internship**
(Portaria n.º 235-A/2018) inside the club. Those are *internship hours*, and they
count towards a different, regulated document set.

The two hour buckets count towards two different things and **must never be
mixed**. This is stated in `src/types/placements.ts` and is the central domain
rule of the product.

Because the club lives inside the school, an internship is always hosted at the
school — there is no external placement site. The club does host FCT interns
enrolled at *other* schools (`MemberSummary.isExternal`).

---

## 2. Technology and boundaries

Frontend: **Vue 3** (`<script setup>`, TypeScript strict) · **Pinia** (setup
stores) · **vue-router 5** · **Vite 8** · **Tauri 2** desktop shell ·
**Phosphor icons** · self-hosted IBM Plex Sans.

### Backend boundary — absolute

A Haxe backend exists under `backend/` and is owned by other developers.

**Do not modify** `backend/`, `dev.hxml`, `global.hxml`, any Haxe
toolchain/configuration file, and do not install Haxe libraries. They may be
**read** to understand contracts. If a frontend requirement exposes a backend
gap, **document the contract** in `BACKEND_CONTRACTS.md` — do not implement
backend code, and do not spend time trying to make the Haxe backend compile.

Known backend state: the `hxwell` library it depends on is not on haxelib and is
not vendored, so the backend does not currently compile. This is documented, not
fixed.

### Data flow — do not bypass

```
UI (pages) → Pinia stores → services → mockRequest() → mockDatabase
```

Every write goes through a service. **Components must never mutate mock data
directly.** Each service wraps its body in `mockRequest(...)` and is otherwise
the code that will call `httpClient`, so swapping a service to the real API
should change nothing above it.

### Barrel re-export layout

Canonical code lives in `src/{components,services,stores,types,utils}`.
`src/shared/*` and `src/modules/*/{services,stores,types}` re-export it. Add new
code to the canonical location and re-export; never fork a second copy.

---

## 3. Domain model — as actually implemented

### Member — the stable identity

`src/types/members.ts` · `MemberSummary` / `MemberDetails`

A Member is the person. Ids look like `stu-1001`. **A participation change must
never create a second Member.**

Note a naming wart: attendance and internship records call the member id
`studentId`, and it holds a member id (`stu-1001`). Do not confuse it with an
*account* id (`stu-1`).

### Roles — three concepts, and only one of them is participation

| Concept | Type | Scope | What it means |
| --- | --- | --- | --- |
| `UserRole` | `"administrator" \| "student"` | account | Which workspace the session lands in. |
| `StaffRole` (`users.ts`) | `administrator \| coordinator \| teacher \| viewer` | account | Staff permission tier in the admin workspace. |
| `MemberInternshipStatus` | `not-assigned \| in-progress \| complete` | member | Whether the member holds a placement **right now**. |

The first two are account properties and say nothing about hour accounting.

`internshipStatus` is a **current-state flag** and is still used, deliberately, for
filtering, announcement targeting, and deciding which cards a page renders
(`isIntern` on Member Details). **It must never classify historical attendance.**
That job belongs to participation periods.

### ParticipationPeriod — how participation is represented

`src/types/participation.ts` · `src/utils/participation.ts` · `src/services/participation.service.ts`

```
id · memberId · kind: "team-member" | "internship"
startDate (inclusive) · endDate (inclusive, null = current)
internshipId (internship periods only) · note
```

- Periods belong to one Member. A participation change **never** creates a second Member.
- Periods are ordered by `startDate` and **cannot overlap**; at most one may be open.
- `kind` mirrors `PlacementProgram` (`participationKindToProgram`), so the vocabulary is single.
- **Arbitrary history is supported.** Team Member → Internship → Team Member, or
  several internship periods, are all representable. Nothing hard-codes one
  transition; the seeded members transition on *different* dates for exactly this
  reason.

### Team Member participation

A `team-member` period. Previously nothing represented it at all — team membership
was implicit and permanent, which is why volunteer hours could not be bounded in
time.

### Internship

`src/types/internships.ts`. Still one internship record per member (enforced in
`assignInternship`), but the *periods* referencing it are what classify attendance,
and a member may hold several periods. `requiredHours` is stored — a school rule.
`completedHours` / `remainingHours` are **derived** (see §6).

Assigning an internship deliberately does **not** create a period. Recording the
placement and deciding which days its hours start counting from are two separate
acts, and guessing the second would silently re-bucket existing attendance.

### Attendance

`src/types/attendance.ts`. One row per member per day: `studentId`, `date`,
`entry`/`exit` (`HH:MM`, nullable), `hours`, `status`, `corrections`.

Attendance carries **no participation field**, on purpose. A row records what
happened; the period covering its `date` decides what it counts as. Storing the
classification on the row would freeze a decision periods can legitimately revise.

### Attendance correction

Unchanged: its own entity with a `pending → approved | rejected | withdrawn`
lifecycle. Approving may rewrite `entry`/`exit`, recompute `hours`, and set
`status = corrected`. Because totals are derived, that rewrite moves the hour
totals with no second write — into the bucket the record's **date** belongs to.

### Projects, tasks, journal, reports, certificates, announcements, moments

- **Daily log** (`DailyLogEntry.hours`) — self-reported per day. **Not** an hour
  source for either bucket; it feeds the journal and the FCT report documents.
- **Reports** — `team-hours` and `internship` are separate types, both period-derived.
- **Certificates** — `surplus` ← team hours, `fct` ← internship hours. Never combined.
- **Announcements** — `AnnouncementRead`, idempotent `markRead`, unread badge.
- **Team Moments** — root-level, 24h read-time expiry, `/admin/projects/moments` redirect.

---

## 4. Identity rules

`AuthUser.memberId` is the **single seam** through which member-scoped data
resolves its subject.

- Pages read `authStore.currentMemberId`. **Never reintroduce `CURRENT_MEMBER_ID`.**
- `SEEDED_STUDENT_MEMBER_ID` stays inside the mock auth layer.
- No member ⇒ resolve to `""` and render empty-safe. **Never fall back to another member.**
- An account is not a member: `stu-1` is an account, `stu-1001` is a member.
- A role or participation change **must not** create a second Member.

**Routing and conditional rendering are not authorization.** See §11.

---

## 5. Attendance rules

- **One canonical collection.** `mockDatabase.attendance` is the only place a day
  is recorded. Everything else projects it.
- **Never create a second attendance-history collection.** Four have been removed
  for this reason (`memberHistory`, `portalSummary.attendanceCalendar`,
  `recentAttendance`/`weeklyStatistics`/`monthlyStatistics`).
- **Historical attendance stays historically correct.** Never classify a past
  record by the member's current role.
- Statistics: `src/utils/attendanceStats.ts`. Dates parsed **locally** —
  `new Date("2026-08-03")` is UTC midnight and lands on the 2nd in a negative offset.
- Filters follow `UI_GUIDELINES.md` § Filters.

---

## 6. Hour accounting — canonical and derived

**Attendance is the single source of truth for hours.**

```
attendance.hours
      ↓  classified by
ParticipationPeriod covering attendance.date
      ↓
Team Member hours   |   Internship hours   |   Unclassified
```

`summariseParticipation` in `src/utils/participation.ts` performs the split;
`participation.service.ts` is the only place that calls it against the database.
Every consumer goes through it:

| Consumer | Hour fields |
| --- | --- |
| `members.service` → `teamHours`, `internshipCompletedHours` | derived |
| `internships.service` → `completedHours`, `remainingHours` | derived |
| `portal.service` → `completedHours`, `remainingHours`, `internshipProgress`, `teamHours`, `internshipHours` | derived |
| `certificates.service` → surplus / FCT hours | derived |
| `reports.service` → `team-hours`, `internship`, summary | derived |
| Member Details, Worked Hours, student dashboard | derived |

### What is stored, and what is not

- **Stored:** `attendance.hours` (the measurement), `internship.requiredHours`
  (a school rule), `internshipStatus` (current state), the periods themselves.
- **Never stored:** every team/internship hour total. There is no field to update
  and nothing to keep in step.

**Do not manually increment an hour total anywhere.** Corrections change totals by
changing the attendance record, which is the only mechanism.

### Non-attendance hours

None exist, and this was checked rather than assumed. The old
`updateInternshipProgress` accepted a typed-in hour increment; nothing in the
domain justified it — the FCT document set is built on the *ficha de assiduidade*,
an attendance sheet, and `internshipReports.ts` already stated the surplus
certificate is "earned from attendance". It was a placeholder, so hours were
removed from that form; it now sets placement **status and notes** only. If a
legitimate non-attendance hour source ever appears, model it explicitly as its own
entity — do not reintroduce a writable total.

---

## 7. The Team Member → Intern rule — implemented

Hours are classified by **the participation period applicable to the attendance
record's date**, never by the member's current role.

```
Ana (stu-1001)
Technical Team  01 Jun → 14 Jul 2026    73h30m   (19 days)
      ──── transition ────
Internship      15 Jul → 30 Nov 2026    77h30m   (20 days)
```

Making Ana an intern does not move her June hours. Verified: 14 July resolves to
`team-member`, 15 July to `internship`.

### Same-day transitions — whole-day, both ends inclusive

Attendance stores one row per member per day and cannot express half a day, so a
period boundary is a **date, never a time**. 15 July is entirely internship time.
A transition recorded mid-day takes effect from the following whole day.
**Do not invent sub-day accounting** — it would need a precision attendance lacks.

### Corrections keep their original classification

A June record corrected in August, after the member became an intern, still
credits **Team Member** hours. The bucket follows the record's date, not the date
the correction was resolved. Verified end to end.

### Unclassified attendance

A day covered by no period counts towards **neither** total. It is reported as
`unclassifiedHours` / `unclassifiedDays` and surfaced in the timeline as a warning.
Silently crediting it to either side would hide a data problem. A newly created
member has no period, so their attendance is unclassified until staff record one —
deliberate, because guessing a start date would credit hours nobody agreed to.

---

## 8. Presentation

### Staff

Member Details carries a **participation timeline** (`ParticipationTimeline.vue`):
periods newest-first on a rail, each with kind, inclusive range, day count, derived
hours and the credit it counts towards, with the boundary labelled *transition*.
Two totals sit above it, side by side and never summed.

There is deliberately **no role column on the attendance table** — it would repeat
one fact per row and never show the transition. Participation is managed from the
same page (`ParticipationPeriodDialog.vue`).

### Student

Worked Hours shows current participation ("Currently Internship since 15 Jul 2026"),
then **Internship hours** and **Technical Team hours** as separate cards, the
internship remainder, and the same timeline for history.

- The progress figure measures **internship hours only** — 77h30m of 240h = 32%.
  Combining the buckets would have read 63% and been wrong.
- **No ambiguous "Total hours".** If a combined figure is ever shown it must be
  labelled as combined and must not replace the separated values.

---

## 9. Certificates and reports

- `surplus` ← **team hours**; `fct` ← **internship hours**. Never combined, and
  both now derived from periods.
- Eligibility rules are unchanged and separate from the hour source: surplus needs
  team hours > 0; FCT needs `internship.status === "complete"`.
- `team-hours` and `internship` reports are period-derived and **now honour their
  `dateRange`**, which every report previously printed and ignored.


## 10. Backend contract requirements

`BACKEND_CONTRACTS.md` is the authority. This audit added one domain to it:
**Participation periods** — the entity in §8, with server-enforced non-overlap,
the whole-day bucket rule, correction classification, and period-scoped hour
aggregation. Read that section rather than re-deriving the shape here.

Already documented there and still true: session identity, announcement read
state, attendance history and export, audit log, the member's own calendar,
attendance corrections.

---

## 11. Current limitations — keep these explicit

- **No authorization exists anywhere in the frontend or the mock.** Every
  ownership rule is enforced only by which page renders, which is not
  enforcement. A manipulated `memberId` exposes another member's mock data.
  **Never describe frontend gating as authorization.**
- **`attendance:correct` is specified but not enforced** — it is not in
  `AdminPermission` / `ROLE_PERMISSIONS`, so any admin-workspace role can resolve
  a correction.
- **CSV export covers the loaded/filtered page only.** It is deliberately
  client-side so the file always matches the table. A full-year or all-member
  export is a server-side report with its own permission.
- **Hour totals are recomputed on every read.** With a 104-row fixture that is
  free; against a real dataset the aggregation belongs server-side (see the
  contract). Nothing caches it, so nothing can go stale.
- **Only one internship record per member** is still enforced by
  `assignInternship`. Multiple *periods* are supported, but a second concurrent
  placement record is not. Nothing in the seeded data needs one.
- **A member with no participation period has unclassified attendance.** This is
  intended, and it is surfaced rather than hidden — but it does mean a newly
  created member shows zero in both buckets until staff record a period.
- **One internship per member is enforced**, so historical internship periods
  cannot be represented.
- `currentInternshipStatus` is a free-text string; `StudentProfilePage` compares
  it to `'active'` while the fixture holds `"In progress"`, so that branch never
  matches.
- The Haxe backend does not compile (`hxwell` unavailable).

---

## 12. Implementation history — do not undo

- **Session identity seam.** `AuthUser.memberId` + `authStore.currentMemberId`
  replaced `CURRENT_MEMBER_ID` across 31 call sites in 8 files.
- **Attendance history de-duplicated.** `mockDatabase.memberHistory` removed;
  history is a projection of the canonical collection.
- **`AttendanceFilters.dateRange` honoured** — it was declared but never read, so
  date filtering silently did nothing.
- **Shared CSV utility** (`src/utils/csv.ts`): RFC quoting, `=+-@`
  formula-injection escaping, UTF-8 BOM. Reuse it; do not write a second one.
- **Announcement read state** — `AnnouncementRead`, idempotent `markRead`, badge.
- **Team Moments** moved to root nav with `/admin/projects/moments` redirect.
- **Filter contract unified** across Attendance / Devices / Audit (see
  `UI_GUIDELINES.md` § Filters). Fixed a Devices bug where Reset cleared the
  controls but not the store filters.
- **Audit export** added, after routing audit filtering through the store and
  service; dropdown options come from an unfiltered collection so narrowing never
  removes the way back.
- **Student calendar month grid** projecting canonical attendance; removed
  `portalSummary.attendanceCalendar`.
- **Dashboard / Worked Hours statistics de-fabricated** — removed
  `recentAttendance`, `weeklyStatistics`, `monthlyStatistics`; added
  `src/utils/attendanceStats.ts`. The fabricated bars credited Ana 7h every
  Tuesday and 6h every Friday; her actual rota is Mon/Wed/Thu.
- **Correction lifecycle fixtures** seeded with all four states, plus the audit
  entries those transitions imply.
- **ParticipationPeriod introduced**, and hour accounting made derived. This was
  the largest change and the one most worth not undoing:
  - `src/types/participation.ts`, `src/utils/participation.ts` (pure resolver),
    `src/services/participation.service.ts`, `src/stores/participation.ts`.
  - `mockDatabase.participationPeriods` seeded for all three members, with
    transitions on *different* dates so nothing can hard-code one.
  - **Four stored copies of internship hours collapsed to zero.** `completedHours`
    / `remainingHours` left the internship fixture, the member fixture and the
    portal fixture, and the `memberInternships` map was deleted outright. The
    stored shapes are now `StoredMember`, `StoredInternship`,
    `StoredPortalSummary` — types whose whole job is to make it a compile error to
    store an hour total again.
  - `member.teamHours` stopped being a hand-seeded scalar (64 / 92 / 18) and
    became the sum of attendance inside team-member periods.
  - `updateInternshipProgress` stopped accepting typed-in hours; it sets status
    and notes. The admin dialog shows the derived figure read-only.
  - Reports began applying their `dateRange`, which all four types previously
    printed and ignored.
  - `getStudentPortalSummary` takes a `memberId` — the portal summary is now built
    per member instead of being one shared fixture object.

---

## 13. Do-not-break rules

1. Do not modify `backend/`, `dev.hxml`, `global.hxml`, or Haxe tooling.
2. Do not truncate, regenerate, or unsafely write `src/services/mockDatabase.ts`.
   Inspect the relevant section and make targeted edits. Preserve: **5 projects,
   14 tasks, 7 activity events, 104 attendance rows, 4 correction lifecycle
   fixtures** (`acr-1` pending, `acr-2` approved+applied, `acr-3` rejected,
   `acr-4` withdrawn), journal/report relationships, Team Moments, announcements.
3. Do not reintroduce `CURRENT_MEMBER_ID`; keep `SEEDED_STUDENT_MEMBER_ID` inside
   the mock auth layer.
4. Do not create a second attendance-history collection, or any second copy of a
   fact that already has a home.
5. Do not bypass the service layer from components.
6. Do not introduce a second state-management pattern.
7. Do not merge team hours and internship hours into one figure.
7a. Do not store an hour total. `StoredMember`, `StoredInternship` and
    `StoredPortalSummary` exist to prevent it; do not widen them.
7b. Do not classify attendance anywhere except through
    `resolvePeriodForDate` / `summariseParticipation`. One rule, one place.
8. Do not reclassify historical attendance by a member's current role.
9. Do not claim authorization exists in the frontend.
10. **Verification is not compilation.** Exercise user-facing workflows in the
    browser. Check existing behaviour before declaring it broken. A missing
    import fails silently in a Vue template — `vue-tsc` and the production build
    both pass while the component renders nothing.
