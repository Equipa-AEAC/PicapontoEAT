import type { ReportExportFormat, ReportFilterValues, ReportPreview, ReportSummary } from "../types/reports";

import { mockDatabase } from "./mockDatabase";
import { mockRequest } from "./mockTransport";

export async function getReportSummary(): Promise<ReportSummary> {
  return mockRequest(() => ({
    generatedAt: new Date().toISOString(),
    attendanceTotal: mockDatabase.attendance.length,
    activeStudents: mockDatabase.members.filter((member) => member.status === "active").length,
    internshipHours: mockDatabase.internships.reduce((total, internship) => total + internship.completedHours, 0),
  }));
}

export async function previewReport(filters: ReportFilterValues): Promise<ReportPreview> {
  return mockRequest(() => ({
    title: `${filters.type} report`,
    subtitle: `${filters.dateRange[0] ?? "start"} to ${filters.dateRange[1] ?? "end"}`,
    summary: `Prepared for ${filters.scope} with ${filters.format.toUpperCase()} export availability.`,
    chartData: [
      { label: "Attendance", value: mockDatabase.attendance.length },
      { label: "Members", value: mockDatabase.members.length },
      { label: "Devices", value: mockDatabase.devices.length },
    ],
  }));
}

export async function exportReport(filters: ReportFilterValues, format: ReportExportFormat): Promise<{ downloadUrl: string }> {
  return mockRequest(() => ({
    downloadUrl: `/exports/${filters.type}-${format}-${Date.now()}`,
  }));
}