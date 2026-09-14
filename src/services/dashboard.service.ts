import { markRaw } from "vue";
import { PhClockCounterClockwise, PhFingerprint, PhTrendUp, PhUsersThree } from "@phosphor-icons/vue";

import type { DashboardActivity, DashboardMetric } from "../types/dashboard";

import { t } from "../i18n";
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
        labelKey: "admin.metrics.todayAttendance",
        value: String(mockDatabase.attendance.length),
        captionKey: "admin.metrics.todayAttendanceCaption",
        // A badge is only rendered when it says something the data actually supports.
        // There is no week-over-week series to compare against, so this metric carries none.
        // markRaw: these land in a store ref, and Vue warns if a component is made reactive.
        icon: markRaw(PhFingerprint),
      },
      {
        labelKey: "admin.metrics.currentlyPresent",
        value: String(present),
        captionKey: "admin.metrics.currentlyPresentCaption",
        trendKey: "admin.metrics.percentOfRecords",
        trendParams: { percent: attendanceRate },
        trendTone: "neutral",
        icon: markRaw(PhUsersThree),
      },
      {
        labelKey: "admin.metrics.weeklyHours",
        value: String(Math.round(weeklyHours)),
        captionKey: "admin.metrics.weeklyHoursCaption",
        icon: markRaw(PhTrendUp),
      },
      {
        labelKey: "admin.metrics.pendingCorrections",
        value: String(pendingCorrections),
        captionKey: "admin.metrics.pendingCorrectionsCaption",
        trendKey: pendingCorrections > 0 ? "admin.metrics.needsAttention" : "admin.metrics.allClear",
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
      mockDatabase.members.find((member) => member.id === memberId)?.fullName ?? t("admin.metrics.aMember");

    const projectName = (projectId: string | null) =>
      mockDatabase.projects.find((project) => project.id === projectId)?.name ?? t("admin.metrics.aProject");

    /**
     * "CREATE"/"attendance" is how the log stores it, not how it should read.
     *
     * The *entity* is a database noun, so it is title-cased rather than
     * translated — there is no vocabulary of entity names, and inventing one for
     * a strip that shows six rows would be more terminology than it is worth.
     * The verb around it is translated.
     */
    /*
     * Raw `entity`/`action`, not `auditEntityLabel(entity)` already resolved —
     * those are vocabulary lookups, and resolving them here bakes in whichever
     * language happened to be active when the dashboard was last fetched. The
     * template re-resolves them on every render, the same way `titleKey` itself
     * is re-resolved rather than being pre-translated into a plain string.
     */
    const auditTitle = (action: string, entity: string) => ({
      titleKey: "admin.metrics.auditRow",
      titleParams: { entity, action },
    });

    const events: Array<DashboardActivity & { at: string }> = [
      ...mockDatabase.auditLogs.map((entry) => ({
        id: `audit-${entry.id}`,
        ...auditTitle(entry.action, entry.entity),
        description: entry.description,
        timestamp: formatRelativeTime(entry.timestamp),
        tone: (entry.action === "DELETE" ? "danger" : "info") as DashboardActivity["tone"],
        at: entry.timestamp,
      })),
      ...mockDatabase.dailyLogs.map((log) => ({
        id: `journal-${log.id}`,
        titleKey: log.status === "submitted" ? "admin.metrics.entrySubmitted" : "admin.metrics.entryDrafted",
        /*
         * A synthesised sentence, not a recorded one — resolved at render like
         * everything else here, not flattened into one language at fetch time.
         */
        descriptionKey: "admin.metrics.entryDescription",
        descriptionParams: {
          name: memberName(log.studentId),
          hours: t("common.time.hoursShort", { count: log.hours }),
          project: projectName(log.projectId),
        },
        timestamp: formatRelativeTime(log.createdAt),
        tone: (log.status === "submitted" ? "success" : "warning") as DashboardActivity["tone"],
        at: log.createdAt,
      })),
      ...mockDatabase.projectActivity.map((event) => ({
        id: `project-${event.id}`,
        titleKey: "admin.metrics.projectTitle",
        titleParams: { project: projectName(event.projectId) },
        /*
         * The event's own message, kept as `messageKey`/`messageParams` rather
         * than resolved through `formatActivity` here — that call reads the
         * active locale, so doing it now would freeze the strip's second line
         * in whichever language was active when the dashboard was fetched. The
         * template calls `formatActivity` itself on every render instead.
         */
        messageKey: event.messageKey,
        messageParams: event.messageParams,
        messageSummary: event.summary,
        actorName: event.actorName,
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
