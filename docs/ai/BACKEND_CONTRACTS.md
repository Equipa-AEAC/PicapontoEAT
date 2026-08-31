# Backend contracts

What the Haxe API has to provide for the domains added after the mock layer was
written. The frontend already speaks these shapes: each service wraps its body in
`mockRequest(...)` and is otherwise the code that will call `httpClient`. Swapping
a service should not change anything above it.

Domains that predate this document (members, attendance, cards, devices,
internships, announcements, certificates, audit, journal, projects, moments)
follow the same pattern — their services carry the swap comment inline.

---

## Attendance correction requests

`src/types/attendanceCorrections.ts` · `src/services/attendanceCorrections.service.ts`

A member's request to have one of their own attendance records fixed. Modelled as
its own entity, not a field on the attendance row: it is raised by one person and
closed by another, it has a lifecycle, and the decision has to outlive the record
it changed.

### Entity

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Server-issued. |
| `attendanceId` | string | FK → attendance record. |
| `memberId` | string | FK → member. The requester, never the reviewer. |
| `kind` | enum | `missing-entry`, `missing-exit`, `wrong-times`, `wrong-day`, `not-mine`. |
| `reason` | string | The member's own words. 10–400 characters. |
| `suggestedEntry` | `HH:MM` \| null | Null unless `kind` is a times-related one. |
| `suggestedExit` | `HH:MM` \| null | As above. |
| `status` | enum | `pending`, `approved`, `rejected`, `withdrawn`. |
| `createdAt` | ISO datetime | Server-issued. |
| `resolvedAt` | ISO datetime \| null | |
| `resolvedBy` | string \| null | Display name of the reviewer. |
| `resolutionNote` | string \| null | Shown back to the member. |
| `appliedToRecord` | boolean | True when approving actually rewrote the record. |

The read model (`AttendanceCorrectionRequestSummary`) joins `memberName` and the
attendance row's `date`/`entry`/`exit`/`hours`/`deviceName`/`status`. **Join it,
do not denormalise it** — a reviewer must see the record as it stands now,
including after a correction, and the `record*` fields must go null if the
attendance row was deleted.

### Lifecycle

```
                  ┌──────────► withdrawn   (member, only while pending)
pending ──────────┤
                  ├──────────► approved    (reviewer; may rewrite the record)
                  └──────────► rejected    (reviewer; note required)
```

Terminal states are final. A member may hold **at most one `pending` request per
attendance record** — enforce server-side, not just in the UI.

### Operations

| Method | Path | Who | Notes |
| --- | --- | --- | --- |
| `GET` | `/attendance/corrections?status=&memberId=` | reviewer | Pending first, then newest. |
| `GET` | `/attendance/corrections/mine` | member | Own requests only. |
| `GET` | `/attendance/corrections/pending/count` | reviewer | Drives the sidebar badge; keep it cheap. |
| `POST` | `/attendance/corrections` | member | Body: `attendanceId`, `kind`, `reason`, `suggestedEntry?`, `suggestedExit?`. |
| `POST` | `/attendance/corrections/:id/withdraw` | member | Own, `pending` only. |
| `POST` | `/attendance/corrections/:id/resolve` | reviewer | Body: `approve`, `applyCorrection`, `entryTime`, `exitTime`, `note`. |

### Validation

Server-side, because the client copy mirrors these rather than owning them:

- `reason` trimmed length 10–400.
- A times-related `kind` requires at least one of `suggestedEntry` / `suggestedExit`.
- When both times are given, exit must be strictly after entry.
- `POST` is rejected unless `attendanceId` belongs to the calling member.
- `resolve` with `approve=false` requires a non-empty `note`.
- `resolve` on a non-`pending` request is a conflict, not a no-op.

### Permissions

Raising and withdrawing: the owning member. Resolving: a new
`attendance:correct` permission, held by `administrator` and `coordinator`
(`ROLE_PERMISSIONS` in `src/types/users.ts` is not yet extended — see
*Outstanding* below).

### Audit

Every transition writes an audit entry (`appendAuditLog` today, a server-side
trigger later) with entity `attendance-correction`:

- **CREATE** on submit, carrying the member's reason.
- **UPDATE** on withdraw, approve or reject, naming the reviewer and saying
  whether the record was rewritten.

Applying a correction must also update the attendance row itself: rewrite
`entry`/`exit`, recompute `hours`, set `status = corrected`, increment
`corrections`, and stamp `updatedBy`/`updatedAt`.

---

## Notifications

**There is no notification service, and this is deliberate.** The email, desktop,
recipients and quiet-hours settings were removed because nothing delivered them.

What exists instead is a count on the sidebar entry that resolves the work, read
from the same collection the page reads. Two are wired today: pending correction
requests on *Attendance*, and active moments on *Team moments*.

If real delivery is ever built, it needs, in this order:

1. An event log — what happened, to which entity, who should care.
2. Per-user subscriptions, replacing what the removed settings pretended to be.
3. A delivery worker, with retry and per-channel backoff.
4. A quiet-hours window applied at delivery, not at generation.

Do not reintroduce the settings UI before step 3 exists.

---

## Session identity

`src/modules/authentication/types/auth.ts` · `src/modules/authentication/stores/auth.ts`

`AuthUser.memberId` is the single seam through which every member-scoped read
resolves its subject. Nothing above the auth service names a member id: pages and
stores read `authStore.currentMemberId`, which returns `currentUser.memberId` or
null for a staff account with no roster record.

The mock fills it from a fixed account→member table
(`SEEDED_STUDENT_MEMBER_ID`). **This is a development convenience and not a
security boundary** — anyone can edit it in devtools, and the mock services do no
authorization at all.

The API must:

- issue `memberId` from the authenticated session, never accept it from the client;
- reject any request whose target record does not belong to the session's member,
  regardless of what the client sent;
- return null for staff accounts that are not on the roster, so the frontend's
  "no member ⇒ no member-scoped data" default stays correct.

When that lands, `SEEDED_STUDENT_MEMBER_ID` is deleted and nothing above the auth
service changes.

---

## Announcement read state

`src/types/announcements.ts` · `src/services/announcements.service.ts`

Read state belongs to the (member, announcement) pair, not to the announcement:
the same notice is unread for one person and read for another.

### Entity — `AnnouncementRead`

| Field | Type | Notes |
| --- | --- | --- |
| `memberId` | string | FK → member. From the session, not the body. |
| `announcementId` | string | FK → announcement. |
| `readAt` | ISO datetime | Server-set. |

Unique key on `(memberId, announcementId)`.

### Operations

| Method | Path | Who | Notes |
| --- | --- | --- | --- |
| `GET` | `/announcements/mine` | member | Published notices for the member's track, each with `readAt` (null when unread). |
| `POST` | `/announcements/:id/read` | member | **Idempotent** — re-opening a notice must not move `readAt`. |
| `GET` | `/announcements/mine/unread/count` | member | Drives the sidebar badge; keep it cheap. |

Audience filtering is server-side: a member must not receive a notice addressed to
the other participation track, even unread.

**Not in scope:** delivery. There is no email, push or digest, and none is
implied by this — see *Notifications* below.

---

## Attendance history and export

`listMemberAttendanceHistory` is a **filtered read of the attendance collection
scoped to one member**, not its own resource. It previously read a second
hand-maintained table (`mockDatabase.memberHistory`), which meant the member page
and the attendance page could disagree about the same day; that duplication is
gone and the projection is the only path.

| Method | Path | Who | Notes |
| --- | --- | --- | --- |
| `GET` | `/members/:id/attendance?from&to&status` | staff, or the member themselves | Inclusive `YYYY-MM-DD` bounds, either end optional. |

`AttendanceFilters.dateRange` is now honoured by the mock; the API must apply the
same inclusive semantics.

**Export is deliberately client-side.** The rows are already loaded and already
filtered, and building the CSV in the browser guarantees the file matches the
table it came from. If exports ever need to cover more than the loaded page — a
full year, all members — that becomes a server-side report with its own
permission, and `src/utils/csv.ts` stays for the on-screen case.

---

## The member's own calendar

There is **no calendar resource**. A month grid is a read of the attendance
collection scoped to one member and one month, and both the student calendar and
the dashboard strip project it.

`portalSummary.attendanceCalendar` used to be a third hand-maintained copy of
attendance days — seven fixed dates whose `absent` / `holiday` statuses were not
in `AttendanceStatus` at all — so the dashboard, the calendar and the attendance
page could disagree about the same day, and an applied correction reached only
one of them. It has been removed from the fixture and from `StudentPortalSummary`.

| Method | Path | Who | Notes |
| --- | --- | --- | --- |
| `GET` | `/members/:id/attendance?from&to` | the member themselves, or staff | The same endpoint the history table uses. A month is just a `from`/`to` pair. |

Do not add a `/calendar` endpoint that returns day/status pairs: it would
reintroduce exactly the duplication that was removed. The grid's statuses are
`AttendanceStatus` and nothing else.

---

## Audit log

`src/types/audit.ts` · `src/services/audit.service.ts`

| Method | Path | Who | Notes |
| --- | --- | --- | --- |
| `GET` | `/audit?query=&entity=&action=&userName=` | staff | The filtered read. Server-side filtering; the client sends the filters it holds. |
| `GET` | `/audit/facets` | staff | Distinct entities, actions and actors, for the filter dropdowns. |

The facets read matters: the dropdowns **must not** be derived from the filtered
result. Narrowing to `entity=device` would leave `device` as the only option and
no way back. The mock does this by holding a second unfiltered collection
(`auditStore.allEntries`); the API should expose the distinct values directly
rather than making the client fetch the whole log twice.

Export follows the same rule as attendance: it is the filtered view, built in the
browser. A full-history audit export is a server-side report with its own
permission — an audit trail is exactly the kind of thing that should not be
bulk-downloadable by anyone who can open the page.

Entries are **append-only**. Nothing in the UI edits or deletes one, and the API
must not offer a way to.

---

## Participation periods

**Implemented in the frontend and the mock. Not enforced anywhere.** The entity,
the resolver and the derived totals exist (`src/types/participation.ts`,
`src/utils/participation.ts`, `src/services/participation.service.ts`); what is
missing is a server that makes any of the rules below actually hold. Background in
`docs/ai/PROJECT_CONTEXT.md` §6–§8.

Read the split this way:

- **frontend/mock** — the shapes, the classification rule, the derived totals, and
  form-level validation. Convenient, and trivially bypassed.
- **eventual server** — every rule marked *enforced* below. The mock performs **no
  authorization at all**, so assume each endpoint will be called directly by
  someone who should not be allowed to.

A member's participation changes over time while their identity does not.

### Entity — `ParticipationPeriod`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Server-issued. |
| `memberId` | string | FK → member. Never changes when participation does. |
| `kind` | enum | `team-member`, `internship`. Mirrors `PlacementProgram`. |
| `startDate` | `YYYY-MM-DD` | Inclusive. |
| `endDate` | `YYYY-MM-DD` \| null | Inclusive. Null means current. |
| `internshipId` | string \| null | FK → internship. Required when `kind` is `internship`, null otherwise. |
| `note` | string | Why the transition happened. |

### Rules — server-enforced, not client-enforced

- Periods for one member **must not overlap**, and at most one may have
  `endDate: null`.
- Periods are **whole-day and half-open at neither end**: a day belongs entirely
  to the period whose range contains its date. Attendance stores one row per
  member per day and cannot express a split day, so a mid-day transition takes
  effect from the following whole day. Do not invent sub-day boundaries.
- A member may have **any number** of periods in any order — `team-member →
  internship → team-member` and multiple internship periods must both be
  representable. A single permanent flag is not sufficient.
- Attendance is classified by **the period containing the record's `date`**,
  never by the member's current participation. Closing or opening a period must
  not reclassify any existing attendance.
- A correction applied to an old record keeps that record's original
  classification — the bucket follows the record's date, not the date the
  correction was resolved, and not the reviewer's context.
- A day covered by **no** period is `unclassified`. Return it as such; do not
  silently attribute it to either bucket.

### Operations

| Method | Path | Who | Notes |
| --- | --- | --- | --- |
| `GET` | `/members/:id/participation` | staff, or the member themselves | Ordered by `startDate`. |
| `POST` | `/members/:id/participation` | staff | Opening a period closes the current one the day before, atomically. |
| `PATCH` | `/participation/:id` | staff | Overlap re-checked against every other period for the member. |
| `GET` | `/members/:id/hours` | staff, or the member themselves | Hours grouped by period: `{periodId, kind, startDate, endDate, hours}`, plus an `unclassified` bucket. |

### Hours are derived — keep them that way

`member.teamHours` and `internship.completedHours` are **no longer stored**. They
are summed from the attendance inside the member's periods, on read. The four
stored copies of internship hours that used to drift apart are gone.

The API must not reintroduce them as writable fields. Specifically:

- There is **no endpoint that sets an hour total.** Hours change only because
  attendance changed.
- `POST /internships/:id/progress` accepts **status and notes only**. It used to
  take an hour increment; that is what produced totals reconciling with nothing.
- `requiredHours` stays stored. It is a school rule, not a sum of scans.

`GET /members/:id/hours` should aggregate server-side rather than shipping every
attendance row for the client to sum — the frontend recomputes on read because the
fixture is 104 rows, which is not a strategy that survives a real dataset.

### Authorization — none of this exists yet

Every rule above is currently enforced by nothing. The API must, at minimum:

- reject participation writes from anyone without the staff permission to make
  them (a new `participation:manage`, alongside the still-unimplemented
  `attendance:correct`);
- scope `GET /members/:id/participation` and `/hours` to the session's own member
  unless the caller is staff;
- validate overlap, ownership and the whole-day rule server-side, ignoring
  whatever the client believed.

---

## Outstanding

Known gaps to close before or alongside the API work:

- `attendance:correct` is described above but not yet in `AdminPermission` /
  `ROLE_PERMISSIONS`. The review UI is currently reachable by any admin-workspace
  role. Add the permission and gate `CorrectionReviewQueue` on it.
- Member identity now resolves through `authStore.currentMemberId` rather than a
  constant (see *Session identity* above), so the frontend is ready for a real
  session. The value itself is still supplied by the mock and is not trustworthy
  until the API issues it.
- Journal obligation (`journalObligationFor`) is derived from internship status
  at read time. If the school ever wants per-member exemptions it becomes stored
  state, and this derivation becomes the default rather than the rule.
- No mock service performs any authorization. Every ownership rule described in
  this document is currently enforced only by which page the frontend renders,
  which is not enforcement. Assume every endpoint will be called directly.
