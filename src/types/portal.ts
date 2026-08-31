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
  currentInternshipStatus: string;
  completedHours: number;
  remainingHours: number;
  attendanceToday: string;
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
