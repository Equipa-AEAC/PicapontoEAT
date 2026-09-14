import { PhCalendar, PhCamera, PhListChecks, PhCertificate, PhClockCounterClockwise, PhFileText, PhFolders, PhGearSix, PhHouse, PhIdentificationCard, PhKanban, PhMegaphone, PhNotePencil, PhTimer } from "@phosphor-icons/vue";

import type { NavigationEntry, NavigationItem } from "../../shared/types";
import { flattenNavigation } from "../../shared/types";

/**
 * The student sidebar.
 *
 * One group, for the same reason the admin sidebar has one: project management is
 * the single area with enough surface to need more than a page, and its two
 * destinations plus the project boards behind them read better as a titled group
 * than as two more entries competing with Attendance and Certificates.
 *
 * Everything else stays flat. A group per page would add a rank the student has
 * to reason about for no gain.
 */
export const studentNavigationEntries: NavigationEntry[] = [
  {
    kind: "link",
    name: "student-dashboard",
    path: "/student/dashboard",
    label: "nav.student-dashboard.label",
    description: "nav.student-dashboard.description",
    icon: PhHouse,
  },
  {
    kind: "link",
    name: "student-attendance",
    path: "/student/attendance",
    label: "nav.student-attendance.label",
    description: "nav.student-attendance.description",
    icon: PhClockCounterClockwise,
  },
  {
    kind: "link",
    name: "student-worked-hours",
    path: "/student/worked-hours",
    label: "nav.student-worked-hours.label",
    description: "nav.student-worked-hours.description",
    icon: PhTimer,
  },
  {
    kind: "link",
    name: "student-calendar",
    path: "/student/calendar",
    label: "nav.student-calendar.label",
    description: "nav.student-calendar.description",
    icon: PhCalendar,
  },
  {
    kind: "group",
    name: "student-project-management",
    label: "nav.student-project-management.label",
    icon: PhKanban,
    items: [
      {
        name: "student-projects",
        path: "/student/projects",
        label: "nav.student-projects.label",
        description: "nav.student-projects.description",
        icon: PhFolders,
      },
      {
        name: "student-tasks",
        path: "/student/projects/tasks",
        label: "nav.student-tasks.label",
        description: "nav.student-tasks.description",
        icon: PhListChecks,
      },
    ],
  },
  {
    kind: "link",
    name: "student-daily-log",
    path: "/student/daily-log",
    label: "nav.student-daily-log.label",
    description: "nav.student-daily-log.description",
    icon: PhNotePencil,
  },
  {
    kind: "link",
    name: "student-reports",
    path: "/student/reports",
    label: "nav.student-reports.label",
    description: "nav.student-reports.description",
    icon: PhFileText,
  },
  {
    kind: "link",
    name: "student-certificates",
    path: "/student/certificates",
    label: "nav.student-certificates.label",
    description: "nav.student-certificates.description",
    icon: PhCertificate,
  },
  {
    kind: "link",
    name: "student-moments",
    path: "/student/moments",
    label: "nav.student-moments.label",
    description: "nav.student-moments.description",
    icon: PhCamera,
  },
  {
    kind: "link",
    name: "student-announcements",
    path: "/student/announcements",
    label: "nav.student-announcements.label",
    description: "nav.student-announcements.description",
    icon: PhMegaphone,
  },
  {
    kind: "link",
    name: "student-profile",
    path: "/student/profile",
    label: "nav.student-profile.label",
    description: "nav.student-profile.description",
    icon: PhIdentificationCard,
  },
  {
    kind: "link",
    name: "student-settings",
    path: "/student/settings",
    label: "nav.student-settings.label",
    description: "nav.student-settings.description",
    icon: PhGearSix,
  },
];

export const studentNavigationItems: NavigationItem[] = flattenNavigation(studentNavigationEntries);
