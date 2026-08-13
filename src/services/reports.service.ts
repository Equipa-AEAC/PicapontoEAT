import type { ReportExportFormat, ReportFilterValues, ReportPreview, ReportSummary } from "../types/reports";
import { REPORT_TYPE_LABELS } from "../types/reports";

import { mockDatabase } from "./mockDatabase";
import { mockRequest } from "./mockTransport";

function totalTeamHours(): number {
  return mockDatabase.members.reduce((total, member) => total + member.teamHours, 0);
}

function totalInternshipHours(): number {
  return mockDatabase.internships.reduce((total, internship) => total + internship.completedHours, 0);
}

export async function getReportSummary(): Promise<ReportSummary> {
  return mockRequest(() => ({
    generatedAt: new Date().toISOString(),
    attendanceTotal: mockDatabase.attendance.length,
    activeStudents: mockDatabase.members.filter((member) => member.status === "active").length,
    teamHours: totalTeamHours(),
    internshipHours: totalInternshipHours(),
  }));
}

export async function previewReport(filters: ReportFilterValues): Promise<ReportPreview> {
  return mockRequest(() => {
    const scopedMembers =
      filters.studentId === "all"
        ? mockDatabase.members
        : mockDatabase.members.filter((member) => member.id === filters.studentId);

    if (filters.type === "team-hours") {
      return {
        title: "Team hours (surplus) report",
        subtitle: `${filters.dateRange[0] ?? "start"} to ${filters.dateRange[1] ?? "end"}`,
        summary: `Volunteer hours registered as Equipa Técnica team members, creditable to the surplus-hours certificate. FCT internship hours are excluded.`,
        chartData: scopedMembers.map((member) => ({ label: member.fullName, value: member.teamHours })),
      };
    }

    if (filters.type === "internship") {
      const scopedInternships =
        filters.studentId === "all"
          ? mockDatabase.internships
          : mockDatabase.internships.filter((internship) => internship.studentId === filters.studentId);

      return {
        title: "Internship (FCT) report",
        subtitle: `${filters.dateRange[0] ?? "start"} to ${filters.dateRange[1] ?? "end"}`,
        summary: `FCT internship hours only. Volunteer team hours are reported separately.`,
        chartData: scopedInternships.map((internship) => ({ label: internship.studentName, value: internship.completedHours })),
      };
    }

    return {
      title: `${REPORT_TYPE_LABELS[filters.type]} report`,
      subtitle: `${filters.dateRange[0] ?? "start"} to ${filters.dateRange[1] ?? "end"}`,
      summary: `Prepared for ${filters.scope} with ${filters.format.toUpperCase()} export availability.`,
      chartData: [
        { label: "Attendance", value: mockDatabase.attendance.length },
        { label: "Members", value: mockDatabase.members.length },
        { label: "Devices", value: mockDatabase.devices.length },
      ],
    };
  });
}

export async function exportReport(filters: ReportFilterValues, format: ReportExportFormat): Promise<{ downloadUrl: string }> {
  return mockRequest(() => ({
    downloadUrl: `/exports/${filters.type}-${format}-${Date.now()}`,
  }));
}
