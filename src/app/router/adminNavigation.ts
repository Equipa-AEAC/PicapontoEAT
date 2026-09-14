import {
  PhBriefcase,
  PhCalendar,
  PhCamera,
  PhCertificate,
  PhChartBar,
  PhClockCounterClockwise,
  PhCreditCard,
  PhDeviceMobile,
  PhFolders,
  PhGearSix,
  PhHouse,
  PhListChecks,
  PhMegaphone,
  PhPulse,
  PhSquaresFour,
  PhUserGear,
  PhUsersFour,
  PhUsersThree,
} from "@phosphor-icons/vue";

import type { NavigationEntry, NavigationItem } from "../../shared/types";
import { flattenNavigation } from "../../shared/types";

/**
 * The admin sidebar.
 *
 * Primary destinations sit at the root. Project management is the one area with
 * enough surface to warrant its own group, so its pages render as subsection
 * navigation under a header rather than as five more top-level entries.
 *
 * Routes are generated from this file (see `router/index.ts`), so adding an entry
 * here is what creates the route — there is no second list to keep in step.
 */
export const adminNavigationEntries: NavigationEntry[] = [
  {
    kind: "link",
    name: "dashboard",
    path: "/admin/dashboard",
    label: "nav.dashboard.label",
    description: "nav.dashboard.description",
    icon: PhHouse,
  },
  {
    kind: "link",
    name: "members",
    path: "/admin/members",
    label: "nav.members.label",
    description: "nav.members.description",
    icon: PhUsersThree,
  },
  {
    kind: "link",
    name: "cards",
    path: "/admin/cards",
    label: "nav.cards.label",
    description: "nav.cards.description",
    icon: PhCreditCard,
  },
  {
    kind: "link",
    name: "attendance",
    path: "/admin/attendance",
    label: "nav.attendance.label",
    description: "nav.attendance.description",
    icon: PhClockCounterClockwise,
  },
  {
    kind: "link",
    name: "calendar",
    path: "/admin/calendar",
    label: "nav.calendar.label",
    description: "nav.calendar.description",
    icon: PhCalendar,
  },
  {
    kind: "link",
    name: "internships",
    path: "/admin/internships",
    label: "nav.internships.label",
    description: "nav.internships.description",
    icon: PhBriefcase,
  },
  {
    kind: "group",
    name: "project-management",
    label: "nav.project-management.label",
    icon: PhFolders,
    items: [
      {
        name: "projects-overview",
        path: "/admin/projects/overview",
        label: "nav.projects-overview.label",
        description: "nav.projects-overview.description",
        icon: PhSquaresFour,
      },
      {
        name: "projects",
        path: "/admin/projects/list",
        label: "nav.projects.label",
        description: "nav.projects.description",
        icon: PhFolders,
      },
      {
        name: "project-tasks",
        path: "/admin/projects/tasks",
        label: "nav.project-tasks.label",
        description: "nav.project-tasks.description",
        icon: PhListChecks,
      },
      {
        name: "project-team",
        path: "/admin/projects/team",
        label: "nav.project-team.label",
        description: "nav.project-team.description",
        icon: PhUsersFour,
      },
      {
        name: "project-activity",
        path: "/admin/projects/activity",
        label: "nav.project-activity.label",
        description: "nav.project-activity.description",
        icon: PhPulse,
      },
    ],
  },
  {
    // Not filed under Project management: a moment belongs to the team, not to
    // a project, and burying a feed that clears itself every 24 hours two levels
    // down is the main reason nobody sees it.
    kind: "link",
    name: "team-moments",
    path: "/admin/moments",
    label: "nav.team-moments.label",
    description: "nav.team-moments.description",
    icon: PhCamera,
  },
  {
    kind: "link",
    name: "reports",
    path: "/admin/reports",
    label: "nav.reports.label",
    description: "nav.reports.description",
    icon: PhChartBar,
  },
  {
    kind: "link",
    name: "announcements",
    path: "/admin/announcements",
    label: "nav.announcements.label",
    description: "nav.announcements.description",
    icon: PhMegaphone,
  },
  {
    kind: "link",
    name: "certificates",
    path: "/admin/certificates",
    label: "nav.certificates.label",
    description: "nav.certificates.description",
    icon: PhCertificate,
  },
  {
    kind: "link",
    name: "devices",
    path: "/admin/devices",
    label: "nav.devices.label",
    description: "nav.devices.description",
    icon: PhDeviceMobile,
  },
  {
    kind: "link",
    name: "audit",
    path: "/admin/audit",
    label: "nav.audit.label",
    description: "nav.audit.description",
    icon: PhClockCounterClockwise,
  },
  {
    kind: "link",
    name: "users",
    path: "/admin/users",
    label: "nav.users.label",
    description: "nav.users.description",
    icon: PhUserGear,
  },
  {
    kind: "link",
    name: "settings",
    path: "/admin/settings",
    label: "nav.settings.label",
    description: "nav.settings.description",
    icon: PhGearSix,
  },
];

/** Every routable admin destination, groups flattened out. */
export const adminNavigationItems: NavigationItem[] = flattenNavigation(adminNavigationEntries);
