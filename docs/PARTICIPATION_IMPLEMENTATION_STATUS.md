# Participation & hour accounting — implementation status

Authoritative status record for the Team Member → Intern accounting feature.

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
