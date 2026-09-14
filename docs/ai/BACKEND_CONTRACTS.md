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

### The admin's direct edit is a second write path with the same contract

`AdminAttendancePage.vue`'s "Correct record" action (`applyAttendanceCorrection`
in `src/services/attendance.service.ts`) rewrites a row directly, with no
correction request involved — a coordinator fixing an obvious terminal error
does not need a student to have flagged it first. It is a separate code path
from `resolveCorrectionRequest` above, but the same rules apply, and the mock
previously did not enforce them here: it accepted any `entry`/`exit` pair
(including exit before entry) and left the stored `hours` at its old value
instead of recomputing it from the new times, so a "corrected" record could show
times that did not match its own hour total. Both are now fixed client-side —
`exit` must be strictly after `entry`, and `hours` is derived from them via the
same `hoursBetween` helper the request-review path uses (moved to
`src/utils/date.ts` so the two paths cannot drift into two different answers for
the same arithmetic).

| Method | Path | Who | Notes |
| --- | --- | --- | --- |
| `PATCH` | `/attendance/:id/correct` | `attendance:correct` | Body: `entryTime`, `exitTime`, `reason`, `administratorNotes`. Recomputes `hours` server-side from the times it receives — never trusts a client-sent hour total. |

**Neither this endpoint nor `resolve` above changes `date`.** The row's
classification into Team / Internship / Unclassified is keyed off its original
attendance date (see *Participation periods* § *Hours are derived*), so a
correction made today to a June record must keep counting against whichever
participation period covered June — not today's period, and not whichever
period is currently open.

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

**This still holds.** Calendar *events* (below) are a separate resource and do
not change it: an event is a dated note, carries no hours, and is never counted
anywhere. The day a member worked still comes from attendance and only from
attendance.

---

## Calendar events

`src/types/calendarEvents.ts` · `src/services/calendarEvents.service.ts`

A dated note with a title and an audience. Deliberately not a scheduling system,
and deliberately never a source of hours — see the note above.

### Entity — `CalendarEvent`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | |
| `title`, `description` | string | |
| `date` | `YYYY-MM-DD` | Whole-day, like attendance. |
| `startTime`, `endTime` | `HH:MM` or null | Null for an all-day entry. |
| `category` | `session` / `meeting` / `deadline` / `other` | |
| `visibility` | `personal` / `team` / `project` | |
| `projectId` | string or null | Required when `visibility` is `project`. |
| `authorId`, `authorName` | string | Member id or user id; the two spaces do not collide. |
| `createdAt`, `updatedAt` | ISO timestamp | |

### Visibility — server-enforced

Three audiences, because three relationships exist. Anything finer needs a
sub-team entity that does not exist, and inventing one to back a dropdown gives
a permission model that describes nothing.

- `personal` — the author only.
- `team` — every Equipa Técnica member.
- `project` — the participants of `projectId`, plus its owner.

`memberCanSeeEvent` implements exactly this in the frontend, **as presentation**.
The API must resolve the member from the session, apply the same three rules
server-side, and refuse an event the caller may not see. A client asking for
another member's calendar must be refused, not filtered.

### Operations

| Method | Path | Who | Notes |
| --- | --- | --- | --- |
| `GET` | `/calendar/events?from&to` | the session's member | Only events the caller may see. |
| `GET` | `/calendar/events/all?from&to&visibility&category&projectId&authorId` | staff | The operational calendar. Personal events are returned **labelled**, not hidden. |
| `POST` | `/calendar/events` | any authenticated member | Author is the session, never the body. |
| `PATCH` | `/calendar/events/:id` | the author only | |
| `DELETE` | `/calendar/events/:id` | the author only | |

Only the author may edit or delete. The mock enforces this in
`saveCalendarEvent` / `deleteCalendarEvent`; the server must enforce it for real.
A shared event's create and delete are written to the audit trail; a personal one
is not, because it reached nobody.

---

## Profile change requests

`src/types/profileChangeRequests.ts` · `src/services/profileChangeRequests.service.ts`

The same shape as *Attendance correction requests* above, applied to identity
rather than to a day. A member states what is wrong, a reviewer decides, and the
member record only moves when a reviewer approves.

### Entity — `ProfileChangeRequest`

`field` is `email` / `phone` / `photo` — nothing academic, nothing derived.
`currentValue` is captured at request time so the reviewer sees both sides.
`status` is `pending` / `approved` / `rejected` / `withdrawn`.
`appliedToRecord` is separate from `status` for the same reason it is on an
attendance correction: "we agree" and "the record now says so" are two facts, and
collapsing them hides a failed write.

### Operations

| Method | Path | Who | Notes |
| --- | --- | --- | --- |
| `GET` | `/members/me/profile-requests` | the member | |
| `POST` | `/members/me/profile-requests` | the member | Member from the session, never the body. |
| `POST` | `/profile-requests/:id/withdraw` | the author, while `pending` | |
| `GET` | `/profile-requests?status` | staff | The review queue. |
| `POST` | `/profile-requests/:id/resolve` | staff | Approving writes the value onto the member record. |

### Rules — server-enforced

- One open request per member per field. A second leaves a reviewer with two
  answers to one question and no way to tell which the member still means.
- A resolved request cannot be resolved again.
- Approving `photo` must store the image properly; the mock keeps a data URL
  inline (see `uploads.service.ts`), which is a development convenience.
- Every transition is written to the audit trail.

---

## Certificates — requests, and per-school FCT profiles

`src/types/certificates.ts` · `src/services/certificates.service.ts`

Generation is the consequence of an approval, never a button on a roster row. A
certificate produced without a decision behind it is a document nobody agreed to.

### Requests

`CertificateRequest` moves `requested` → `approved` / `rejected`. Approving
generates the document in the same transaction and links it through
`issuedCertificateId`; a generation failure must reject the whole transition
rather than leaving a request approved and empty.

| Method | Path | Who | Notes |
| --- | --- | --- | --- |
| `GET` | `/members/me/certificate-requests` | the member | |
| `POST` | `/members/me/certificate-requests` | the member | Eligibility re-checked server-side. |
| `GET` | `/certificate-requests?status` | staff | |
| `POST` | `/certificate-requests/:id/resolve` | staff | Approving generates. |

**Eligibility must be re-derived on the server** from the participation periods,
not trusted from the client. `certificateEligibility` is the rule; the frontend
uses it to decide what to offer and the mock service uses it to decide what to
accept, and the API must use it to decide what to honour.

### School certificate profiles

FCT interns are not all enrolled here, and each school issues its own document.
The template therefore belongs to the **school**, not to the member:

```
School → Certificate profile → Template
```

One profile serves every intern from that school. Do not store a template per
student — that is the same file copied once per person, and it drifts.

`resolveTemplate` picks the profile matching the member's `originSchool` and
falls back to the shared FCT template when no profile exists yet, which is what
lets the workflow run before every partner school is configured. The
surplus-hours certificate has no equivalent: it is ours and is one document for
everybody.

| Method | Path | Who |
| --- | --- | --- |
| `GET`/`POST`/`PATCH`/`DELETE` | `/certificate-profiles[/:id]` | staff with `settings:update` |
| `PUT` | `/certificate-profiles/:id/template` | staff with `settings:update` |

**PDF generation is server work.** `downloadUrl` is a path the mock invents; no
file exists behind it.

---

## Internship report review

`src/types/internshipReports.ts` · `src/services/internshipReports.service.ts`

Monthly and final reports could reach `submitted` and stop, because nothing read
them. The lifecycle is now:

```
draft  →  submitted  →  approved
                    →  rejected  →  (student reopens)  →  draft
```

**A draft is editable and nothing else is.** `reportIsEditable` states it once;
every surface asks that function rather than testing the status itself.

| Method | Path | Who | Notes |
| --- | --- | --- | --- |
| `GET` | `/reports/monthly?status&memberId` | staff | Review queue. |
| `GET` | `/reports/final?status&memberId` | staff | Review queue. |
| `POST` | `/reports/monthly/:id/review` | staff | `{decision, note}`. |
| `POST` | `/reports/final/:memberId/review` | staff | `{decision, note}`. |
| `POST` | `/reports/monthly/:id/reopen` | the author, while `rejected` | Back to `draft`. |
| `POST` | `/reports/final/reopen` | the author, while `rejected` | Back to `draft`. |

### Rules — server-enforced

- Only a `submitted` report is reviewable; only a `rejected` one is reopenable.
- Rejecting requires a note. Returning work without saying why leaves the student
  nothing to act on, so the mock refuses it and the server must too.
- The reviewer identity comes from the session, never from the body.
- Reopening keeps `reviewNote`: it is the instruction the student is working to.

---

## Student preferences

`src/types/studentPreferences.ts` · `src/stores/studentPreferences.ts`

Alert categories and sidebar order, currently in `localStorage` — so they are per
**browser**, not per account, and signing in elsewhere starts from the defaults.

| Method | Path | Who |
| --- | --- | --- |
| `GET` | `/members/me/preferences` | the member |
| `PUT` | `/members/me/preferences` | the member |

Two properties worth preserving when this moves server-side:

- `sidebarOrder` is a list of **entry names**, applied over the canonical
  navigation by `applySidebarOrder`. Unknown names are dropped and missing ones
  appended, so a stored preference can reorder the sidebar but can never hide a
  page — including pages added in a later release.
- The alert categories decide what the portal **shows**, not what it sends. There
  is still no delivery mechanism, and the Settings copy says so. If real delivery
  is ever built, these become the subscription list rather than a display filter,
  and the copy has to change with it.

---

## Card registration is a device operation

`src/types/cards.ts` · `src/services/cards.service.ts`

A UID is not typed from memory: it is read off a card held against a reader, and
which reader did the reading is part of what happened. `RfidCardSummary` now
carries `registeredAtDeviceId` / `registeredAtDeviceName` / `registeredAt`, and
the registration dialog requires the terminal.

Today the UID is still typed and the terminal merely recorded alongside it. When
the device API exists, the terminal is what **supplies** the UID:

| Method | Path | Who | Notes |
| --- | --- | --- | --- |
| `POST` | `/devices/:id/read-card` | staff | Returns what the reader saw. |
| `POST` | `/cards` | staff | `{deviceId, uid, ownerId?}` — assignment optional. |

The shape already carries the terminal for this reason. Assigning during
registration and assigning later are the same operation with a different
`ownerId`, and both must keep `member.assignedCardUid` in step.

---

## Student project access

`src/services/projects.service.ts`

Students work the same Kanban board staff do. A member belongs to a project by
being its **owner**, being on its **participant list**, or holding a **task** on
it — that third case included because being given work is itself a relationship,
and excluding it would leave a task whose project could not be opened.

`memberCanAccessProject` states the rule once; `getMemberProjectWorkspace` (the
list) and `getMemberProjectDetail` (one board) both use it, so what a student
sees listed and what they may open cannot diverge.

| Method | Path | Who | Notes |
| --- | --- | --- | --- |
| `GET` | `/members/me/projects` | the member | The list plus their tasks. |
| `GET` | `/members/me/projects/:id` | the member, if on it | Project, board, participants, timeline. |
| `POST`/`PATCH` | `/members/me/tasks[/:id]` | the member, on a project they are on | |
| `POST` | `/members/me/tasks/:id/status` | same | |
| `POST` | `/members/me/tasks/:id/archive` | same | Archived, never deleted. |

### Rules — server-enforced

- **Refuse, do not filter.** `getMemberProjectDetail` throws for a project the
  member is not on. Returning an empty board would be indistinguishable from a
  project with no tasks and would show somebody else's project shell.
- Assignment is limited to people already on the project. Offering the whole
  directory would let a student create work for somebody uninvolved.
- Removal is **archiving**. A student must not be able to destroy a record.
- The member comes from the session. Every check below currently runs in the
  browser against a client-supplied member id — a correctness guard, not
  authorization.

### Per-project rights

`src/types/projectPermissions.ts` states the whole model once.
`memberProjectRights(memberId, project, holdsTask)` resolves a **relationship**
and the rights that follow from it. Both the service and the store call it; no
component decides anything for itself.

| Relationship | How it arises | Open | Create task | Move any task | Edit / remove | Assign others |
| --- | --- | --- | --- | --- | --- | --- |
| `owner` | `project.ownerId` | ✅ | ✅ | ✅ | any task | ✅ |
| `coordinator` | `project.coordinatorIds` | ✅ | ✅ | ✅ | any task | ✅ |
| `participant` | on the participant list | ✅ | ✅ | ✅ | own tasks only | ❌ |
| `assignee` | holds a task, not otherwise a member | ✅ | ✅ | ✅ | own tasks only | ❌ |
| `none` | — | ❌ | ❌ | ❌ | ❌ | ❌ |

"Own task" means **assigned to them or created by them** (`memberOwnsTask`), so a
member can always finish what they started even if somebody reassigns it.

Moving a card is open to everyone on the project on purpose: a board where only
the owner can move a card is a status report, not a board. Editing and removing
are not, because those change what the work *is*.

**Assignment is the rule the request was about.** A member with
`canAssignOthers: false` cannot put a task on somebody else. The server must
enforce it; the frontend enforces it twice, in two different ways, and neither is
security:

1. The dialog does not render a participant picker for them at all — it renders
   an "assign this to me" checkbox instead. Not a disabled picker: a disabled
   control still teaches the reader that the feature exists.
2. `resolveAssigneeIds` **rewrites rather than rejects**. Given a requested
   assignee list from somebody who may not set one, it keeps the existing
   assignees the member is not allowed to change and adds or removes only
   themselves. A member editing a task assigned to two other people can tick
   themselves on without silently wiping the other two, and cannot remove them.

The API must apply the same table on every `/members/me/tasks…` call, derive the
member from the session, and reject rather than rewrite — a rewrite is the right
behaviour for a UI reconciling a form it just rendered, and the wrong behaviour
for an endpoint receiving a payload it has no reason to trust.

### Authorization — none of this exists yet

Everything in this section is enforced by `projects.service.ts` running in the
browser, against a member id the browser supplied. It is a correctness guard that
keeps the UI coherent; it is **not** an authorization boundary, and it stops
anybody who is not using the developer tools. The API must, at minimum:

- resolve the member from the session and ignore any id in the payload;
- re-derive `memberProjectRights` server-side on every project and task write;
- reject an assignment naming anybody the caller may not assign, rather than
  quietly reducing it;
- return 403 (not an empty board) for a project the caller is not on.

---

## Per-account permissions

`src/types/users.ts`

`UserSummary.permissions` is `AdminPermission[] | null`: null means "follow the
role", an array is an explicit per-account grant. `effectivePermissions` resolves
the two, and both the session gate (`authStore.can`) and the Users page read that
one function so what the interface says somebody can do and what it lets them do
cannot diverge.

`AuthSession.staffPermissions` carries it. **The server decides it and the server
enforces it.** A permission list the client holds describes what the UI should
offer; it is never the thing that stops an action.

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
