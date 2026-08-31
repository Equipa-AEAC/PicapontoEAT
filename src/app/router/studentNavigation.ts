import { PhCalendar, PhCamera, PhListChecks, PhCertificate, PhClockCounterClockwise, PhFileText, PhGearSix, PhHouse, PhIdentificationCard, PhMegaphone, PhNotePencil, PhTimer } from "@phosphor-icons/vue";

import type { NavigationEntry, NavigationItem } from "../../shared/types";
import { flattenNavigation } from "../../shared/types";

/**
 * The student sidebar. Flat: the portal has no area big enough to need a group,
 * and inventing one would add a rank the student does not have to reason about.
 */
export const studentNavigationEntries: NavigationEntry[] = [
  {
    kind: "link",
    name: "student-dashboard",
    path: "/student/dashboard",
    label: "Dashboard",
    description: "Personal overview",
    icon: PhHouse,
  },
  {
    kind: "link",
    name: "student-attendance",
    path: "/student/attendance",
    label: "Attendance",
    description: "Daily records and status",
    icon: PhClockCounterClockwise,
  },
  {
    kind: "link",
    name: "student-worked-hours",
    path: "/student/worked-hours",
    label: "Worked Hours",
    description: "Internship progress, hours and milestones",
    icon: PhTimer,
  },
  {
    kind: "link",
    name: "student-calendar",
    path: "/student/calendar",
    label: "Calendar",
    description: "Attendance pattern overview",
    icon: PhCalendar,
  },
  {
    kind: "link",
    name: "student-work",
    path: "/student/my-work",
    label: "My Work",
    description: "Tasks assigned to you",
    icon: PhListChecks,
  },
  {
    kind: "link",
    name: "student-daily-log",
    path: "/student/daily-log",
    label: "Daily Report",
    description: "Register what you did today",
    icon: PhNotePencil,
  },
  {
    kind: "link",
    name: "student-reports",
    path: "/student/reports",
    label: "Internship Reports",
    description: "Monthly and final reports",
    icon: PhFileText,
  },
  {
    kind: "link",
    name: "student-certificates",
    path: "/student/certificates",
    label: "Certificates",
    description: "Completion previews",
    icon: PhCertificate,
  },
  {
    kind: "link",
    name: "student-moments",
    path: "/student/moments",
    label: "Team Moments",
    description: "Today's photos from the team",
    icon: PhCamera,
  },
  {
    kind: "link",
    name: "student-announcements",
    path: "/student/announcements",
    label: "Announcements",
    description: "Latest updates",
    icon: PhMegaphone,
  },
  {
    kind: "link",
    name: "student-profile",
    path: "/student/profile",
    label: "Profile",
    description: "Personal information",
    icon: PhIdentificationCard,
  },
  {
    kind: "link",
    name: "student-settings",
    path: "/student/settings",
    label: "Settings",
    description: "Portal preferences",
    icon: PhGearSix,
  },
];

export const studentNavigationItems: NavigationItem[] = flattenNavigation(studentNavigationEntries);
