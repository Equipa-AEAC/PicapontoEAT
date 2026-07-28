export type MemberStatus = "active" | "inactive" | "pending" | "graduated";
export type MemberInternshipStatus = "not-assigned" | "in-progress" | "complete";

export interface MemberSummary {
  id: string;
  photoUrl: string | null;
  memberNumber: string;
  fullName: string;
  email: string;
  phone: string;
  course: string;
  className: string;
  academicYear: string;
  status: MemberStatus;
  assignedCardUid: string | null;
  internshipStatus: MemberInternshipStatus;
  accumulatedHours: number;
}

export interface MemberDetails extends MemberSummary {
  birthDate: string;
  emergencyContact: string;
  notes: string;
  supervisorName: string | null;
  internshipRequiredHours: number;
  internshipCompletedHours: number;
  internshipStartDate: string | null;
  internshipEndDate: string | null;
}

export interface MemberFormValues {
  photoUrl: string;
  memberNumber: string;
  fullName: string;
  email: string;
  phone: string;
  course: string;
  className: string;
  academicYear: string;
  birthDate: string;
  emergencyContact: string;
  assignedCardUid: string;
  status: MemberStatus;
  notes: string;
}

export interface MemberFilters {
  query: string;
  status: MemberStatus | "all";
  course: string | "all";
  academicYear: string | "all";
}

export interface MemberAttendanceHistoryItem {
  id: string;
  date: string;
  entry: string;
  exit: string;
  hours: number;
  deviceName: string;
  status: "present" | "corrected" | "missing";
}

export interface MemberInternshipSummary {
  memberId: string;
  requiredHours: number;
  completedHours: number;
  remainingHours: number;
  supervisor: string;
  startDate: string;
  endDate: string;
  status: MemberInternshipStatus;
}
