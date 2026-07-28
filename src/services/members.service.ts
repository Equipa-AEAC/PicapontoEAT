import type { PaginatedResponse } from "../types/api";
import type { MemberAttendanceHistoryItem, MemberDetails, MemberFilters, MemberFormValues, MemberInternshipSummary, MemberSummary } from "../types/members";

import { cloneRecord, mockRequest } from "./mockTransport";
import { mockDatabase } from "./mockDatabase";

export async function listMembers(filters: Partial<MemberFilters> = {}): Promise<PaginatedResponse<MemberSummary>> {
  return mockRequest(() => {
    const query = filters.query?.trim().toLowerCase() ?? "";
    const filteredItems = mockDatabase.members.filter((member) => {
      const matchesQuery =
        query.length === 0 ||
        [member.fullName, member.memberNumber, member.course, member.className, member.email].join(" ").toLowerCase().includes(query);
      const matchesStatus = !filters.status || filters.status === "all" || member.status === filters.status;
      const matchesCourse = !filters.course || filters.course === "all" || member.course === filters.course;
      const matchesYear = !filters.academicYear || filters.academicYear === "all" || member.academicYear === filters.academicYear;

      return matchesQuery && matchesStatus && matchesCourse && matchesYear;
    });

    return {
      items: cloneRecord(filteredItems),
      page: 1,
      pageSize: filteredItems.length,
      total: filteredItems.length,
    };
  });
}

export async function getMemberById(memberId: string): Promise<MemberDetails | null> {
  return mockRequest(() => cloneRecord(mockDatabase.members.find((member) => member.id === memberId) ?? null));
}

export async function saveMember(values: MemberFormValues, memberId?: string): Promise<MemberDetails> {
  return mockRequest(() => {
    if (memberId) {
      const currentMember = mockDatabase.members.find((member) => member.id === memberId);

      if (!currentMember) {
        throw new Error("Member not found.");
      }

      Object.assign(currentMember, {
        photoUrl: values.photoUrl || null,
        memberNumber: values.memberNumber,
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        course: values.course,
        className: values.className,
        academicYear: values.academicYear,
        birthDate: values.birthDate,
        emergencyContact: values.emergencyContact,
        assignedCardUid: values.assignedCardUid || null,
        status: values.status,
        notes: values.notes,
      });

      return cloneRecord(currentMember);
    }

    const createdMember: MemberDetails = {
      id: `mem-${mockDatabase.members.length + 1001}`,
      photoUrl: values.photoUrl || null,
      memberNumber: values.memberNumber,
      fullName: values.fullName,
      email: values.email,
      phone: values.phone,
      course: values.course,
      className: values.className,
      academicYear: values.academicYear,
      status: values.status,
      assignedCardUid: values.assignedCardUid || null,
      internshipStatus: "not-assigned",
      accumulatedHours: 0,
      birthDate: values.birthDate,
      emergencyContact: values.emergencyContact,
      notes: values.notes,
      supervisorName: null,
      internshipRequiredHours: 0,
      internshipCompletedHours: 0,
      internshipStartDate: null,
      internshipEndDate: null,
    };

    mockDatabase.members.unshift(createdMember);
    return cloneRecord(createdMember);
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
    return cloneRecord(member);
  });
}

export async function listMemberAttendanceHistory(memberId: string): Promise<MemberAttendanceHistoryItem[]> {
  return mockRequest(() => cloneRecord(mockDatabase.memberHistory[memberId] ?? []));
}

export async function getMemberInternship(memberId: string): Promise<MemberInternshipSummary | null> {
  return mockRequest(() => cloneRecord(mockDatabase.memberInternships[memberId] ?? null));
}
