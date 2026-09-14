import type { InternshipStatus } from "./internships";
import type { AttendanceStatus } from "./attendance";

export interface StudentPortalProfile {
  fullName: string;
  studentNumber: string;
  course: string;
  className: string;
  photoUrl: string | null;
  email: string;
  phone: string;
  /** Orientador de estágio at the school the member is enrolled at. */
  assignedOrientador: string;
  /** Monitor de estágio at Equipa Técnica. */
  assignedMonitor: string;
}

export interface PortalAchievement {
  id: string;
  title: string;
  description: string;
  achievedAt: string;
}

export interface PortalAnnouncement {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
}

/*
 * `PortalAttendancePoint` was here. The aggregates it typed are now derived from
 * the attendance collection, so the shape lives with the derivation as
 * `AttendancePoint` in `src/utils/attendanceStats.ts`.
 */

export interface StudentPortalSummary {
  profile: StudentPortalProfile;
  /**
   * The placement's status code, or null when there is no placement.
   *
   * It used to be a pre-formatted English label built in the service, which put
   * "In progress" into an otherwise Portuguese card. The view names it.
   */
  currentInternshipStatus: InternshipStatus | null;
  completedHours: number;
  remainingHours: number;
  /**
   * Today's attendance state, as the status *code* rather than a word.
   *
   * It was a pre-formatted English string written into the fixture, which
   * meant the Portuguese dashboard printed "Present" in the middle of an
   * otherwise translated card. The view names it through the shared
   * vocabulary, the same as every other attendance status.
   */
  attendanceToday: AttendanceStatus;
  /*
   * There is deliberately no `attendanceCalendar`, `recentAttendance`,
   * `weeklyStatistics` or `monthlyStatistics` here. Days and the totals over
   * them come from the attendance collection, which is the only place a day is
   * recorded; `src/utils/attendanceStats.ts` derives the aggregates.
   *
   * Every hour figure below is derived too: `completedHours` is the member's
   * internship participation hours, `remainingHours` is the internship's
   * `requiredHours` minus that, and `internshipProgress` is their ratio. They are
   * no longer stored on the fixture — see the note in `mockDatabase.ts`.
   */
  internshipProgress: number;
  /** Hours inside team-member participation periods. Derived, never stored. */
  teamHours: number;
  /** Hours inside internship participation periods. Derived, never stored. */
  internshipHours: number;
  achievements: PortalAchievement[];
  announcements: PortalAnnouncement[];
}

/**
 * What the mock stores for the portal: the profile and the narrative bits.
 *
 * Everything hour-shaped is derived by `portal.service.ts` from the member's
 * internship record and their participation hours.
 */
export type StoredPortalSummary = Omit<
  StudentPortalSummary,
  | "currentInternshipStatus"
  | "completedHours"
  | "remainingHours"
  | "internshipProgress"
  | "teamHours"
  | "internshipHours"
>;
