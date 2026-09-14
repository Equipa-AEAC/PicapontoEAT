import type {
  ProfileChangeField,
  ProfileChangeFormValues,
  ProfileChangeRequest,
  ProfileChangeStatus,
} from "../types/profileChangeRequests";
import { validateProfileChange } from "../types/profileChangeRequests";
import { t } from "../i18n";
import { profileFieldLabel } from "../i18n/vocabulary";

/*
 * English field names for the audit trail.
 *
 * The audit log is a stored record in the project's development language, the
 * same rule the project timeline follows. Anything a *member* reads goes through
 * `t` instead — see the duplicate-request error below.
 */
const EN_FIELD: Record<ProfileChangeField, string> = {
  email: "email address",
  phone: "phone number",
  photo: "profile picture",
};

import { appendAuditLog } from "./audit.service";
import { cloneRecord, mockRequest } from "./mockTransport";
import { mockDatabase } from "./mockDatabase";

/*
 * Profile change requests.
 *
 * Modelled on `attendanceCorrections.service.ts` down to the vocabulary, because
 * it is the same workflow applied to a different record: a member states what is
 * wrong, a reviewer decides, and the authoritative row only moves when a reviewer
 * approves. Every transition writes to the audit log.
 *
 * Backend swap point:
 *   GET    /members/me/profile-requests
 *   POST   /members/me/profile-requests
 *   GET    /profile-requests?status
 *   POST   /profile-requests/:id/resolve
 *   POST   /profile-requests/:id/withdraw
 *
 * BACKEND CONTRACT: the member is taken from the session, never from the body,
 * and only a reviewer may resolve. A resolved request must not be resolvable a
 * second time. See docs/ai/BACKEND_CONTRACTS.md.
 */

export interface ProfileChangeActor {
  id: string;
  name: string;
}

function memberFor(memberId: string) {
  return mockDatabase.members.find((member) => member.id === memberId) ?? null;
}

/** What the member record currently holds for one requestable field. */
export function currentProfileValue(memberId: string, field: ProfileChangeField): string {
  const member = memberFor(memberId);

  if (!member) {
    return "";
  }

  if (field === "email") return member.email;
  if (field === "phone") return member.phone;

  return member.photoUrl ?? "";
}

function newest(a: ProfileChangeRequest, b: ProfileChangeRequest): number {
  return b.createdAt.localeCompare(a.createdAt);
}

/** One member's own requests, newest first. */
export async function listMemberProfileChangeRequests(memberId: string): Promise<ProfileChangeRequest[]> {
  return mockRequest(() =>
    cloneRecord(
      mockDatabase.profileChangeRequests.filter((request) => request.memberId === memberId).sort(newest),
    ),
  );
}

/** The reviewer's queue. `status` "all" returns every request. */
export async function listProfileChangeRequests(
  status: ProfileChangeStatus | "all" = "pending",
): Promise<ProfileChangeRequest[]> {
  return mockRequest(() =>
    cloneRecord(
      mockDatabase.profileChangeRequests
        .filter((request) => status === "all" || request.status === status)
        .sort(newest),
    ),
  );
}

export async function countPendingProfileChangeRequests(): Promise<number> {
  return mockRequest(
    () => mockDatabase.profileChangeRequests.filter((request) => request.status === "pending").length,
    60,
  );
}

/**
 * Raise a request.
 *
 * One open request per field: a second one would leave a reviewer choosing
 * between two answers to the same question with no way to tell which the member
 * still means.
 */
export async function submitProfileChangeRequest(
  memberId: string,
  values: ProfileChangeFormValues,
): Promise<ProfileChangeRequest> {
  return mockRequest(() => {
    const member = memberFor(memberId);

    if (!member) {
      throw new Error(t("errors.memberNotFound"));
    }

    const currentValue = currentProfileValue(memberId, values.field);
    const problem = validateProfileChange(values, currentValue);

    if (problem) {
      throw new Error(problem);
    }

    const alreadyOpen = mockDatabase.profileChangeRequests.some(
      (request) =>
        request.memberId === memberId && request.field === values.field && request.status === "pending",
    );

    if (alreadyOpen) {
      throw new Error(
        t("student.profile.duplicateRequest", { field: profileFieldLabel(values.field).toLocaleLowerCase() }),
      );
    }

    const created: ProfileChangeRequest = {
      id: `pcr-${mockDatabase.profileChangeRequests.length + 1}-${Date.now()}`,
      memberId,
      memberName: member.fullName,
      field: values.field,
      currentValue,
      requestedValue: values.requestedValue.trim(),
      reason: values.reason.trim(),
      status: "pending",
      createdAt: new Date().toISOString(),
      resolvedAt: null,
      resolvedBy: null,
      resolutionNote: "",
      appliedToRecord: false,
    };

    mockDatabase.profileChangeRequests.unshift(created);

    appendAuditLog({
      userName: member.fullName,
      action: "CREATE",
      entity: "profile-change-request",
      description: `${member.fullName} asked to change their ${EN_FIELD[values.field]}.`,
    });

    return cloneRecord(created);
  });
}

export async function withdrawProfileChangeRequest(
  requestId: string,
  memberId: string,
): Promise<ProfileChangeRequest> {
  return mockRequest(() => {
    const request = mockDatabase.profileChangeRequests.find((item) => item.id === requestId);

    if (!request) {
      throw new Error(t("errors.requestGone"));
    }

    if (request.memberId !== memberId) {
      throw new Error(t("errors.requestOtherMember"));
    }

    if (request.status !== "pending") {
      throw new Error(t("errors.requestAnswered"));
    }

    request.status = "withdrawn";
    request.resolvedAt = new Date().toISOString();
    request.resolvedBy = request.memberName;

    appendAuditLog({
      userName: request.memberName,
      action: "UPDATE",
      entity: "profile-change-request",
      description: `${request.memberName} withdrew their ${EN_FIELD[request.field]} request.`,
    });

    return cloneRecord(request);
  });
}

/**
 * Approve or reject.
 *
 * Approving writes the new value onto the member record — that is the whole
 * point of the workflow — and records that it did, so "approved" can never be
 * confused with "the record now says so".
 */
export async function resolveProfileChangeRequest(
  requestId: string,
  decision: "approved" | "rejected",
  note: string,
  reviewer: ProfileChangeActor,
): Promise<ProfileChangeRequest> {
  return mockRequest(() => {
    const request = mockDatabase.profileChangeRequests.find((item) => item.id === requestId);

    if (!request) {
      throw new Error(t("errors.requestGone"));
    }

    if (request.status !== "pending") {
      throw new Error(t("errors.requestAnswered"));
    }

    request.status = decision;
    request.resolvedAt = new Date().toISOString();
    request.resolvedBy = reviewer.name;
    request.resolutionNote = note.trim();

    if (decision === "approved") {
      const member = memberFor(request.memberId);

      if (member) {
        if (request.field === "email") member.email = request.requestedValue;
        if (request.field === "phone") member.phone = request.requestedValue;
        if (request.field === "photo") member.photoUrl = request.requestedValue;

        request.appliedToRecord = true;
      }
    }

    appendAuditLog({
      userName: reviewer.name,
      action: "UPDATE",
      entity: "profile-change-request",
      description:
        `${decision === "approved" ? "Approved" : "Rejected"} ${request.memberName}'s ` +
        `${EN_FIELD[request.field]} request` +
        `${request.appliedToRecord ? " and updated the member record" : ""}.`,
    });

    return cloneRecord(request);
  });
}
