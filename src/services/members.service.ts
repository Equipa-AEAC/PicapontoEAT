import type { PaginatedResponse } from "../types/api";
import type { MemberAttendanceHistoryFilters, MemberAttendanceHistoryItem, MemberDetails, MemberFilters, MemberFormValues, MemberInternshipSummary, MemberSummary, StoredMember } from "../types/members";

import { cloneRecord, mockRequest } from "./mockTransport";
import { mockDatabase } from "./mockDatabase";
import { isExternalSchool, SCHOOL_NAME } from "../shared/constants";
import { computeParticipationHours } from "./participation.service";

/**
 * Fill in a member's derived figures.
 *
 * `teamHours` and every internship field are not stored on the member any more:
 * hours are summed from the attendance inside the member's participation periods,
 * and the internship dates/requirement come from the internship record. Deriving
 * them here means the member page, the internship page and the student portal
 * cannot disagree, which they previously did after any progress edit.
 */
function withDerivedFigures(member: StoredMember): MemberDetails {
  const internship = mockDatabase.internships.find((item) => item.studentId === member.id) ?? null;
  const hours = computeParticipationHours(member.id);

  return {
    ...member,
    teamHours: hours.teamHours,
    internshipRequiredHours: internship?.requiredHours ?? 0,
    internshipCompletedHours: hours.internshipHours,
    internshipStartDate: internship?.startDate ?? null,
    internshipEndDate: internship?.endDate ?? null,
  };
}

export async function listMembers(filters: Partial<MemberFilters> = {}): Promise<PaginatedResponse<MemberSummary>> {
  return mockRequest(() => {
    const query = filters.query?.trim().toLowerCase() ?? "";
    const filteredItems = mockDatabase.members.filter((member) => {
      const matchesQuery =
        query.length === 0 ||
        [member.fullName, member.memberNumber, member.course, member.className, member.email, member.originSchool]
          .join(" ")
          .toLowerCase()
          .includes(query);
      const matchesStatus = !filters.status || filters.status === "all" || member.status === filters.status;
      const matchesCourse = !filters.course || filters.course === "all" || member.course === filters.course;
      const matchesYear = !filters.academicYear || filters.academicYear === "all" || member.academicYear === filters.academicYear;
      const matchesOrigin =
        !filters.origin || filters.origin === "all" || (filters.origin === "external" ? member.isExternal : !member.isExternal);

      return matchesQuery && matchesStatus && matchesCourse && matchesYear && matchesOrigin;
    });

    return {
      items: cloneRecord(filteredItems.map(withDerivedFigures)),
      page: 1,
      pageSize: filteredItems.length,
      total: filteredItems.length,
    };
  });
}

export async function getMemberById(memberId: string): Promise<MemberDetails | null> {
  return mockRequest(() => {
    const member = mockDatabase.members.find((item) => item.id === memberId);
    return member ? cloneRecord(withDerivedFigures(member)) : null;
  });
}

export async function saveMember(values: MemberFormValues, memberId?: string): Promise<MemberDetails> {
  return mockRequest(() => {
    if (memberId) {
      const currentMember = mockDatabase.members.find((member) => member.id === memberId);

      if (!currentMember) {
        throw new Error("Member not found.");
      }

      const originSchool = values.originSchool || SCHOOL_NAME;

      Object.assign(currentMember, {
        photoUrl: values.photoUrl || null,
        memberNumber: values.memberNumber,
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        originSchool,
        isExternal: isExternalSchool(originSchool),
        course: values.course,
        className: values.className,
        academicYear: values.academicYear,
        birthDate: values.birthDate,
        emergencyContact: values.emergencyContact,
        assignedCardUid: values.assignedCardUid || null,
        status: values.status,
        notes: values.notes,
      });

      return cloneRecord(withDerivedFigures(currentMember));
    }

    const originSchool = values.originSchool || SCHOOL_NAME;

    const createdMember: StoredMember = {
      id: `mem-${mockDatabase.members.length + 1001}`,
      photoUrl: values.photoUrl || null,
      memberNumber: values.memberNumber,
      fullName: values.fullName,
      email: values.email,
      phone: values.phone,
      originSchool,
      isExternal: isExternalSchool(originSchool),
      course: values.course,
      className: values.className,
      academicYear: values.academicYear,
      status: values.status,
      assignedCardUid: values.assignedCardUid || null,
      internshipStatus: "not-assigned",
      birthDate: values.birthDate,
      emergencyContact: values.emergencyContact,
      notes: values.notes,
      orientadorName: null,
    };

    mockDatabase.members.unshift(createdMember);

    /*
     * A new member starts with no participation period, so their attendance is
     * *unclassified* until staff record one. That is deliberate: guessing a start
     * date would silently credit hours to a period nobody agreed to.
     */
    return cloneRecord(withDerivedFigures(createdMember));
  });
}

export async function deleteMember(memberId: string): Promise<void> {
  await mockRequest(() => {
    mockDatabase.members = mockDatabase.members.filter((member) => member.id !== memberId);
  });
}

export async function assignMemberCard(memberId: string, cardUid: string): Promise<MemberDetails> {
  return mockRequest(() => {
    const member = mockDatabase.members.find((item) => item.id === memberId);

    if (!member) {
      throw new Error("Member not found.");
    }

    member.assignedCardUid = cardUid;
    return cloneRecord(withDerivedFigures(member));
  });
}

/**
 * One member's attendance, newest first.
 *
 * This used to read `mockDatabase.memberHistory`, a second hand-maintained copy
 * of the same days — so the member page and the attendance page could disagree
 * about what happened. It now projects the one attendance collection, which
 * means a correction applied on the attendance page shows up here immediately.
 *
 * BACKEND CONTRACT: this is a filtered read of the attendance collection scoped
 * to one member, not its own resource. See docs/ai/BACKEND_CONTRACTS.md.
 */
export async function listMemberAttendanceHistory(
  memberId: string,
  filters: MemberAttendanceHistoryFilters = {},
): Promise<MemberAttendanceHistoryItem[]> {
  return mockRequest(() =>
    cloneRecord(
      mockDatabase.attendance
        .filter((record) => {
          if (record.studentId !== memberId) {
            return false;
          }

          const matchesStatus = !filters.status || filters.status === "all" || record.status === filters.status;
          const matchesFrom = !filters.from || record.date >= filters.from;
          const matchesTo = !filters.to || record.date <= filters.to;

          return matchesStatus && matchesFrom && matchesTo;
        })
        .sort((first, second) => second.date.localeCompare(first.date))
        .map((record) => ({
          id: record.id,
          date: record.date,
          entry: record.entry ?? "—",
          exit: record.exit ?? "—",
          hours: record.hours ?? 0,
          deviceName: record.deviceName,
          // The history model has a narrower status set than attendance itself.
          status: record.status === "late" ? "present" : record.status,
        })),
    ),
  );
}

/**
 * The member's internship, as the member pages want it.
 *
 * Projected from the internship record rather than read from a second
 * per-member copy — that copy existed, held its own hour figures, and drifted
 * from the internship record the first time progress was edited.
 */
export async function getMemberInternship(memberId: string): Promise<MemberInternshipSummary | null> {
  return mockRequest(() => {
    const internship = mockDatabase.internships.find((item) => item.studentId === memberId);

    if (!internship) {
      return null;
    }

    const completedHours = computeParticipationHours(memberId).internshipHours;

    return cloneRecord({
      memberId,
      requiredHours: internship.requiredHours,
      completedHours,
      remainingHours: Math.max(internship.requiredHours - completedHours, 0),
      orientador: internship.orientador,
      monitor: internship.monitor,
      startDate: internship.startDate,
      endDate: internship.endDate,
      status: internship.status === "complete" ? "complete" : "in-progress",
    } as MemberInternshipSummary);
  });
}
