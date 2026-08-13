/**
 * `team-hours` reports the volunteer hours members are registered for as Equipa Técnica
 * team members (credited to the surplus-hours certificate). `internship` reports FCT
 * internship hours only. The two are deliberately separate report types because they
 * count towards two different things.
 */
export type ReportType = "attendance" | "team-hours" | "internship" | "student" | "device";
export type ReportExportFormat = "pdf" | "excel" | "csv";

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  attendance: "Attendance",
  "team-hours": "Team hours (surplus)",
  internship: "Internship (FCT)",
  student: "Member",
  device: "Device",
};

export const REPORT_TYPE_OPTIONS = (Object.keys(REPORT_TYPE_LABELS) as ReportType[]).map((value) => ({
  label: REPORT_TYPE_LABELS[value],
  value,
}));

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
  attendanceTotal: number;
  activeStudents: number;
  /** Volunteer team hours across the roster. */
  teamHours: number;
  /** FCT internship hours only. */
  internshipHours: number;
}

export interface ReportPreview {
  title: string;
  subtitle: string;
  summary: string;
  chartData: Array<{ label: string; value: number }>;
}
