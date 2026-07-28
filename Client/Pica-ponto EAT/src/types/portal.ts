export interface StudentPortalProfile {
  fullName: string;
  studentNumber: string;
  course: string;
  className: string;
  photoUrl: string | null;
  email: string;
  phone: string;
  assignedSupervisor: string;
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

export interface PortalAttendancePoint {
  label: string;
  value: number;
}

export interface StudentPortalSummary {
  profile: StudentPortalProfile;
  currentInternshipStatus: string;
  completedHours: number;
  remainingHours: number;
  attendanceToday: string;
  attendanceCalendar: Array<{ date: string; status: "present" | "absent" | "late" | "holiday" }>;
  recentAttendance: Array<{ date: string; entry: string; exit: string; hours: number; status: string }>;
  weeklyStatistics: PortalAttendancePoint[];
  monthlyStatistics: PortalAttendancePoint[];
  internshipProgress: number;
  achievements: PortalAchievement[];
  announcements: PortalAnnouncement[];
}
