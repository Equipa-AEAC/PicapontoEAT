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

/**
 * What the mock actually stores for a member.
 *
 * Every hour figure and every internship date is omitted: `teamHours` is summed
 * from attendance inside the member's team-member participation periods, and the
 * internship fields are read from the internship record itself. They were all
 * stored once, and a single progress update left the member page and the
 * internship page showing different numbers.
 *
 * `internshipStatus` stays stored. It describes what is true *now* — used for
 * filtering, announcement targeting and current-participation display — and must
 * never be used to classify historical attendance.
 */
export type StoredMember = Omit<
  MemberDetails,
  | "teamHours"
  | "internshipRequiredHours"
  | "internshipCompletedHours"
  | "internshipStartDate"
  | "internshipEndDate"
>;

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

/** Narrowing applied to one member's attendance history. */
export interface MemberAttendanceHistoryFilters {
  status?: MemberAttendanceHistoryItem["status"] | "all";
  /** Inclusive `YYYY-MM-DD` bounds. Either end may be omitted. */
  from?: string | null;
  to?: string | null;
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
