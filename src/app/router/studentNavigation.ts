import { PhCalendar, PhCertificate, PhClockCounterClockwise, PhGearSix, PhHouse, PhIdentificationCard, PhMegaphone, PhSuitcaseSimple, PhTimer } from "@phosphor-icons/vue";

import type { NavigationItem } from "../../shared/types";

export const studentNavigationItems: NavigationItem[] = [
  {
    name: "student-dashboard",
    path: "/student/dashboard",
    label: "Dashboard",
    description: "Personal overview",
    icon: PhHouse,
  },
  {
    name: "student-attendance",
    path: "/student/attendance",
    label: "Attendance",
    description: "Daily records and status",
    icon: PhClockCounterClockwise,
  },
  {
    name: "student-worked-hours",
    path: "/student/worked-hours",
    label: "Worked Hours",
    description: "Progress and time summary",
    icon: PhTimer,
  },
  {
    name: "student-calendar",
    path: "/student/calendar",
    label: "Calendar",
    description: "Attendance pattern overview",
    icon: PhCalendar,
  },
  {
    name: "student-internship",
    path: "/student/internship",
    label: "Internship",
    description: "Progress and milestones",
    icon: PhSuitcaseSimple,
  },
  {
    name: "student-certificates",
    path: "/student/certificates",
    label: "Certificates",
    description: "Completion previews",
    icon: PhCertificate,
  },
  {
    name: "student-announcements",
    path: "/student/announcements",
    label: "Announcements",
    description: "Latest updates",
    icon: PhMegaphone,
  },
  {
    name: "student-profile",
    path: "/student/profile",
    label: "Profile",
    description: "Personal information",
    icon: PhIdentificationCard,
  },
  {
    name: "student-settings",
    path: "/student/settings",
    label: "Settings",
    description: "Portal preferences",
    icon: PhGearSix,
  },
];
