import { t } from "../i18n";

/**
 * Requests to change controlled identity information.
 *
 * The Profile page was read-only and said so honestly: the school owns the
 * roster, and a student cannot edit their own record. That is still true — what
 * was missing is the other half of the sentence. A member whose phone number
 * changed had nowhere to say so, and the correction had to start as a
 * conversation somewhere outside the system, exactly like attendance before
 * `AttendanceCorrectionRequest` existed.
 *
 * This is deliberately the same shape as that workflow, for the same reason: the
 * member states what they believe is wrong, staff decide, and the authoritative
 * record only moves when somebody with the authority says so. Nothing here
 * writes to a member record on its own.
 */

/** The fields a member may ask to have changed. Nothing academic, nothing derived. */
export type ProfileChangeField = "email" | "phone" | "photo";

/*
 * Names and hints live in `i18n/student.ts` under `student.profile`. Only the
 * order is a product decision, so only the order stays here.
 */
export const PROFILE_CHANGE_FIELDS: ProfileChangeField[] = ["email", "phone", "photo"];

/**
 * Lifecycle. Mirrors `AttendanceCorrectionStatus` rather than inventing a second
 * vocabulary for the same idea — a member asks, a reviewer answers, and the
 * member may take the question back before anybody has.
 */
export type ProfileChangeStatus = "pending" | "approved" | "rejected" | "withdrawn";

export const PROFILE_CHANGE_STATUS_TONES: Record<ProfileChangeStatus, "info" | "success" | "danger" | "warning"> = {
  pending: "info",
  approved: "success",
  rejected: "danger",
  withdrawn: "warning",
};

export interface ProfileChangeRequest {
  id: string;
  memberId: string;
  memberName: string;
  field: ProfileChangeField;
  /** What the record held when the request was raised, kept so the reviewer sees both. */
  currentValue: string;
  /** For `photo` this is the uploaded data URL; for the others, the new text. */
  requestedValue: string;
  reason: string;
  status: ProfileChangeStatus;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionNote: string;
  /**
   * Whether approving actually wrote the new value onto the member record.
   *
   * Separate from `status` for the same reason `appliedToRecord` is separate on
   * an attendance correction: "we agree with you" and "the record now says so"
   * are two different facts, and collapsing them hides a failed write.
   */
  appliedToRecord: boolean;
}

export interface ProfileChangeFormValues {
  field: ProfileChangeField;
  requestedValue: string;
  reason: string;
}

/** Why a request cannot be submitted, or null when it can. Pure; shared by dialog and service. */
export function validateProfileChange(
  values: ProfileChangeFormValues,
  currentValue: string,
): string | null {
  const requested = values.requestedValue.trim();

  if (!requested) {
    return values.field === "photo"
      ? t("errors.chooseImage")
      : t("errors.valueRequired");
  }

  if (values.field !== "photo" && requested === currentValue.trim()) {
    return t("errors.valueUnchanged");
  }

  if (values.field === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requested)) {
    return t("common.validation.invalidEmail");
  }

  if (values.field === "phone" && requested.replace(/[^0-9]/g, "").length < 6) {
    return t("errors.phoneRequired");
  }

  if (!values.reason.trim()) {
    return t("errors.changeReasonRequired");
  }

  return null;
}
