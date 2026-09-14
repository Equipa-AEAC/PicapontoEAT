import type { ReportExportFormat, ReportFilterValues, ReportPreview, ReportSummary } from "../types/reports";

import { mockDatabase } from "./mockDatabase";
import { mockRequest } from "./mockTransport";
import { computeParticipationHours } from "./participation.service";
import { todayIsoDate } from "../utils/date";
import { t } from "../i18n";
import { reportTypeLabel } from "../i18n/vocabulary";

/** Inclusive `YYYY-MM-DD` bounds; either end may be null. */
type DateRange = [string | null, string | null];

/*
 * Both totals are summed from participation periods, so a member who moved from
 * volunteering to a placement contributes to each bucket for the days that
 * actually belonged to it. Neither reads a member's current status.
 */
function totalTeamHours(dateRange: DateRange): number {
  return round(
    mockDatabase.members.reduce((total, m) => total + computeParticipationHours(m.id, dateRange).teamHours, 0),
  );
}

function totalInternshipHours(dateRange: DateRange): number {
  return round(
    mockDatabase.internships.reduce(
      (total, i) => total + computeParticipationHours(i.studentId, dateRange).internshipHours,
      0,
    ),
  );
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Whether an ISO day falls inside the report's range.
 *
 * Every report prints its range in the subtitle, so every report has to honour
 * it. Three of them used to print it and then chart an all-time figure, which is
 * the most misleading thing a report can do: it looks specific and is not.
 */
function withinRange(date: string | null, [from, to]: [string | null, string | null]): boolean {
  if (!date) {
    return from === null && to === null;
  }

  return (!from || date >= from) && (!to || date <= to);
}

/**
 * Tasks that are past their due date and not finished.
 *
 * Duplicated logic is avoided by reading the same `projectTasks` collection the
 * project service does; what a report calls "overdue" and what the board calls
 * "overdue" must be the same thing or the two pages disagree in front of the user.
 */
function overdueTaskCount(): number {
  const today = todayIsoDate();

  return mockDatabase.projectTasks.filter(
    (task) => !task.archivedAt && task.status !== "done" && task.dueDate !== null && task.dueDate < today,
  ).length;
}

/**
 * The figures the reports page shows beside the preview.
 *
 * Takes the same range as the preview. It used to take none while being
 * presented as a "Period snapshot" of "what the export will cover", so a report
 * narrowed to one month sat next to all-time totals — a displayed period that
 * changed nothing, which is the defect this codebase treats as unacceptable.
 *
 * `attendanceTotal`, the two hour buckets and `completedTasks` are dated and are
 * scoped. `activeStudents`, `activeProjects` and `overdueTasks` describe the
 * roster *now*: a member is not "active during June", and overdue is measured
 * against today. `rangeApplied` lets the page say which is which rather than
 * implying everything is period-scoped.
 */
export async function getReportSummary(
  dateRange: DateRange = [null, null],
): Promise<ReportSummary> {
  return mockRequest(() => ({
    generatedAt: new Date().toISOString(),
    rangeApplied: dateRange[0] !== null || dateRange[1] !== null,
    attendanceTotal: mockDatabase.attendance.filter((row) => withinRange(row.date, dateRange)).length,
    activeStudents: mockDatabase.members.filter((member) => member.status === "active").length,
    teamHours: totalTeamHours(dateRange),
    internshipHours: totalInternshipHours(dateRange),
    activeProjects: mockDatabase.projects.filter((project) => project.status !== "archived").length,
    completedTasks: mockDatabase.projectTasks.filter(
      (task) =>
        !task.archivedAt &&
        task.status === "done" &&
        (dateRange[0] === null && dateRange[1] === null
          ? true
          : withinRange(task.completedAt?.slice(0, 10) ?? null, dateRange)),
    ).length,
    overdueTasks: overdueTaskCount(),
  }));
}

export async function previewReport(filters: ReportFilterValues): Promise<ReportPreview> {
  return mockRequest(() => {
    const noRange = filters.dateRange[0] === null && filters.dateRange[1] === null;
    const rangeSubtitle = noRange
      ? t("admin.reportPreview.allData")
      : t("admin.reportPreview.range", {
          from: filters.dateRange[0] ?? t("admin.reportPreview.rangeStart"),
          to: filters.dateRange[1] ?? t("admin.reportPreview.rangeEnd"),
        });

    const scopedMembers =
      filters.studentId === "all"
        ? mockDatabase.members
        : mockDatabase.members.filter((member) => member.id === filters.studentId);

    if (filters.type === "team-hours") {
      return {
        title: t("admin.reportPreview.teamHoursTitle"),
        subtitle: rangeSubtitle,
        summary: t("admin.reportPreview.teamHoursSummary"),
        chartData: scopedMembers.map((member) => ({
          label: member.fullName,
          value: computeParticipationHours(member.id, filters.dateRange).teamHours,
        })),
      };
    }

    /*
     * Project delivery reads from the project tasks rather than from the journal:
     * hours answer "how much time went in", completed tasks answer "what got done".
     * Reporting needs both, and they are deliberately different numbers.
     */
    if (filters.type === "project") {
      /*
       * A task counts for the range it was *completed* in, taken from
       * `completedAt`. With no range the report covers everything, which is what
       * an empty range means everywhere else in the application.
       */
      const live = mockDatabase.projectTasks.filter(
        (task) =>
          !task.archivedAt &&
          task.status === "done" &&
          (noRange ? true : withinRange(task.completedAt?.slice(0, 10) ?? null, filters.dateRange)),
      );

      return {
        title: t("admin.reportPreview.projectTitle"),
        subtitle: rangeSubtitle,
        summary: t("admin.reportPreview.projectSummary"),
        chartData: mockDatabase.projects
          .filter((project) => project.status !== "archived")
          .map((project) => ({
            label: project.name,
            value: live.filter((task) => task.projectId === project.id).length,
          })),
      };
    }

    if (filters.type === "internship") {
      const scopedInternships =
        filters.studentId === "all"
          ? mockDatabase.internships
          : mockDatabase.internships.filter((internship) => internship.studentId === filters.studentId);

      return {
        title: t("admin.reportPreview.internshipTitle"),
        subtitle: rangeSubtitle,
        summary: t("admin.reportPreview.internshipSummary"),
        chartData: scopedInternships.map((internship) => ({
          label: internship.studentName,
          value: computeParticipationHours(internship.studentId, filters.dateRange).internshipHours,
        })),
      };
    }

    /*
     * Attendance / student / device. Attendance is dated, so it is scoped to the
     * range; members and devices are not dated records, and counting them "in a
     * period" would be inventing a meaning the data does not have — so the
     * summary says plainly that they are current totals.
     */
    const scopedAttendance = mockDatabase.attendance.filter(
      (row) =>
        withinRange(row.date, filters.dateRange) &&
        (filters.studentId === "all" || row.studentId === filters.studentId),
    );

    return {
      title: t("admin.reportPreview.genericTitle", { type: reportTypeLabel(filters.type) }),
      subtitle: rangeSubtitle,
      summary: t("admin.reportPreview.genericSummary", {
        scope: noRange ? t("admin.reportPreview.scopeFull") : t("admin.reportPreview.scopeSelected"),
      }),
      chartData: [
        { label: t("admin.reportPreview.seriesAttendance"), value: scopedAttendance.length },
        { label: t("admin.reportPreview.seriesMembers"), value: scopedMembers.length },
        { label: t("admin.reportPreview.seriesDevices"), value: mockDatabase.devices.length },
      ],
    };
  });
}

export async function exportReport(filters: ReportFilterValues, format: ReportExportFormat): Promise<{ downloadUrl: string }> {
  return mockRequest(() => ({
    downloadUrl: `/exports/${filters.type}-${format}-${Date.now()}`,
  }));
}
