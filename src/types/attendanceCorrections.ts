import type { AttendanceStatus } from "./attendance";

/**
 * A member's request to have one of their attendance records fixed.
 *
 * This is deliberately its own entity rather than a note hanging off an
 * attendance row. It has a lifecycle somebody has to move it through, it is
 * raised by one person and resolved by another, and the decision has to survive
 * in the audit trail — none of which a comment field can carry.
 *
 * The stored record stays lean: it holds the member's own input and the
 * lifecycle, and nothing that already lives on the attendance row. Everything a
 * reviewer needs to see next to it is joined at read time into
 * `AttendanceCorrectionRequestSummary`.
 */
export type CorrectionRequestStatus = "pending" | "approved" | "rejected" | "withdrawn";

export const CORRECTION_STATUS_LABELS: Record<CorrectionRequestStatus, string> = {
  pending: "Waiting for review",
  approved: "Approved",
  rejected: "Not changed",
  withdrawn: "Withdrawn",
};

/**
 * What the member says is wrong. This is a small closed list on purpose: it is
 * what makes the queue triageable, and it is phrased the way a student would
 * describe the problem, not the way the correction is applied.
 */
export type CorrectionRequestKind =
  | "missing-entry"
  | "missing-exit"
  | "wrong-times"
  | "wrong-day"
  | "not-mine";

export const CORRECTION_KIND_LABELS: Record<CorrectionRequestKind, string> = {
  "missing-entry": "My check-in is missing",
  "missing-exit": "My check-out is missing",
  "wrong-times": "The times are wrong",
  "wrong-day": "I was not here on this day",
  "not-mine": "This is not my record",
};

/** Short form for tables, where the full sentence is too long to sit in a column. */
export const CORRECTION_KIND_SHORT: Record<CorrectionRequestKind, string> = {
  "missing-entry": "Missing check-in",
  "missing-exit": "Missing check-out",
  "wrong-times": "Wrong times",
  "wrong-day": "Not here that day",
  "not-mine": "Not my record",
};

export const CORRECTION_KIND_OPTIONS = (
  Object.keys(CORRECTION_KIND_LABELS) as CorrectionRequestKind[]
).map((value) => ({ label: CORRECTION_KIND_LABELS[value], value }));

/** Kinds where proposing corrected times is meaningful. */
export const KINDS_WITH_TIMES: CorrectionRequestKind[] = ["missing-entry", "missing-exit", "wrong-times"];

export const MIN_CORRECTION_REASON_LENGTH = 10;
export const MAX_CORRECTION_REASON_LENGTH = 400;

/** The stored record. */
export interface AttendanceCorrectionRequest {
  id: string;
  attendanceId: string;
  /** The member who raised it. Never the reviewer. */
  memberId: string;
  kind: CorrectionRequestKind;
  /** The member's own description, in their words. */
  reason: string;
  /** Times the member believes are correct. Null when the kind does not use them. */
  suggestedEntry: string | null;
  suggestedExit: string | null;
  status: CorrectionRequestStatus;
  createdAt: string;
  resolvedAt: string | null;
  /** Display name of the reviewer who closed it. */
  resolvedBy: string | null;
  /** Why the reviewer decided what they decided. Shown back to the member. */
  resolutionNote: string | null;
  /** True when approving the request actually rewrote the attendance record. */
  appliedToRecord: boolean;
}

/** The request plus the record context a reviewer needs, joined at read time. */
export interface AttendanceCorrectionRequestSummary extends AttendanceCorrectionRequest {
  memberName: string;
  /** Null when the underlying attendance record has since been deleted. */
  recordDate: string | null;
  recordEntry: string | null;
  recordExit: string | null;
  recordHours: number | null;
  recordDevice: string | null;
  recordStatus: AttendanceStatus | null;
}

export interface CorrectionRequestFormValues {
  attendanceId: string;
  kind: CorrectionRequestKind;
  reason: string;
  suggestedEntry: string;
  suggestedExit: string;
}

export interface CorrectionResolutionValues {
  /** Approving with `applyCorrection` rewrites the attendance row from the request. */
  applyCorrection: boolean;
  entryTime: string;
  exitTime: string;
  note: string;
}

export interface CorrectionRequestFilters {
  status: CorrectionRequestStatus | "all";
  memberId: string | "all";
}

/**
 * A member may not stack requests against the same record. One open question per
 * record keeps the queue honest and stops a disagreement turning into a thread.
 */
export function hasOpenRequest(
  requests: Pick<AttendanceCorrectionRequest, "attendanceId" | "status">[],
  attendanceId: string,
): boolean {
  return requests.some((request) => request.attendanceId === attendanceId && request.status === "pending");
}
