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
  /**
   * The school this member is enrolled at. Equipa Técnica hosts FCT interns from
   * other schools, so this is not always the host school — see `isExternal`.
   */
  originSchool: string;
  /** Derived from `originSchool`: true when the member is enrolled elsewhere. */
  isExternal: boolean;
  status: MemberStatus;
  assignedCardUid: string | null;
  /** Whether this team member is *also* carrying out an FCT internship. */
  internshipStatus: MemberInternshipStatus;
  /**
   * Volunteer hours accumulated as an Equipa Técnica team member, from registered
   * attendance. Credited towards the surplus-hours certificate — never mixed with
   * the FCT internship hours below.
   */
  teamHours: number;
}

export interface MemberDetails extends MemberSummary {
  birthDate: string;
  emergencyContact: string;
  notes: string;
  /** Orientador de estágio at the member's own school. Null when not an intern. */
  orientadorName: string | null;
  /** FCT internship hours. Separate bucket from `teamHours`. */
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
  originSchool: string;
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
  /** "all", "internal" (host school) or "external" (any other school). */
  origin: "all" | "internal" | "external";
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
  orientador: string;
  monitor: string;
  startDate: string;
  endDate: string;
  status: MemberInternshipStatus;
}
