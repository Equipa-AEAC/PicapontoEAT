export type ReportType = "attendance" | "internship" | "student" | "device";
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
  attendanceTotal: number;
  activeStudents: number;
  internshipHours: number;
}

export interface ReportPreview {
  title: string;
  subtitle: string;
  summary: string;
  chartData: Array<{ label: string; value: number }>;
}