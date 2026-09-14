/*
 * The label maps that used to live here now live in `i18n/vocabulary.ts`.
 *
 * A `Record<Status, string>` is evaluated once at import, which cannot
 * survive a language change. The *values* and their order are still a
 * product decision and stay in this file; how to write them is not.
 */

/**
 * `team-hours` reports the volunteer hours members are registered for as Equipa Técnica
 * team members (credited to the surplus-hours certificate). `internship` reports FCT
 * internship hours only. The two are deliberately separate report types because they
 * count towards two different things.
 */
export type ReportType = "attendance" | "team-hours" | "internship" | "project" | "student" | "device";
export type ReportExportFormat = "pdf" | "excel" | "csv";

export interface ReportFilterValues {
  type: ReportType;
  format: ReportExportFormat;
  scope: string;
  dateRange: [string | null, string | null];
  studentId: string | "all";
  deviceId: string | "all";
}

export interface ReportSummary {
  generatedAt: string;
  /**
   * Whether a date range narrowed the dated figures below.
   *
   * The page uses it to say plainly which numbers are period-scoped, because
   * three of these are not dated concepts and cannot be.
   */
  rangeApplied: boolean;
  /** Attendance rows inside the range. */
  attendanceTotal: number;
  /** Current roster count — not period-scoped. */
  activeStudents: number;
  /** Volunteer team hours across the roster. */
  teamHours: number;
  /** FCT internship hours only. */
  internshipHours: number;
  /** Projects not archived. Reporting covers delivery as well as hours. */
  activeProjects: number;
  /** Tasks completed across every project, and how many are still late. */
  completedTasks: number;
  overdueTasks: number;
}

export interface ReportPreview {
  title: string;
  subtitle: string;
  summary: string;
  chartData: Array<{ label: string; value: number }>;
}
