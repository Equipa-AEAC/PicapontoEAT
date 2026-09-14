import type { AttendanceDetails } from "../types/attendance";
import type {
  AttendanceCorrectionRequest,
  AttendanceCorrectionRequestSummary,
  CorrectionRequestFilters,
  CorrectionRequestFormValues,
  CorrectionResolutionValues,
} from "../types/attendanceCorrections";
import {
  KINDS_WITH_TIMES,
  MAX_CORRECTION_REASON_LENGTH,
  MIN_CORRECTION_REASON_LENGTH,
  hasOpenRequest,
} from "../types/attendanceCorrections";

import { appendAuditLog } from "./audit.service";
import { cloneRecord, mockRequest } from "./mockTransport";
import { mockDatabase } from "./mockDatabase";
import { t } from "../i18n";
import { hoursBetween } from "../utils/date";

/*
 * Attendance corrections.
 *
 * A member raises a request against one of their own attendance records; a
 * reviewer approves or rejects it. Approving may also rewrite the record, which
 * is a separate choice from agreeing with the member — a reviewer can accept
 * that something was wrong and fix it by hand, or accept it and change nothing.
 *
 * Every transition writes to the audit log, because "who decided this and when"
 * has to outlive the request itself.
 *
 * Backend swap point: replace each `mockRequest(...)` body with the matching
 * `httpClient` call. The shapes crossing this boundary are already the shapes an
 * API would return, so the UI above it does not change.
 *   GET    /attendance/corrections?status&memberId
 *   POST   /attendance/corrections
 *   POST   /attendance/corrections/:id/resolve
 *   POST   /attendance/corrections/:id/withdraw
 */

/** Who is acting. Supplied by the caller so the service never reads the session. */
export interface CorrectionActor {
  id: string;
  name: string;
}

function attendanceFor(attendanceId: string) {
  return mockDatabase.attendance.find((record) => record.id === attendanceId) ?? null;
}

function memberNameFor(memberId: string): string {
  return mockDatabase.members.find((member) => member.id === memberId)?.fullName ?? "Unknown member";
}

/**
 * Joins the record context onto a request.
 *
 * The record is looked up rather than copied at write time, so a request always
 * shows the attendance row as it stands now — including after a reviewer has
 * corrected it. `record*` fields go null if the row was deleted, which the UI
 * has to handle rather than pretend the request is still reviewable.
 */
function toSummary(request: AttendanceCorrectionRequest): AttendanceCorrectionRequestSummary {
  const record = attendanceFor(request.attendanceId);

  return {
    ...request,
    memberName: memberNameFor(request.memberId),
    recordDate: record?.date ?? null,
    recordEntry: record?.entry ?? null,
    recordExit: record?.exit ?? null,
    recordHours: record?.hours ?? null,
    recordDevice: record?.deviceName ?? null,
    recordStatus: record?.status ?? null,
  };
}

function newest(a: AttendanceCorrectionRequest, b: AttendanceCorrectionRequest) {
  return b.createdAt.localeCompare(a.createdAt);
}

/* ------------------------------------------------------------------ reading */

/** The reviewer's queue. Pending first, because that is the only actionable state. */
export async function listCorrectionRequests(
  filters: Partial<CorrectionRequestFilters> = {},
): Promise<AttendanceCorrectionRequestSummary[]> {
  return mockRequest(() => {
    const matching = mockDatabase.attendanceCorrectionRequests.filter((request) => {
      const matchesStatus = !filters.status || filters.status === "all" || request.status === filters.status;
      const matchesMember = !filters.memberId || filters.memberId === "all" || request.memberId === filters.memberId;

      return matchesStatus && matchesMember;
    });

    const ordered = [...matching].sort((first, second) => {
      if (first.status === "pending" && second.status !== "pending") return -1;
      if (second.status === "pending" && first.status !== "pending") return 1;

      return newest(first, second);
    });

    return cloneRecord(ordered.map(toSummary));
  });
}

/** Everything one member has raised, newest first. */
export async function listMemberCorrectionRequests(
  memberId: string,
): Promise<AttendanceCorrectionRequestSummary[]> {
  return mockRequest(() => {
    const mine = mockDatabase.attendanceCorrectionRequests
      .filter((request) => request.memberId === memberId)
      .sort(newest);

    return cloneRecord(mine.map(toSummary));
  });
}

/** Drives the reviewer's queue badge. Counted, not listed, so it stays cheap. */
export async function countPendingCorrectionRequests(): Promise<number> {
  return mockRequest(
    () => mockDatabase.attendanceCorrectionRequests.filter((request) => request.status === "pending").length,
    60,
  );
}

/* ------------------------------------------------------------------ writing */

function validate(values: CorrectionRequestFormValues): string | null {
  const reason = values.reason.trim();

  if (reason.length < MIN_CORRECTION_REASON_LENGTH) {
    return t("errors.correctionReasonTooShort", { count: MIN_CORRECTION_REASON_LENGTH });
  }

  if (reason.length > MAX_CORRECTION_REASON_LENGTH) {
    return t("errors.correctionReasonTooLong", { count: MAX_CORRECTION_REASON_LENGTH });
  }

  if (KINDS_WITH_TIMES.includes(values.kind) && !values.suggestedEntry && !values.suggestedExit) {
    return t("errors.correctionNeedsATime");
  }

  if (values.suggestedEntry && values.suggestedExit && values.suggestedExit <= values.suggestedEntry) {
    return t("errors.exitBeforeEntry");
  }

  return null;
}

/**
 * Raise a request against one of your own records.
 *
 * Throws rather than returning an error shape, matching every other write in the
 * codebase — the stores already funnel thrown errors into `errorMessage`.
 */
export async function submitCorrectionRequest(
  actor: CorrectionActor,
  values: CorrectionRequestFormValues,
): Promise<AttendanceCorrectionRequestSummary> {
  return mockRequest(() => {
    const record = attendanceFor(values.attendanceId);

    if (!record) {
      throw new Error(t("errors.attendanceGone"));
    }

    if (record.studentId !== actor.id) {
      throw new Error(t("errors.correctionOwnOnly"));
    }

    if (hasOpenRequest(mockDatabase.attendanceCorrectionRequests, values.attendanceId)) {
      throw new Error(t("errors.correctionAlreadyPending"));
    }

    const invalid = validate(values);

    if (invalid) {
      throw new Error(invalid);
    }

    const usesTimes = KINDS_WITH_TIMES.includes(values.kind);

    const created: AttendanceCorrectionRequest = {
      id: `acr-${mockDatabase.attendanceCorrectionRequests.length + 1}-${Date.now()}`,
      attendanceId: values.attendanceId,
      memberId: actor.id,
      kind: values.kind,
      reason: values.reason.trim(),
      suggestedEntry: usesTimes ? values.suggestedEntry || null : null,
      suggestedExit: usesTimes ? values.suggestedExit || null : null,
      status: "pending",
      createdAt: new Date().toISOString(),
      resolvedAt: null,
      resolvedBy: null,
      resolutionNote: null,
      appliedToRecord: false,
    };

    mockDatabase.attendanceCorrectionRequests.unshift(created);

    appendAuditLog({
      userName: actor.name,
      action: "CREATE",
      entity: "attendance-correction",
      description: `Correction requested for ${record.date}: ${values.reason.trim()}`,
      deviceName: "Student portal",
    });

    return cloneRecord(toSummary(created));
  });
}

/** A member can pull back their own request while nobody has acted on it. */
export async function withdrawCorrectionRequest(
  actor: CorrectionActor,
  requestId: string,
): Promise<AttendanceCorrectionRequestSummary> {
  return mockRequest(() => {
    const request = mockDatabase.attendanceCorrectionRequests.find((item) => item.id === requestId);

    if (!request) {
      throw new Error(t("errors.requestGone"));
    }

    if (request.memberId !== actor.id) {
      throw new Error(t("errors.withdrawOwnOnly"));
    }

    if (request.status !== "pending") {
      throw new Error(t("errors.requestReviewed"));
    }

    request.status = "withdrawn";
    request.resolvedAt = new Date().toISOString();
    request.resolvedBy = actor.name;

    appendAuditLog({
      userName: actor.name,
      action: "UPDATE",
      entity: "attendance-correction",
      description: "Withdrew their own correction request.",
      deviceName: "Student portal",
    });

    return cloneRecord(toSummary(request));
  });
}

/**
 * Close a request.
 *
 * Approving and rewriting the record are separate decisions. `applyCorrection`
 * rewrites entry/exit and recomputes hours, marks the row `corrected` and bumps
 * its correction count — the same end state the existing admin correction
 * dialog produces, reached through the request instead of around it.
 */
export async function resolveCorrectionRequest(
  actor: CorrectionActor,
  requestId: string,
  approve: boolean,
  values: CorrectionResolutionValues,
): Promise<AttendanceCorrectionRequestSummary> {
  return mockRequest(() => {
    const request = mockDatabase.attendanceCorrectionRequests.find((item) => item.id === requestId);

    if (!request) {
      throw new Error(t("errors.requestGone"));
    }

    if (request.status !== "pending") {
      throw new Error(t("errors.requestReviewed"));
    }

    if (!approve && values.note.trim().length === 0) {
      throw new Error(t("errors.rejectionNoteRequired"));
    }

    const record = attendanceFor(request.attendanceId);
    let applied = false;

    if (approve && values.applyCorrection) {
      if (!record) {
        throw new Error(t("errors.attendanceGoneForCorrection"));
      }

      const entry = values.entryTime || record.entry;
      const exit = values.exitTime || record.exit;

      if (entry && exit && exit <= entry) {
        throw new Error(t("errors.exitBeforeEntry"));
      }

      record.entry = entry;
      record.exit = exit;
      record.hours = entry && exit ? Number(hoursBetween(entry, exit).toFixed(2)) : record.hours;
      record.status = "corrected";
      record.corrections += 1;
      record.updatedBy = actor.name;
      record.updatedAt = new Date().toISOString();
      applied = true;
    }

    request.status = approve ? "approved" : "rejected";
    request.resolvedAt = new Date().toISOString();
    request.resolvedBy = actor.name;
    request.resolutionNote = values.note.trim() || null;
    request.appliedToRecord = applied;

    appendAuditLog({
      userName: actor.name,
      action: "UPDATE",
      entity: "attendance-correction",
      description: applied
        ? `Approved ${memberNameFor(request.memberId)}'s request and corrected the ${record?.date ?? "attendance"} record.`
        : `${approve ? "Approved" : "Rejected"} ${memberNameFor(request.memberId)}'s request without changing the record.`,
    });

    return cloneRecord(toSummary(request));
  });
}

/** Re-export so callers can narrow an updated record without a second import. */
export type { AttendanceDetails };
