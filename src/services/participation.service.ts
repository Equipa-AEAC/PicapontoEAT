import type {
  MemberParticipationHours,
  ParticipationPeriod,
  ParticipationPeriodFormValues,
} from "../types/participation";

import { cloneRecord, mockRequest } from "./mockTransport";
import { mockDatabase } from "./mockDatabase";
import { appendAuditLog } from "./audit.service";
import { resolvePeriodForDate, sortPeriods, summariseParticipation, validatePeriod } from "../utils/participation";

/*
 * Participation periods, and the hours derived from them.
 *
 * This is the only place in the application that turns attendance into a team or
 * internship hour total. Everything else — the member page, Worked Hours,
 * certificates, reports, the student dashboard — asks this service, so there is
 * one answer to "how many hours does this member have" rather than four stored
 * numbers that drift apart.
 *
 * BACKEND CONTRACT: overlap, ownership and the whole-day boundary rule must be
 * enforced server-side. The checks below are a convenience for the person filling
 * the form; the mock performs no authorization at all. See
 * docs/ai/BACKEND_CONTRACTS.md § Participation periods.
 */

/** Oldest first. */
export async function listParticipationPeriods(memberId: string): Promise<ParticipationPeriod[]> {
  return mockRequest(() =>
    cloneRecord(sortPeriods(mockDatabase.participationPeriods.filter((p) => p.memberId === memberId))),
  );
}

/**
 * A member's hours, split by the participation that applied on each day.
 *
 * Reads the canonical attendance collection directly. Because it re-derives on
 * every call, an approved correction that rewrites a record's `hours` is picked
 * up with no second write and no cache to invalidate — and it lands in the
 * bucket the record's *date* belongs to, not the member's current status.
 */
export async function getParticipationHours(memberId: string): Promise<MemberParticipationHours> {
  return mockRequest(() => cloneRecord(computeParticipationHours(memberId)));
}

/**
 * The synchronous core, for services that already run inside a `mockRequest`.
 *
 * Exported so `members`, `internships` and `portal` can derive their hour fields
 * without nesting one simulated request inside another.
 */
export function computeParticipationHours(
  memberId: string,
  dateRange: [string | null, string | null] = [null, null],
): MemberParticipationHours {
  const periods = mockDatabase.participationPeriods.filter((period) => period.memberId === memberId);
  const [from, to] = dateRange;

  /*
   * The range narrows which attendance is counted; it never changes which period
   * a day belongs to. Asking for July alone still splits July across the periods
   * that covered it.
   */
  const rows = mockDatabase.attendance.filter(
    (row) => row.studentId === memberId && (!from || row.date >= from) && (!to || row.date <= to),
  );

  return summariseParticipation(memberId, periods, rows);
}

/**
 * Which participation one attendance record counted under.
 *
 * Answers the question a reviewer asks when a total looks wrong — "why is this
 * day team time?" — from the same resolver every total uses, so the explanation
 * and the arithmetic can never disagree. Null means no period covered that day.
 */
export async function classifyAttendanceDate(
  memberId: string,
  date: string,
): Promise<ParticipationPeriod | null> {
  return mockRequest(() => {
    const periods = sortPeriods(mockDatabase.participationPeriods.filter((p) => p.memberId === memberId));
    return cloneRecord(resolvePeriodForDate(periods, date));
  });
}

/** Team-member hours only. Never mixed with internship hours. */
export function computeTeamHours(memberId: string): number {
  return computeParticipationHours(memberId).teamHours;
}

/** Internship hours only. This is what the FCT requirement is measured against. */
export function computeInternshipHours(memberId: string): number {
  return computeParticipationHours(memberId).internshipHours;
}

function toPeriod(
  values: ParticipationPeriodFormValues,
  memberId: string,
  id: string,
): ParticipationPeriod {
  return {
    id,
    memberId,
    kind: values.kind,
    startDate: values.startDate,
    endDate: values.endDate || null,
    internshipId: values.kind === "internship" ? values.internshipId || null : null,
    note: values.note.trim(),
  };
}

/**
 * Create or update a period.
 *
 * Validation runs against the member's other periods, so a period can be edited
 * without colliding with itself.
 */
export async function saveParticipationPeriod(
  memberId: string,
  values: ParticipationPeriodFormValues,
  periodId?: string,
): Promise<ParticipationPeriod> {
  return mockRequest(() => {
    const member = mockDatabase.members.find((item) => item.id === memberId);

    if (!member) {
      throw new Error("Member not found.");
    }

    const existing = mockDatabase.participationPeriods.filter((p) => p.memberId === memberId);
    const candidate = toPeriod(values, memberId, periodId ?? `pp-${mockDatabase.participationPeriods.length + 1}`);

    if (candidate.kind === "internship" && candidate.internshipId) {
      const internship = mockDatabase.internships.find((item) => item.id === candidate.internshipId);

      if (!internship) {
        throw new Error("That internship does not exist.");
      }

      if (internship.studentId !== memberId) {
        throw new Error("That internship belongs to a different member.");
      }
    }

    const problem = validatePeriod(existing, candidate);

    if (problem) {
      throw new Error(problem);
    }

    const index = mockDatabase.participationPeriods.findIndex((p) => p.id === candidate.id);

    if (index >= 0) {
      mockDatabase.participationPeriods.splice(index, 1, candidate);
    } else {
      mockDatabase.participationPeriods.push(candidate);
    }

    appendAuditLog({
      userName: "Administrator",
      action: index >= 0 ? "UPDATE" : "CREATE",
      entity: "participation-period",
      description:
        `${member.fullName}: ${candidate.kind === "internship" ? "Internship" : "Technical Team"} ` +
        `${candidate.startDate} to ${candidate.endDate ?? "present"}.`,
    });

    return cloneRecord(candidate);
  });
}

export async function deleteParticipationPeriod(periodId: string): Promise<void> {
  return mockRequest(() => {
    const index = mockDatabase.participationPeriods.findIndex((period) => period.id === periodId);

    if (index < 0) {
      throw new Error("Participation period not found.");
    }

    const [removed] = mockDatabase.participationPeriods.splice(index, 1);
    const member = mockDatabase.members.find((item) => item.id === removed.memberId);

    appendAuditLog({
      userName: "Administrator",
      action: "DELETE",
      entity: "participation-period",
      description:
        `${member?.fullName ?? removed.memberId}: removed ${removed.startDate} to ` +
        `${removed.endDate ?? "present"}. Attendance in that range is now unclassified.`,
    });
  });
}
