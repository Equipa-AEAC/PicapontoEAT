import { markRaw } from "vue";
import { PhClockCounterClockwise, PhFingerprint, PhTrendUp, PhUsersThree } from "@phosphor-icons/vue";

import type { DashboardActivity, DashboardMetric } from "../types/dashboard";

import { formatRelativeTime } from "../utils/date";

import { mockDatabase } from "./mockDatabase";
import { mockRequest } from "./mockTransport";

export async function getDashboardMetrics(): Promise<DashboardMetric[]> {
  return mockRequest(() => {
    const present = mockDatabase.attendance.filter((item) => item.status === "present").length;
    const pendingCorrections = mockDatabase.attendance.filter((item) => item.corrections > 0).length;
    const weeklyHours = mockDatabase.attendance.reduce((total, item) => total + (item.hours ?? 0), 0);
    const attendanceRate = mockDatabase.attendance.length
      ? Math.round((present / mockDatabase.attendance.length) * 100)
      : 0;

    return [
      {
        label: "Today's attendance",
        value: String(mockDatabase.attendance.length),
        caption: "Validated scans and manual records",
        // A badge is only rendered when it says something the data actually supports.
        // There is no week-over-week series to compare against, so this metric carries none.
        // markRaw: these land in a store ref, and Vue warns if a component is made reactive.
        icon: markRaw(PhFingerprint),
      },
      {
        label: "Currently present",
        value: String(present),
        caption: "Members checked in right now",
        trendLabel: `${attendanceRate}% of records`,
        trendTone: "neutral",
        icon: markRaw(PhUsersThree),
      },
      {
        label: "Weekly hours",
        value: String(Math.round(weeklyHours)),
        caption: "Attendance hours logged this week",
        icon: markRaw(PhTrendUp),
      },
      {
        label: "Pending corrections",
        value: String(pendingCorrections),
        caption: "Attendance records awaiting review",
        trendLabel: pendingCorrections > 0 ? "Needs attention" : "All clear",
        trendTone: pendingCorrections > 0 ? "negative" : "positive",
        icon: markRaw(PhClockCounterClockwise),
      },
    ];
  });
}

/**
 * The dashboard's activity strip, assembled from what actually happened.
 *
 * This used to be four hardcoded strings with hardcoded relative times, so the
 * panel claimed the same four events at the same four ages no matter what state
 * the system was in. It now merges the three collections that genuinely record
 * events — the audit log, the work journal and the project trail — and takes the
 * most recent handful. An empty system correctly shows an empty panel.
 */
export async function getDashboardActivity(): Promise<DashboardActivity[]> {
  return mockRequest(() => {
    const memberName = (memberId: string) =>
      mockDatabase.members.find((member) => member.id === memberId)?.fullName ?? "A member";

    const projectName = (projectId: string | null) =>
      mockDatabase.projects.find((project) => project.id === projectId)?.name ?? "a project";

    /** "CREATE"/"attendance" is how the log stores it, not how it should read. */
    const auditTitle = (action: string, entity: string) => {
      const verb = { CREATE: "added", UPDATE: "updated", DELETE: "removed" }[action] ?? action.toLowerCase();
      const subject = entity.charAt(0).toUpperCase() + entity.slice(1);

      return `${subject} ${verb}`;
    };

    const events: Array<DashboardActivity & { at: string }> = [
      ...mockDatabase.auditLogs.map((entry) => ({
        id: `audit-${entry.id}`,
        title: auditTitle(entry.action, entry.entity),
        description: entry.description,
        timestamp: formatRelativeTime(entry.timestamp),
        tone: (entry.action === "DELETE" ? "danger" : "info") as DashboardActivity["tone"],
        at: entry.timestamp,
      })),
      ...mockDatabase.dailyLogs.map((log) => ({
        id: `journal-${log.id}`,
        title: log.status === "submitted" ? "Daily entry submitted" : "Daily entry drafted",
        description: `${memberName(log.studentId)} logged ${log.hours}h on ${projectName(log.projectId)}.`,
        timestamp: formatRelativeTime(log.createdAt),
        tone: (log.status === "submitted" ? "success" : "warning") as DashboardActivity["tone"],
        at: log.createdAt,
      })),
      ...mockDatabase.projectActivity.map((event) => ({
        id: `project-${event.id}`,
        title: projectName(event.projectId),
        description: `${event.summary} — ${event.actorName}`,
        timestamp: formatRelativeTime(event.createdAt),
        tone: "info" as DashboardActivity["tone"],
        at: event.createdAt,
      })),
    ];

    return events
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 6)
      .map(({ at: _at, ...event }) => event);
  });
}
