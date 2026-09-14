# Implementation status — participation accounting, and the workspace UX review

Authoritative status record. Three passes, in order:

1. **Participation & hour accounting** (below) — the Team Member → Intern
   accounting feature. Unchanged by the passes that followed.
2. **[UX and Workflow Review](#ux-and-workflow-review--current-status)** — the
   wider review of both workspaces. Start there for the lifecycle rules and what
   is still backend-dependent.
3. **[Round two](#round-two--student-project-management-and-three-smaller-corrections)**
   — students given the project management system (sidebar group, Kanban board,
   task permissions), the calendar wired to it, and announcements marked one at
   a time. **This is the current state of the student workspace**, and it
   supersedes the "Projects" and "My Work" descriptions in pass 2.

Every entry was verified against the current code and exercised in the running
application. Claims from earlier reports that did not hold are corrected here
rather than preserved.

Companions (not restated): `docs/ai/PROJECT_CONTEXT.md` (domain rules),
`docs/ai/BACKEND_CONTRACTS.md` (server contract).

---

## 1. Current overall status

**Frontend: complete for the domain rules this feature defines.** Attendance is
the source of truth, participation periods decide the bucket, and no hour total is
stored anywhere. One classification authority, verified by search rather than
assertion.

- **Unresolved frontend work:** none found in this audit (§5).
- **Backend required:** all authorization and enforcement (§6). Nothing in the
  frontend or the mock restricts who may read or write participation data.
- **Known limitations:** aggregation recomputed per read; one internship *record*
  per member; advisory-only validation; member-detail first paint waits on four
  mock round trips (§7).

This audit found **one real defect**, fixed here: the reports "Period snapshot"
card claimed to describe the selected period while showing all-time totals.

---

## 2. Requirements status matrix

| Requirement | Status | Evidence / files | Notes |
| --- | --- | --- | --- |
| `ParticipationPeriod` exists and is used | COMPLETE | `src/types/participation.ts`; 5 seeded periods in `mockDatabase.ts` | Consumed by service, store, 2 components, 5 services |
| Multiple historical periods | COMPLETE | `validatePeriod`; fixture has 2 periods each for two members | Transitions seeded on *different* dates; nothing hard-codes one |
| Classification by `attendance.date` | COMPLETE | `resolvePeriodForDate` in `src/utils/participation.ts` | Boundary verified: 14 Jul team, 15 Jul internship |
| `resolvePeriodForDate` is the authority | COMPLETE | only caller outside its module is `participation.service.ts:84` | Verified by grep across `src` |
| `summariseParticipation` derives totals | COMPLETE | `src/utils/participation.ts` → `computeParticipationHours` | Pure; takes periods + rows as arguments |
| No independent classification elsewhere | COMPLETE | grep for `startDate`/`endDate` comparisons outside the utility | Only hits are `endDate === null` (finding the open period) and internship *form* validation — neither classifies a date |
| Reverse transition (Internship → Team) | COMPLETE | resolver test | `2026-03-31` → internship, `2026-04-01` → team |
| Team hours not stored | COMPLETE | `StoredMember` omits it; derived in `members.service.ts:20` | No assignment to it anywhere in `src` |
| Internship completed/remaining not stored | COMPLETE | `StoredInternship`; derived in `internships.service.ts:19` | |
| Portal hour totals not stored | COMPLETE | `StoredPortalSummary`; derived in `portal.service.ts` | |
| Duplicate internship/member hour maps removed | COMPLETE | `memberInternships` absent from `mockDatabase.ts` (comment only) | `getMemberInternship` projects the internship record |
| No manual hour mutation | COMPLETE | grep for `.teamHours =`, `.completedHours +=`, etc. | **Zero matches** across `src` |
| Internship progress uses internship hours only | COMPLETE | `portal.service.ts` | 77h30m / 240h = 32%; combining would read 63% |
| Remaining hours single-sourced | COMPLETE | `MemberDetailsPage.vue:142` reads `membersStore.internship?.remainingHours` | Template no longer recomputes it |
| Internship status/notes separate from hours | COMPLETE | `InternshipProgressUpdateValues` = `{status, notes}` | Dialog shows derived hours read-only |
| Correction keeps historical classification | COMPLETE | `attendanceCorrections.service.ts` has no role/participation logic | June record corrected today → **Team** 73.5→77.5 |
| Pending correction changes nothing | COMPLETE | behavioural test | |
| Rejected correction changes nothing | COMPLETE | behavioural test | |
| Withdrawn correction changes nothing | COMPLETE | behavioural test | |
| Approved+applied changes only its own bucket | COMPLETE | behavioural test | |
| `team-hours` report applies range | COMPLETE | `reports.service.ts:72` | |
| `internship` report applies range | COMPLETE | `reports.service.ts:113` | |
| `project` report applies range | COMPLETE | `reports.service.ts` (`completedAt`) | 4 tasks full → 2 in Q1 |
| `attendance`/`student`/`device` report applies range | COMPLETE | `reports.service.ts` fallback branch | 104 → 32 for August |
| **Report summary card applies range** | **COMPLETE (fixed this pass)** | `getReportSummary(dateRange)`, `AdminReportsPage.vue` | Was all-time under the title "Period snapshot" |
| Subtitle honest when unbounded | COMPLETE | `rangeSubtitle` → "All recorded data" | |
| Attendance detail shows classification | COMPLETE | `AdminAttendancePage.vue`, `classifyAttendanceDate` | Uses the same resolver; no second algorithm |
| Participation not a stored per-row field | COMPLETE | `AttendanceSummary` has no participation field | Resolved on open, not persisted |
| Unclassified visible and excluded | COMPLETE | `summariseParticipation`, `ParticipationTimeline.vue` | 44.6h/12d excluded from both buckets and from progress |
| Overlap / backwards / second-open rejected | COMPLETE | `validatePeriod`; verified through the UI form | Nothing written on rejection |
| Invalid internship reference rejected | COMPLETE | `participation.service.ts` | Unknown internship, and one owned by another member |
| Audit entries for period changes | COMPLETE | `participation.service.ts` (`entity: "participation-period"`) | CREATE / UPDATE / DELETE |
| Barrel exports resolve | COMPLETE | every specifier in the student + shared barrels checked on disk | Stale `StudentInternshipPage` export removed |
| Participation in shared barrels | COMPLETE | `src/shared/{stores,types,services,utils}` | |
| Certificates read the correct bucket | COMPLETE | `certificates.service.ts` | surplus ← team, fct ← internship, never combined |
| Authorization | BACKEND REQUIRED | — | None exists anywhere (§6) |
| Ownership / `memberId` enforcement | BACKEND REQUIRED | — | |
| Role & permission enforcement | BACKEND REQUIRED | — | `participation:manage` / `attendance:correct` absent by choice |
| Server-side period validation | BACKEND REQUIRED | — | Client checks are advisory |
| Persistence | BACKEND REQUIRED | — | Mock state resets on reload |
| Aggregation scalability | KNOWN LIMITATION | `computeParticipationHours` | Recomputed per read (§7) |
| One internship record per member | KNOWN LIMITATION | `assignInternship` throws on a second | Multiple *periods* are supported |

---

## 3. Verified architecture

```
attendance record (studentId, date, hours)      ← source of truth for hours
        ↓
period covering attendance.date                 ← the only classification step
        ↓
Team Member | Internship | Unclassified
        ↓
derived totals (never stored, no cache)
```

**Classification happens in exactly one place.**

| Layer | File | Role |
| --- | --- | --- |
| Rule | `src/utils/participation.ts` | `resolvePeriodForDate`, `periodCoversDate`, `summariseParticipation`, `validatePeriod` — pure, no store or database |
| Data access | `src/services/participation.service.ts` | the only module that calls the rule against `mockDatabase`; exposes `computeParticipationHours`, `classifyAttendanceDate` |
| Consumers | `members`, `internships`, `portal`, `certificates`, `reports` services | all import `computeParticipationHours`; none compares dates itself |
| UI | participation store → timeline / dialog / pages | reads totals; performs no classification |

Attendance rows carry **no** participation field. Classification is resolved when
needed and never persisted, so editing a period reclassifies history correctly
rather than leaving stale labels behind.

---

## 4. Completed work

### Previously implemented (verified, unchanged this pass)
- `ParticipationPeriod` type, pure resolver, validation, service, store.
- Timeline and period-management dialog; participation section on Member Details.
- Attendance-derived Team vs Internship accounting across every consumer.
- Removal of all four stored copies of internship hours; `StoredMember` /
  `StoredInternship` / `StoredPortalSummary` prevent reintroduction.
- Internship progress reduced to status + notes; derived hours shown read-only.
- Internship progress measured on internship hours only.
- Corrections preserving historical classification, by construction.
- Unclassified bucket, surfaced with a warning.
- Audit entries for period changes.
- Separate Team / Internship cards on admin and student surfaces.

### Implemented in the previous continuation (verified present)
- Date range applied by the `project` and `attendance`/`student`/`device` reports.
- "Counts as" classification line in the attendance detail dialog.
- Member Details remaining hours read from the derived source; `formatHours` used consistently.
- Stale `StudentInternshipPage` barrel export removed.
- Participation added to the shared barrels.

### Implemented in this continuation
- **Report summary card scoped to the selected range.** `getReportSummary` now
  takes the same `dateRange` as the preview and scopes attendance, both hour
  buckets and completed tasks. `ReportSummary.rangeApplied` was added so the page
  can distinguish period-scoped figures from current-roster figures, and the card
  copy no longer implies the roster count is period-scoped.

---

## 5. Remaining frontend work

No known frontend implementation gaps were found during this audit.

This was checked, not assumed: greps for stored/mutated hour state, for
participation date comparisons outside the authority, for dead types and
unresolved barrel specifiers, plus behavioural tests of classification,
corrections, period validation, cross-surface totals, reports and unclassified
handling. Results in §8.

---

## 6. Backend required

Frontend validation is insufficient for all of the following because the mock
runs entirely in the browser: every check can be bypassed by calling the service
directly, editing persisted session state, or modifying the page.

| Concern | Why the frontend cannot settle it |
| --- | --- |
| **Authorization** | No mock service checks permissions. Which page renders is not access control. |
| **Manipulated `memberId`** | The session is client-held. Editing it exposes another member's periods and hours. The API must issue `memberId` from the session and never accept it from the client. |
| **Ownership enforcement** | `GET /members/:id/participation` and `/hours` must be refused for other members unless the caller is staff. |
| **Role / permission enforcement** | `participation:manage` and `attendance:correct` are deliberately **not** added to `ROLE_PERMISSIONS`: gating the UI without server enforcement would look like access control while providing none. |
| **Period validation** | Overlap, backwards ranges, second open period and internship ownership must be re-checked server-side, ignoring what the client believed. |
| **Attendance correction enforcement** | The server must verify the record belongs to the requester, that only a reviewer resolves, and that a resolved request cannot be resolved again. |
| **Persistence** | Mock state lives in memory and resets on reload. |
| **Server-side integrity** | Audit entries must be append-only; participation history must not be silently rewritable. |
| **Aggregation scalability** | Totals should be aggregated server-side (`GET /members/:id/hours`) rather than summing every attendance row per read. |

Contract shapes: `docs/ai/BACKEND_CONTRACTS.md` § *Participation periods*.
`backend/`, `dev.hxml`, `global.hxml` were not modified.

---

## 7. Known limitations

Verified present in the current code.

1. **Aggregation is recomputed on every read.** `computeParticipationHours` scans
   the member's attendance each call. Correct and instant at 104 rows; it is not a
   strategy for a real dataset. No cache exists, which is also why a correction
   needs no invalidation.
2. **Authorization is advisory only.** Every validation message is a convenience
   for the person filling the form.
3. **One internship *record* per member**, enforced by `assignInternship`.
   Multiple internship *periods* are representable, which is what the accounting
   rule needs, but two concurrent placement records are not.
4. **A member with no period has unclassified attendance.** Intentional — guessing
   a start date would credit hours nobody agreed to — but it means a newly created
   member reads zero in both buckets until staff record a period.
5. **Member Details first paint waits on four mock round trips** (member, then
   participation + internships + project work). It shows `BaseLoading` for roughly
   2.4s under mock latency. Measured, not a rendering defect.
6. **`internshipStatus` / `isIntern` remain** for filtering, announcement
   targeting and choosing which cards render. They never classify attendance.
7. **`ProjectParticipant.role`** ("Team member" / "Intern") is a current-state
   descriptor for staffing projects, not hour accounting.
8. **Members and devices are not period-scoped** in the report summary, because
   neither is a dated record. The card now says so explicitly.

---

## 8. Verification evidence

All re-run in this continuation against a freshly restarted dev server (the
previous Vite process had exited).

**Static:** `npx vue-tsc --noEmit` → clean. `npm run build` → clean, 2.95s.
`backend/`, `dev.hxml`, `global.hxml` clean; no Haxe files touched.
Fixtures intact: 5 projects, 14 tasks, 7 activity events, **104 attendance rows**,
4 correction lifecycle states, 5 participation periods.

**Classification:** boundary 13/14 Jul → team, 15/16 Jul → internship ·
outside all periods (`2026-05-01`, `2026-12-25`) → unclassified ·
reverse Internship → Team → correct · team-only → team · internship-only →
internship · no periods → unclassified.

**Derived totals:** Ana 73.5 team / 77.5 internship / 0 unclassified ·
Bruno 84.8 / 0 / 0 · Carolina 52.4 / 99.5 / 0.

**Corrections:** pending, withdrawn and rejected each left totals unchanged ·
approved+applied on `2026-06-15`, while the member is currently an intern,
credited **Team** 73.5 → 77.5 with internship unchanged.

**Cross-surface agreement:** participation service, portal (`completedHours` and
`internshipHours`), member record, internship record and the member-internship
projection all returned the same internship figure; team figure agreed across
participation service, portal and member record.

**Reports:** summary now range-scoped — full 104 attendance / 210.7 team / 177
internship / 4 tasks; August 32 / 27.7 / 91.9 / 0; June 36 / 131.8 / **0
internship** (nobody was on a placement in June), which also demonstrates the
summary classifies by period rather than by current status.

**Routes:** 17 admin + 12 student rendered. `/admin/members/stu-1001` was sampled
over time and reaches full content at ~2.4s — mock latency, recorded as
limitation 5.

**Console:** no errors in either workspace on a fresh server.

---

## 9. Files changed during this continuation

Source:

- `src/services/reports.service.ts` — `getReportSummary` takes a date range;
  dated figures scoped; shared `DateRange` alias.
- `src/types/reports.ts` — `ReportSummary.rangeApplied`; clarified field docs.
- `src/modules/admin/reports/pages/AdminReportsPage.vue` — passes the range to the
  summary; card copy distinguishes period-scoped from current-roster figures.

Documentation:

- `docs/PARTICIPATION_IMPLEMENTATION_STATUS.md` — rewritten to the audit structure
  above.

No other source files were modified. Earlier continuations' changes were verified
and left as they are.

---

# UX and Workflow Review — Current Status

A second, wider pass over both workspaces, carried out after the participation
work above. That feature is **unchanged**: this section documents what was built
around it, and §6.4 states explicitly what was checked to confirm the accounting
architecture was not weakened, duplicated or bypassed.

Every claim below distinguishes *implemented and verified* from *frontend
prepared, backend required*. Nothing here is described as complete because a
screen exists.

---

## 1. Overall status

**Completed and verified in the running application**

- Student: Dashboard, Calendar (day workflow + events), Projects (new page),
  Attendance summary, Profile change requests, Internship Reports (creation,
  generated-preview lock, draft editing, lifecycle), Certificates (eligibility →
  request → download), Settings (alerts, sidebar order), My Work cross-links.
- Admin: Dashboard layout and metrics, Cards (terminal-based registration),
  Internships (details modal), Calendar (new page), Reports (monthly + final
  review queues), Announcements (publish-first, three-state tabs), Certificates
  (requests / school profiles / surplus template), Devices (layout + IP), Audit
  (project activity), Users (per-account permissions).
- Cross-workspace: the report lifecycle was driven end to end in one session —
  student submits, admin returns with a note, student sees the note and reopens.

**Frontend prepared, backend required** — §6.3 and
`docs/ai/BACKEND_CONTRACTS.md`. In summary: all authorization; event visibility;
eligibility re-derivation; PDF generation; preference persistence per account;
device card reads.

**Not implemented / out of scope**

- No notification *delivery* (email, push). The alert preferences govern what the
  portal displays, and the Settings copy says so in as many words.
- `backend/`, `dev.hxml`, `global.hxml` untouched, as instructed.

**Defects found and fixed during this pass** — three, all real:

1. The admin dashboard's weekly chart was `data: [35, 38, 42, 44, 39, 28, 30]`
   hardcoded in the component. It drew the same seven bars whatever the system
   contained.
2. "Pending corrections" counted attendance rows whose `corrections > 0` — that
   is, days *already corrected*, i.e. finished work — rather than the requests
   still waiting for an answer.
3. Opening a user account whose permissions differed from its role silently
   rebased them onto the role preset, so a coordinator granted "create accounts"
   appeared not to have it and saving would have removed it. (Introduced during
   this pass; caught in browser verification, fixed, re-verified.)

A fourth, smaller one: the logout confirmation's button read **Delete**.

---

## 2. Student workflow changes

### Dashboard

```
Previous → four cards, a seven-tile strip of the most recent attendance rows
           labelled "across the current week", a day-of-week bar chart over the
           whole record, and three cards repeating Profile and Worked Hours.
New      → what needs you, where you stand, what is coming.
```

- **"Needs your attention"** is new and is the point of the page: one list built
  from records that carry a decision — resolved corrections, returned or draft
  reports, certificate and profile decisions, unread announcements, overdue and
  due-soon tasks. Every row is a record that exists; an empty list says so
  plainly rather than being padded.
- **The attendance strip is now a calendar.** It renders the actual month, and
  clicking a day opens that day on the Calendar page (`?date=`).
- **Day-of-week chart replaced** by hours per week of the current month.
- **Removed:** "Internship oversight" and "Achievements", verbatim copies of
  Profile and Worked Hours.
- Report status and the unclassified-hours warning surface here.

### Calendar

```
Previous → a month of attendance tiles; clicking a day pushed you to the
           unfiltered attendance list with the clicked day nowhere in sight.
New      → a selected-day panel answering what happened, what is due, what is
           planned, and what you can do about it.
```

- Attendance for the day (status, times, hours, terminal) with a link to the record.
- The **daily report** for that day: opens the draft if one exists, offers to
  write it if the day is done and has hours, and explains itself when it does not.
- Tasks due that day; events with their visibility and author.
- Add / edit / delete events, author-only.
- Grid marks show event and task counts per day; the legend covers them.

### Projects (new page, `/student/projects`)

Projects were administrator-only; a member saw a project's name as plain text
beside a task title. The new page shows the projects they are on with status,
priority, deadline, owner and team, **the project's progress and their own share
of it as two clearly separate figures**, their tasks with an inline status
control, and upcoming project events. No administrative controls: a member cannot
create, delete, reassign or see anybody else's load.

My Work and My Projects are two views of one set of records, cross-linked, both
reading one store — a status changed on either is changed on both.

### Attendance

Added summary cards that answer what the table cannot: current participation and
since when (read from the open period, not a status flag), Technical Team hours,
Internship hours, and requests awaiting an answer. **The two buckets are never
added together.** Unclassified days appear only when they exist, described as a
data problem to fix.

### Profile

```
Previous → read-only, and said "ask the coordination team" with no way to ask.
New      → read-only, with a request workflow for email, phone and picture.
```

Current and requested values sit side by side, because that is the comparison the
reviewer makes. **The record does not move until a reviewer approves** — verified
in the browser: after submitting, the page still showed the old number. Academic
fields have no request button; the copy says which are the school's to correct.

### Internship Reports

```
Previous → a month select, a "Generate from journal" button and an always-open
           final-report form, with nothing saying they were different documents.
           Generated content appeared directly in editable textareas. The history
           table's only action was Submit, so a saved draft was as locked as an
           approved report.
New      → creation dialog → generated preview → explicit Edit → save/submit,
           with drafts editable from history.
```

- **Creation dialog**, two steps: which report, then over what period. Monthly
  takes a month plus an adjustable range (defaulting to the whole month, so a
  placement starting mid-month can report honestly); Final takes the placement's
  own dates. Months that already have a report are not offered.
- **Generated content is read-only.** It renders as structured bullet points
  under a lock note, with **Edit** beside **Save draft**. Editing is a deliberate
  act; the badge changes from "Generated preview" to "Editing".
- **A draft is editable from history** — "Continue editing" — which is the defect
  this rewrite exists to fix.
- Tabs: Monthly reports / Final report.

### Certificates

```
Previous → a "Preview certificate" button on both tracks producing a filename and
           a sentence; the FCT card shown to every member and disabled with an
           explanation of why it could not be used.
New      → eligibility decides visibility; requesting is the action.
```

- A certificate that does not apply is **absent**, not greyed out: a member with
  no placement has no FCT row at all.
- One function, `certificateEligibility`, decides what the page offers and what
  the service accepts, so the page cannot offer something the request refuses.
- No preview. Issued certificates appear in a list with kind, hours, issue date,
  signed state and a download action.

### Settings

- **Alerts** — six categories, each backed by a collection the portal already
  loads, governing the dashboard's attention list. The copy states there is no
  delivery mechanism rather than implying a message is sent.
- **Sidebar order** — move up/down with reset. Cosmetic and reversible by
  construction: the preference is a list of names applied over the canonical
  navigation, so it can reorder pages and cannot remove one.

---

## 3. Admin workflow changes

### Dashboard

- Chart and Snapshot are one row of equal height.
- **Weekly chart replaced.** It was hardcoded and a day-of-week aggregation; it
  is now hours per calendar week from the attendance collection, each bar a real
  consecutive week labelled by its Monday.
- **Pending corrections** now reads the unanswered request queue and **spans the
  page** — it is the only list here that is a to-do.
- **Internship progress moved under Device status**, closing the dead space, and
  now shows hours completed *against calendar elapsed*: either figure alone is
  meaningless, 40% of the hours being fine at 40% of the time and a problem at 85%.
- Snapshot gained "Reports to review".

### Cards

Registration is now: **select terminal → read/register card → assign or leave
unassigned**, in one dialog, because it is one act. The terminal is recorded on
the card (`registeredAtDeviceId`) and shown in the registry, which is what makes
a card's origin traceable and is the seam the device API needs. UID format is
validated; duplicates are refused; assignment keeps `member.assignedCardUid` in
step; `Unassign` returns a card to the inventory without retiring it.

### Internships

"Open" now opens a **details modal** over the row instead of loading a card
appended below the assignable-members list at the bottom of the page. It shows
status and dates, derived hours against the requirement *and* calendar elapsed,
the placement's people and notes, the **participation timeline that explains the
hours**, report status, and two actions. Hours are read-only, with the note that
they are summed from attendance and never entered by hand.

### Calendar (new page, `/admin/calendar`)

Deliberately not the student calendar with a wider query. The day panel leads
with roster-wide attendance; the grid's colour is the day's **worst** state
across the roster, because "was there a problem" is the operational signal.
Filters: visibility, type, project, author. Personal events are shown **labelled**
rather than hidden — an operational calendar that silently omits rows is worse
than one that says whose they are.

### Reports

Now leads with the two review queues it previously had no way to receive:
**Monthly reports** and **Final reports**, then Journal activity, Coverage,
Delivery, Exports. Each row shows member, school, period, content, status,
submission date and the actions its state permits. Approving or returning is a
dialog; returning **requires a note**, because work sent back without a reason
leaves the student nothing to act on.

### Announcements

```
Previous → "New announcement" opened a form whose Status defaulted to Draft, so
           the obvious path produced a notice nobody could see. Dismissing the
           dialog silently discarded the work.
New      → Publish is the primary action; closing distinguishes the two meanings.
```

- Primary button: **Publish announcement**. The dialog has **Publish** and **Save
  as draft**; `status` is decided by which button was pressed, not by a select the
  reader did not know mattered.
- Closing with nothing typed simply closes. Closing with unsaved text asks
  — *"Keep it as a draft, or discard it"* — so an accidental close is not a
  silent loss and an explicit cancel is not a silent record.
- Tabs: **Published / Drafts / Archived**, with state-appropriate actions only.

### Certificates

Three tabs, because there are three jobs:

- **Requests** — the queue; approving generates.
- **School profiles** — FCT templates belong to the school the intern is enrolled
  at (`School → Certificate profile → Template`), one profile per school rather
  than one per student. Requests whose school has no profile are named up front,
  with a shortcut to create it, instead of failing at approval time.
- **Surplus template** — ours, standardised, one document for everybody, still
  editable by an administrator.

### Devices

- **Fleet overview owns the row.** It was in a two-column grid with the details
  card as its sibling, so it sat at half width with the other half blank whenever
  nothing was selected. The detail panel now claims a column only when open.
- **Add device completes.** It collects the **IP address**, validated as IPv4 and
  refused when another terminal already answers on it. Previously the service
  filled in `0.0.0.0`, which the form never offered to change — every terminal
  added through the UI was unreachable by construction.
- A new terminal is recorded offline with a **null** last-heartbeat rather than a
  timestamp claiming it reported in.

### Audit logs

Project activity now reaches the trail through the existing `appendAuditLog`
helper, hooked into `recordActivity` so there is one funnel rather than a second
logging mechanism. **What is audited is a deliberate subset**: projects created,
updated, archived and restored; tasks created, assigned and archived; members
assigned and removed. Task status moves and field edits stay in the per-project
timeline — a page of "Moved X to In progress" would bury the entries somebody is
actually asked to produce. A project status change is named in the entry
("Status changed from Paused to Active") rather than folded into "updated".

### Users and permissions

The page already had Accounts / Roster access / Permissions tabs and already
showed every member. What was missing was configurable permissions.

- `UserSummary.permissions` is `AdminPermission[] | null` — null follows the role,
  an array is an explicit grant. The role stays the normal way to describe an
  account; the override is the escape hatch for the case a preset cannot express.
- The create/edit dialog has a permission editor: a toggle for "this account has
  its own list", then one toggle per permission, seeded from the role.
- The Accounts table shows the effective count and flags customised accounts; the
  Permissions tab lists role presets *and* every account that departs from its role.
- `effectivePermissions` is used by both the session gate and the display, so what
  the interface says and what it enforces cannot diverge.
- Last-login is formatted and labelled instead of printing a raw timestamp.

---

## 4. Lifecycle rules — as implemented

### Internship reports — `ReportStatus`

```
draft ──submit──▶ submitted ──approve──▶ approved
                      │
                      └──reject(note)──▶ rejected ──reopen──▶ draft
```

- **`draft` is editable and nothing else is.** Stated once in
  `reportIsEditable`; every surface asks it rather than testing the status.
- `submitted` is with the reviewer — the student sees "With the reviewer".
- `rejected` is *returned for revision*, not a dead end: revision is possible and
  the label says so. `reportCanBeReopened` gates it.
- Rejecting **requires** a note; the note survives reopening, because it is the
  instruction the student is working to.
- There is no `archived` for reports. It was not added because nothing archives
  them, and a state nothing produces is a label.

### Announcements — `AnnouncementStatus`

```
draft ──publish──▶ published ──archive──▶ archived
  ▲                    │
  └────edit────────────┘
```

- `draft` reaches nobody and is editable and deletable.
- `published` is visible to its audience; it can be edited or archived, **not
  deleted** — published notices are archived rather than removed.
- `archived` is out of circulation and **kept**; it is not deletion, and the tab
  copy says so.

### Certificates — `CertificateRequestStatus`

```
requested ──approve──▶ approved  (generates the document in the same step)
          └─reject───▶ rejected  (nothing is generated)
```

Eligibility is checked when requesting *and* when approving. One open request per
member per kind. `issuedCertificateId` is null on a rejection, so "approved" can
never imply a file exists.

### Profile changes — `ProfileChangeStatus`

```
pending ──approve──▶ approved  (writes the value onto the member record)
        ├─reject───▶ rejected
        └─withdraw─▶ withdrawn  (author only, while pending)
```

`appliedToRecord` is tracked separately from `status`, matching attendance
corrections: agreeing and having written are two different facts.

### Attendance corrections — unchanged

Left exactly as it was; the other three lifecycles were modelled on it.

---

## 5. UX decisions worth not undoing

- **The day panel is a panel, not a dialog.** A calendar is read by moving
  between days; a modal that must be dismissed before the next click turns that
  into a sequence of interruptions.
- **The internship details *are* a dialog**, because it is one record inspected
  from a row you want to return to. The previous card-at-the-bottom made "Open"
  look like it did nothing.
- **Tabs where a domain has lifecycle states or configuration areas** — Reports,
  Announcements, Certificates, Users. Not for unrelated features: the Reports
  tabs are all reporting, the Announcements tabs are one list in three states.
- **Eligibility decides visibility, not disabled state.** A disabled control with
  an explanation costs a reader a click to discover an absence. A certificate that
  does not apply to a member's participation has no row.
- **Generated content is inert until unlocked.** The balance is assembled from
  what the student already wrote; editable boxes invite rewriting the record of
  what happened without noticing.
- **Student project visibility** = projects where the member is owner or listed
  participant, **plus** any project holding a task assigned to them (being given
  work is itself a relationship; hiding it would leave a task with no context).
  Archived projects are excluded.
- **Calendar event visibility** = author / team / project participants. Three
  audiences because three relationships exist; anything finer would need an
  entity that does not.
- **Two progress figures, never one.** Project progress vs. the member's own
  share; internship hours vs. calendar elapsed. Each alone is misleading.
- **Badges sit on the page that resolves them** — the profile-change queue badges
  *Members*, because that is where those requests are reviewed.
- **Week-of-month and calendar-week, chosen per surface.** Where the page is
  scoped to a month (student dashboard), bars are weeks *of that month*. Where it
  is a rolling view (admin dashboard, Worked Hours), bars are calendar weeks
  labelled by their Monday. Neither is a day-of-week stack.

---

## 6. Architecture and data boundaries

### 6.1 New types

`calendarEvents.ts`, `profileChangeRequests.ts`, `studentPreferences.ts`;
extensions to `certificates.ts` (`CertificateRequest`,
`SchoolCertificateProfile`, `certificateEligibility`), `internshipReports.ts`
(`rejected` + review fields + `MonthlyReportSummary` / `FinalReportSummary` +
`reportIsEditable` / `reportCanBeReopened`), `cards.ts` (terminal provenance +
`validateCardRegistration`), `devices.ts` (`ipAddress` + `validateDevice`,
`lastHeartbeatAt` nullable), `users.ts` (`permissions`,
`effectivePermissions`, `hasCustomPermissions`).

### 6.2 New services / stores / components

- Services: `calendarEvents.service.ts`, `profileChangeRequests.service.ts`;
  `certificates.service.ts` reworked around requests and school profiles;
  `internshipReports.service.ts` gained the reviewer surface.
- Stores: `calendarEvents`, `profileChangeRequests`, `studentPreferences`;
  `certificates`, `internshipReports`, `cards`, `devices` extended.
- Components: `CalendarMonthGrid` and `CalendarEventDialog` (shared by both
  workspaces — one grid, not two kept in step), `ProfileChangeRequestDialog`,
  `ReportCreationDialog`, `InternshipDetailsDialog`.
- Utilities: `hoursByWeekOfMonth`, `hoursByCalendarWeek`. **`hoursByWeekday` was
  removed**, with a comment in its place recording why.

### 6.3 Backend contracts added

New sections in `docs/ai/BACKEND_CONTRACTS.md`: *Calendar events*, *Profile
change requests*, *Certificates — requests and per-school FCT profiles*,
*Internship report review*, *Student preferences*, *Card registration is a device
operation*, *Per-account permissions*. Each states what the server must enforce
rather than what the client currently checks.

The existing *The member's own calendar* section — "there is no calendar
resource" — was amended rather than contradicted: calendar **events** are a new
resource, but a day's attendance still comes from attendance and only from
attendance.

### 6.4 The participation architecture is unchanged

Confirmed explicitly, because it was the one thing this pass was not allowed to
weaken:

- `src/utils/participation.ts` and `src/services/participation.service.ts` were
  **not modified**. `resolvePeriodForDate` remains the only classification step.
- No new stored hour total. Nothing added assigns to `teamHours`,
  `completedHours`, `internshipHours` or `remainingHours`.
- No participation field was added to an attendance row, an event, a certificate
  request or a report.
- Every new surface that shows hours reads them through the existing derivation:
  the attendance cards and the student dashboard through
  `useParticipationStore`; certificates through `certificateEligibility`, which
  takes the derived buckets as inputs; the internship modal through the same
  `MemberParticipationHours` the timeline uses.
- **The two buckets are never combined** on any new surface. Where both appear
  they are separate cards with separate captions.
- Classification remains by `attendance.date`: nothing added consults a member's
  current status to decide a bucket.
- The derived figures were checked in the browser against the values §8 of this
  document records: Ana **73h30m team / 77h30m internship**, 32% of 240h. The
  student dashboard, attendance page, certificates page, worked-hours page and
  the admin internship modal all showed exactly those numbers.

The one extension: `FinalReport` gained `periodStart` / `periodEnd`. This is the
report's own reporting period — an FCT document names the period on its cover —
and it scopes which *journal entries* the report consolidates. It does not touch
hour accounting.

---

## 7. Verification actually performed

**Static**

- `npx vue-tsc --noEmit` → clean.
- `npm run build` → clean, 3.00s.
- `backend/`, `dev.hxml`, `global.hxml` untouched.

**Routes** — every route driven in the running app and checked for content:
19 admin + 13 student, all rendered. **No console errors** in either workspace on
a freshly started server.

**Student workflows driven end to end**

- Dashboard: attention list showed the real draft report, unread announcement and
  overdue task; hour figures matched the participation architecture.
- Calendar: selected 27 Aug → panel showed attendance (13:30–17:35, 4.08h,
  Terminal B), "no entry for this day" and the write action; the action landed on
  Daily Report with the date pre-filled as `2026-08-27`.
- Projects: three projects, per-project "your tasks done", project progress vs.
  own share, overdue task with an inline status control.
- Daily Report: created an August entry; totals moved 3 → 4 entries, 13.3 → 17.3h.
- Internship Reports: generated the August balance → **read-only bullets with the
  lock note** → **Edit** → editable, badge "Editing" → saved → appeared as a
  draft with "Continue editing"; submitting 2026-07 moved it to "Under review"
  with the actions replaced by "With the reviewer".
- Certificates: surplus offered ("You can request this"), FCT present but "Not
  yet" with the reason, requested → "Waiting for review" / "Already requested".
- Profile: requested a phone change → "Waiting for review", current → requested
  shown, button became "Requested", **and the record still displayed the old
  number**. Re-opening the dialog labelled the field "(already requested)".
- Settings: moved Certificates up two places and confirmed the **live sidebar**
  reordered with all 13 pages still present; reset restored the default.
- Attendance: cards showed "Internship since 15 Jul 2026", 73h30m team, 77h30m
  internship, 1 awaiting review.

**Admin workflows driven end to end**

- Dashboard: real weekly-calendar chart, corrections queue, badges.
- Cards: registered `0BC42F71` at Terminal A unassigned → success banner, totals
  2 → 3, terminal provenance in the row.
- Devices: Add device rejected `192.168.10.999` with the IPv4 message, accepted
  `192.168.10.55`, created Terminal C offline with "last seen —"; Fleet overview
  full width.
- Calendar: September showed the seeded events; 4 Sept panel listed the team
  meeting (time, visibility, author) and the task due with its assignee.
- Reports: monthly queue showed a draft as "Still a draft with the student" and
  the submitted one as reviewable; **rejecting with an empty note was refused**
  with "Say what needs changing"; with a note it returned the report.
- Announcements: three tabs; the dialog offered Publish / Save as draft with no
  status select; closing with unsaved text asked **"Keep it as a draft, or
  discard it"**.
- Certificates: three tabs, honest empty queue.
- Internships: "Open" showed the modal with 32% hours vs 35% elapsed, the derived
  hours note, placement details and the participation timeline.
- Users: effective permission counts, "customised" flag, permission editor
  matching the stored override, Permissions tab listing role presets and the one
  account that departs from its role.
- Audit: after changing a project's status, a new `project` entity appeared in the
  filter with "Lab inventory and documentation: Status changed from Paused to
  Active."

**Cross-workspace** — in a single session: student submitted → admin returned
with a note → the student's dashboard showed "2026-06 monthly report returned"
with that note → Internship Reports offered **"Reopen and revise"** → reopening
returned it to `draft` with the note preserved and "Continue editing" available.

---

## 8. Remaining limitations and next work

**Backend dependencies** (nothing below is a frontend gap)

1. **All authorization.** Unchanged from §6 of the participation audit and now
   wider: event visibility, report review, certificate approval, profile-change
   resolution and permission grants are all enforced by which page renders, which
   is not enforcement.
2. **Persistence.** Mock state resets on reload. This is visible during testing:
   a full page load restores the fixture.
3. **PDF generation.** `downloadUrl` is a path; no file exists behind it.
4. **Uploads** (profile pictures, templates, signed copies) are inline data URLs.
5. **Student preferences** are per browser, not per account.
6. **Card registration** still takes a typed UID; the terminal is recorded but
   does not yet supply it.

**Known limitations**

- Everything in §7 of the participation audit still applies unchanged.
- Calendar events have no recurrence and no attendees. Both were left out rather
  than half-built.
- The Reports **Exports** tab is unchanged and still produces mock download URLs.
- `PermissionMatrixRow` (the per-module Create/Read/Update/Delete/Export table on
  the Permissions tab) is still a static service fixture and is **not** connected
  to `AdminPermission`. The new per-account editor is the real control; that table
  is decorative and should either be wired to real module permissions or removed.
- The Members page hosts the profile-change queue. If those requests grow beyond
  a handful it wants its own tab rather than a card above the roster.

**Recommended next priorities**

1. Wire authorization server-side; until then no permission control on either
   workspace is a security boundary.
2. Resolve `PermissionMatrixRow` — it is the one place left where the interface
   shows a permission model that nothing checks.
3. Add `attendance:correct` and the new review permissions to `ROLE_PERMISSIONS`
   **together with** server enforcement, as the existing note in
   `BACKEND_CONTRACTS.md § Outstanding` requires.
4. Real file storage for certificates and profile pictures.

---

# Round two — student project management, and three smaller corrections

Follow-up pass after the review above, driven by direct feedback. It changes
what the student workspace *is* rather than only how it reads, so it is recorded
here as its own section rather than folded into §2.

---

## 1. Students get the project management system

### Sidebar

The student sidebar was flat. It now carries one group, matching the admin
shell:

```
Project management
  ├── Projects     /student/projects
  └── My tasks     /student/projects/tasks
```

Everything else stays flat. One group is the same judgement the admin sidebar
makes: project management is the single student area with more than a page
behind it, and a group per page would add a rank nobody needs.

`applySidebarOrder` behaved correctly through the change — a student who had
customised their order got the new group appended at the end rather than losing
it, which is the property that rule exists for.

### The board

```
Previous → students could see a task title with the project's name printed
           beside it as plain text. The Kanban board was administrator-only.
New      → the same board, with real permissions.
```

`/student/projects/detail/:projectId` is the project workspace, and the board is
the page:

- Five columns, drag-and-drop between them, an add button per column.
- **Create, edit and move** tasks. Assignment is limited to the people already
  on the project — offering the whole directory would let a student create work
  for somebody who is not involved.
- **Remove asks first.** A card is always one click from the pointer, so removal
  goes through a confirmation that also says what actually happens: the task is
  **archived, not deleted**, and staff can still find it. Same rule the admin
  workspace follows.
- Tabs: **Board | List | Activity**. List is the same tasks ordered by deadline
  with the member's own marked; Activity is the project's timeline.

### Access is refused, not filtered

`getMemberProjectDetail` throws when the member is not on the project, rather
than returning an empty board — an empty board is indistinguishable from a
project with no tasks, and would show somebody else's project shell.

A member belongs to a project by being its owner, being on its participant list,
**or holding a task on it**. That third case matters: being given work is itself
a relationship, and excluding it would leave a task on My tasks whose project
could not be opened. `memberCanAccessProject` states the rule once; the workspace
query and the detail query both use it.

Verified by hand-typing a project id the student is not on: the page answers
*"You are not on that project."*

**This is a correctness guard, not authorization** — it runs in the browser
against a client-supplied member id. See the backend contract.

### Density

```
Previous → My Projects showed the full detail of the selected project beside the
           list, so every project competed for the same screen and there was
           nowhere to put a board. My Work put each task's description,
           priority, deadline and a status select on one row.
New      → lists carry what ranks a row; everything else is in a dialog.
```

- **Projects** is a compact card grid: status, progress, your share, deadline.
- **My tasks** rows carry title, project, priority and deadline — and nothing
  else. Overdue rows get a red rail so lateness reads before the text does.
- **`TaskDetailDialog`** is the new shared surface: description, assignees,
  deadline, estimate, and an inline status select, with Edit and Remove. The
  board and My tasks open the same dialog, so a task looks the same wherever it
  is reached.
- Project description, owner, dates and team moved into a **Project details**
  dialog. While you are moving cards, that is not what you are reading.

### My Work is gone

Its content is **My tasks** inside the group. `/student/my-work` redirects, so
existing links survive. The dashboard's task alerts point at the new route.

---

## 2. The calendar is connected to the board

A task deadline on the calendar was a dead end — it told you something was due
and left you to find it. Deadline rows in the day panel are now buttons that
open that project's board, which is where the task can actually be moved.

Project events also appear on the project page ("Coming up on this project"), so
the board and the calendar are two views of one set of dates rather than two
lists that happen to agree.

---

## 3. Announcements: one at a time, and deliberately

```
Previous → expanding or collapsing a notice silently marked it read, and the
           only explicit control was "Mark all read".
New      → reading and marking are separate acts.
```

- Expanding and collapsing only change what is on screen. Unread notices still
  open by default, which is precisely why "expanded" must not mean "read".
- **"Mark as read" is a button on the notice it applies to.** One notice, marked
  because the member pressed it.
- **"Mark all read" was removed.** A member who opened the page to check one
  notice should not have the rest marked for them.

---

## 4. Architecture

**Service** — `memberCanAccessProject`, `getMemberProjectDetail`,
`saveMemberTask`, `moveMemberTaskStatus`, `archiveMemberTask`. Each re-checks
access; the mutations delegate to the existing `saveTask` / `updateTaskStatus` /
`archiveTask` rather than duplicating them, so student and staff changes write
the same records and the same activity entries.

**Store** — `memberProject`, `memberBoard`, `memberParticipants`,
`memberActivity` held apart from the admin slices (`selectedProject`, `board`),
because one workspace's reload must not clear the other's screen. Actions:
`loadMemberProject`, `refreshMemberProject`, `persistMemberTask`,
`moveMemberBoardTask`, `removeMemberTask`. `memberActor` is separate from
`actor`: the member id decides what may be touched, the account decides whose
name appears on the activity entry.

**Components** — `TaskDetailDialog` (new, shared); `TaskBoard`, `TaskBoardCard`
and `TaskFormDialog` reused unchanged, which is why the two workspaces cannot
drift apart visually.

**Participation accounting** — untouched again. Nothing in this round reads or
writes an hour figure.

---

## 5. Verification for this round

- `npx vue-tsc --noEmit` clean; `npm run build` clean.
- **19 admin + 13 student routes** rendered; **no console errors** in either
  workspace.
- Student board driven in the browser: opened a project; opened a card into the
  detail dialog; changed status from the dialog and watched the card move
  columns (In review 1 → 2); **removed** a task through the confirmation (5 → 4
  tasks, 20% → 25%, activity 5 → 6); **created** a task from a column's add
  button with the status pre-set to that column and only project members
  offered; **dragged** a card between columns via drag events (To do 1 → 0,
  In review 1 → 2).
- Access refusal confirmed by hand-typing a foreign project id.
- Calendar: 28 Aug day panel showed the overdue task; clicking it landed on
  `/student/projects/detail/prj-network` — "Block B network refresh".
- Announcements: expanding and collapsing left the notice unread (`1 unread`
  after toggling twice); "Mark as read" marked exactly that one ("Read just
  now", button gone, pill gone); no "Mark all read" button exists.
- Admin project workspace re-checked after the shared-service changes: all five
  project pages render and the admin board still shows 5 columns / 5 cards.

---

## 6. Still outstanding after this round

Everything in §8 above, plus:

- **Student write access is not authorized.** A student can now create, edit,
  move and archive tasks. The mock checks project membership; the server must
  check it.
  *Answered in round three:* a student may **not** edit a task belonging to
  somebody else. Editing and removing are limited to their own tasks unless they
  own or coordinate the project, and assignment to others is an owner /
  coordinator right. See round three § 1. It is still not authorized anywhere a
  caller cannot bypass.
- Board ordering within a column is not persisted on drop: a card moves columns,
  and its position inside the new column is whatever `order` the service assigns.
- The board has no drag-and-drop on touch. The native HTML drag API does not
  fire on touch devices; the status select in the task dialog is the fallback,
  and it is reachable everywhere the board is.

---

# Round three — permissions, layout, and two languages

## 1. A student cannot assign work to anybody else

The previous round left task assignment open: any member on a project could put a
task on any other member. That is now a per-project right, and the model is
stated once, in `src/types/projectPermissions.ts`.

`memberProjectRights(memberId, project, holdsTask)` resolves a relationship and
the rights that follow:

| Relationship | How it arises | Open | Create | Move any | Edit / remove | Assign others |
| --- | --- | --- | --- | --- | --- | --- |
| `owner` | `project.ownerId` | ✅ | ✅ | ✅ | any task | ✅ |
| `coordinator` | `project.coordinatorIds` (new) | ✅ | ✅ | ✅ | any task | ✅ |
| `participant` | on the participant list | ✅ | ✅ | ✅ | own only | ❌ |
| `assignee` | holds a task, nothing else | ✅ | ✅ | ✅ | own only | ❌ |
| `none` | — | ❌ | ❌ | ❌ | ❌ | ❌ |

Three decisions inside that table are worth not undoing:

- **Moving a card stays open to everyone on the project.** A board only its owner
  can move is a status report, not a board.
- **"Own task" means assigned to them *or* created by them** (`memberOwnsTask`),
  so a member can always finish what they started even after a reassignment.
- **The §6 open question from round two is answered.** A member may no longer
  edit an arbitrary task belonging to somebody else; they may edit their own, and
  an owner or coordinator may edit any. Task coordinators are the escape hatch
  that keeps a real project workable without granting everybody everything.

### The dialog changes shape, it does not grey out

`TaskFormDialog` takes `canAssignOthers` and `selfId` and renders **one of two
controls, never a disabled one**:

- with the right: the `ParticipantPicker`, limited to people on the project;
- without it: a single "assign this task to me" checkbox, plus a line naming any
  other assignees that are being kept.

A disabled picker would still tell a student the feature exists and still leave
them working out why it is grey. `TaskDetailDialog` follows the same rule with
separate `canMove` / `canEdit` / `canRemove` props.

### `resolveAssigneeIds` rewrites rather than rejects

Given a requested assignee list from a member who may not set one, it keeps the
assignees they are not allowed to change and adds or removes only themselves. A
member ticking themselves onto a task already assigned to two other people
cannot silently drop those two. Rejection is the right server behaviour;
reconciliation is the right behaviour for a form the UI just rendered.

### A real hole, closed

`useProjectsStore` called `updateTaskStatus` — the *staff* entry point — when a
student dragged a card. That skipped the project-membership check entirely and
recorded the change under the staff actor. It now goes through
`moveMemberTaskStatus` like every other member action.

### None of it is security

Every check above runs in the browser against a member id the browser supplied.
`docs/ai/BACKEND_CONTRACTS.md` § *Student project access* now carries the table
and an explicit list of what the API has to do. No mock service performs
authorization, and the frontend enforcement stops nobody with developer tools
open.

## 2. The layout, systematically

### The dashboard's empty space had one cause

`@media (max-width: 1280px)` collapsed `.metric-grid` to two columns — but a
viewport measurement is the wrong measurement. The content area is the window
minus a 264px sidebar, so on the most common laptop in the building the rule did
not fire and four cards were drawn 471px wide, each holding one short caption.

`.app-shell__main` is now a container (`container-type: inline-size`), and grids
respond to `@container page (…)` plus `repeat(auto-fit, minmax(…, 1fr))`.
Measured after: 4 columns at 1440px, 3 at 900px, 2 at 700px with the dashboard
grid collapsing to 1, no horizontal overflow at any width.

### A rhythm, not a set of margins

`--layout-gap-section`, `--layout-gap-grid`, `--layout-pad-card`,
`--layout-gap-card`, plus `--layout-metric-min` / `--layout-card-min` for the
collapse points. `docs/ai/UI_GUIDELINES.md` § *Layout* carries the table.

### Dialogs scroll their body

`.base-dialog` was the scroller, so the confirm button scrolled away with the
content: on the twelve-field member form at laptop height, "Save" was below the
fold. Header and footer are now `flex: none` and `.base-dialog__body` owns the
scroll. Verified at 900px and 620px viewport height.

### The topbar profile picture

The reported bug, and its actual cause: `.topbar__profile-trigger` had no
explicit height and no `overflow`, so the 32px avatar set the button's height
from the inside and spilled past its 1px lining, while the two icon buttons
beside it were sized by their own padding. Every topbar control now uses
`--topbar-control-height: 34px`; the trigger has `overflow: hidden`, a 260px cap
and an ellipsis on the name; the avatar is a new 26px `small` size. Measured, not
eyeballed: the avatar's box sits inside the trigger's on both axes and all four
controls report 34px.

## 3. Portuguese and English

Portuguese is the default and the reference language; English is the second
language and the fallback. The mechanism, the terminology decisions and the full
list of terms deliberately left untranslated live in `docs/ai/FRONTEND.md`
§ *Language and translation* — that is the authoritative record.

The two structural points worth repeating here, because both were bugs first:

- **Labels are functions, never constants.** A `Record<Status, string>` evaluates
  once at import and freezes whichever language was active then.
- **Stored and derived data carries keys, not text.** The dashboard metrics and
  activity strip are produced by a service and cached in a store; translated at
  fetch time they stayed in the old language while everything around them
  changed. They now carry `labelKey` / `titleKey` / `messageKey` + params.

## 4. Verification for this round

- `npx vue-tsc --noEmit` clean; `npm run build` clean.
- Both languages driven through all 19 admin routes and the student routes,
  scanning the rendered text for raw key paths and for the other language. Clean
  apart from the intentional terms.
- Locale parity checked mechanically — `en` and `pt` hold an identical key tree,
  and every key referenced in `src/` exists. A missing Portuguese key falls back
  to English silently, so only a check like this finds one.
- Language switch verified live (no reload) and verified to survive a full page
  reload via `localStorage`.
- Task dialog verified at both permission levels on two different projects: as a
  coordinator the picker renders; as a plain participant it is absent, replaced
  by the self-assign checkbox, with no disabled control anywhere in the dialog.
- Topbar and dialog geometry measured in the browser rather than judged by eye.
- Console clean across the sweep, which also surfaced a real defect:
  `BaseDialog`'s root is a `<Teleport>`, so every `class` a caller passed it was
  silently dropped. Attributes are now bound to the dialog box explicitly.

## 5. Still outstanding after this round

Everything in §8 and in round two's §6 that is not listed above as done, plus:

- **The permission model is frontend-only.** Round two's open question is
  answered as a product decision; it is still not enforced anywhere a caller
  cannot bypass.
- **Audit-log descriptions stay in the language they were written in.** They are
  stored text, and the entity and action columns beside them are translated, so a
  Portuguese reader sees a Portuguese row label next to an English sentence. The
  honest fix is for the API to record a structured event (verb + entity + params)
  the way `ProjectActivityEvent` now does, and to keep the free text only where a
  person actually wrote it.
- Actor names written into records at the time of writing (`"Administrator"`,
  `"Member"`, `"System"`) are stored values, not labels, and are not translated.
  They stop being a question when the API issues a real identity.

---

# Round four — attendance correction integrity, and a final regression pass

## 1. The classification authority was audited, not just re-stated

`src/utils/participation.ts`'s `summariseParticipation` is the one place an
attendance row is sorted into Team, Internship or Unclassified — by the row's
own `date`, against the participation periods covering it, never by today's
date and never by whichever period is currently open. This was already true
going into this round; what changed is that it was verified directly rather
than trusted from the earlier rounds' description:

- **The critical case**: corrected `att-1` (2026-06-01, inside a Team period
  that closed 2026-07-14) through the real "Correct record" dialog, changing
  its exit time. The member's Team total moved by exactly the new hour
  difference; the Internship total (a period that did not exist until
  2026-07-15) did not move at all. The correction never touches `date`, and
  classification is keyed off `date`, so this holds by construction — but
  construction is not the same as verification, and now both exist.
- Rejecting a pending correction request leaves the attendance row — and every
  total derived from it — byte-for-byte unchanged; confirmed by diffing the
  full hours object before and after.
- A report scoped to July alone still splits July across the Team period
  (ending July 14) and the Internship period (starting July 15) rather than
  collapsing the month into one bucket — the date range narrows what is
  *summed*, never what a day is classified *as*.
- The overlap rule correctly allows a same-day-adjacent transition (Team ends
  July 14, Internship starts July 15) and correctly refuses two periods that
  would both claim the same calendar day — verified against the two
  transitions already in the fixture (`stu-1001`, `stu-1003`).

No second classification path was found anywhere in `members.service.ts`,
`internships.service.ts`, `portal.service.ts`, `certificates.service.ts` or
`reports.service.ts` — all five call `computeParticipationHours` and none
cache or store a total.

## 2. One real defect: the admin's direct correction left `hours` stale

The correction-*request* review flow (`resolveCorrectionRequest`) already
recomputed `hours` from the corrected `entry`/`exit` and refused `exit <=
entry`. The admin's separate, request-free "Correct record" action
(`applyAttendanceCorrection`) did neither: it rewrote `entry`/`exit` and left
`hours` at whatever it was before, and accepted any time pair at all. A record
marked "corrected" could show an exit before its entry, or times that no
longer matched its own stored hour count — and that stale count is exactly
what every downstream total (member page, portal, certificates, reports) sums.

Fixed by giving both write paths the same arithmetic: `hoursBetween` moved out
of `attendanceCorrections.service.ts` into `src/utils/date.ts` and is now
imported by both `attendance.service.ts` and `attendanceCorrections.service.ts`,
so there is one implementation of "hours between two clock times," not two that
could quietly drift apart. `applyAttendanceCorrection` now validates
`exit > entry` and recomputes `hours` the same way its sibling always did.

Verified live: corrected 08:00–12:15 (4.25h) to 08:00–17:00 through the actual
dialog — the stored record now reads 9h, not the stale 4.25h, and the delta
landed entirely in the correct participation bucket. Verified the guard too:
submitting exit before entry through the same code path now throws the
existing `errors.exitBeforeEntry` message instead of silently accepting it.

See `docs/ai/BACKEND_CONTRACTS.md` § *Attendance correction requests* for the
endpoint contract this implies for the real API.

## 3. Final regression pass

Ran after every fix in this round and the two before it (task-assignment
permissions, the UX/spacing pass, the i18n pass):

- `npx vue-tsc --noEmit` — clean.
- `npm run build` — clean.
- Fresh tab, cleared storage: defaults to Portuguese with no stored preference,
  as designed.
- All 19 admin routes and all student routes swept from that fresh state, in
  both languages — no raw key paths, no leftover wrong-language text beyond the
  documented exceptions, browser console clean (errors and warnings both).
- Re-verified, not just assumed still working: the date-picker and
  settings-grid control-height fixes on the pages they touch; the dashboard
  activity strip's live language switch (round-tripped both directions, no
  reload); the student task dialog's permission split (picker present for a
  coordinator on one project, absent — replaced by the self-assign checkbox —
  for a plain participant on another); no horizontal overflow at 375px across
  the routes exercised; session persistence across a hard reload on both
  workspaces.
- No regressions found. The one defect found this round (§2) was pre-existing,
  not introduced by an earlier round's changes.

## 4. Still outstanding

Everything in round three's §5, plus:

- **The admin's direct correction path has no dedicated permission**, the same
  gap round three's audit found for the correction-*request* review queue:
  `attendance:correct` is described in `docs/ai/BACKEND_CONTRACTS.md` but not
  yet added to `AdminPermission`, so both attendance-correction surfaces are
  reachable by any admin-workspace role today.
- **Server-side hour aggregation is still a frontend concern.** The API
  contract in `docs/ai/BACKEND_CONTRACTS.md` § *Hours are derived* says the
  server should sum on read rather than ship every attendance row for the
  client to add up; the mock still does the latter because the fixture is a
  few hundred rows, not a real dataset.
