import {
  PhBriefcase,
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
    label: "Dashboard",
    description: "Operations overview",
    icon: PhHouse,
  },
  {
    kind: "link",
    name: "members",
    path: "/admin/members",
    label: "Members",
    description: "Student & Equipa Técnica roster",
    icon: PhUsersThree,
  },
  {
    kind: "link",
    name: "cards",
    path: "/admin/cards",
    label: "Cards",
    description: "RFID card inventory and assignment",
    icon: PhCreditCard,
  },
  {
    kind: "link",
    name: "attendance",
    path: "/admin/attendance",
    label: "Attendance",
    description: "Scans, validations and history",
    icon: PhClockCounterClockwise,
  },
  {
    kind: "link",
    name: "internships",
    path: "/admin/internships",
    label: "Internships",
    description: "FCT placements and surplus hours",
    icon: PhBriefcase,
  },
  {
    kind: "group",
    name: "project-management",
    label: "Project management",
    icon: PhFolders,
    items: [
      {
        name: "projects-overview",
        path: "/admin/projects/overview",
        label: "Overview",
        description: "Progress, deadlines and workload at a glance",
        icon: PhSquaresFour,
      },
      {
        name: "projects",
        path: "/admin/projects/list",
        label: "Projects",
        description: "Every project the team is running",
        icon: PhFolders,
      },
      {
        name: "project-tasks",
        path: "/admin/projects/tasks",
        label: "Tasks",
        description: "Work items across every project",
        icon: PhListChecks,
      },
      {
        name: "project-team",
        path: "/admin/projects/team",
        label: "Team",
        description: "Who is assigned to what, and how much",
        icon: PhUsersFour,
      },
      {
        name: "project-activity",
        path: "/admin/projects/activity",
        label: "Activity",
        description: "Everything that happened across the projects",
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
    label: "Team moments",
    description: "Today's photos from the workshop and the labs",
    icon: PhCamera,
  },
  {
    kind: "link",
    name: "reports",
    path: "/admin/reports",
    label: "Reports",
    description: "Journal coverage and operational exports",
    icon: PhChartBar,
  },
  {
    kind: "link",
    name: "announcements",
    path: "/admin/announcements",
    label: "Announcements",
    description: "Targeted notices for members",
    icon: PhMegaphone,
  },
  {
    kind: "link",
    name: "certificates",
    path: "/admin/certificates",
    label: "Certificates",
    description: "Issued completion records",
    icon: PhCertificate,
  },
  {
    kind: "link",
    name: "devices",
    path: "/admin/devices",
    label: "Devices",
    description: "Terminal health and firmware",
    icon: PhDeviceMobile,
  },
  {
    kind: "link",
    name: "audit",
    path: "/admin/audit",
    label: "Audit",
    description: "System logs and actions",
    icon: PhClockCounterClockwise,
  },
  {
    kind: "link",
    name: "users",
    path: "/admin/users",
    label: "Users",
    description: "Staff accounts with system access",
    icon: PhUserGear,
  },
  {
    kind: "link",
    name: "settings",
    path: "/admin/settings",
    label: "Settings",
    description: "System configuration and access",
    icon: PhGearSix,
  },
];

/** Every routable admin destination, groups flattened out. */
export const adminNavigationItems: NavigationItem[] = flattenNavigation(adminNavigationEntries);
