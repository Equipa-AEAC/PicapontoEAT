import { PhBriefcase, PhCertificate, PhChartBar, PhClockCounterClockwise, PhCreditCard, PhDeviceMobile, PhGearSix, PhHouse, PhMegaphone, PhUsersThree, PhUserGear } from "@phosphor-icons/vue";

import type { NavigationItem } from "../../shared/types";

export const adminNavigationItems: NavigationItem[] = [
  {
    name: "dashboard",
    path: "/admin/dashboard",
    label: "Dashboard",
    description: "Operations overview",
    icon: PhHouse,
  },
  {
    name: "members",
    path: "/admin/members",
    label: "Members",
    description: "Student & Equipa Técnica roster",
    icon: PhUsersThree,
  },
  {
    name: "cards",
    path: "/admin/cards",
    label: "Cards",
    description: "RFID card inventory and assignment",
    icon: PhCreditCard,
  },
  {
    name: "attendance",
    path: "/admin/attendance",
    label: "Attendance",
    description: "Scans, validations and history",
    icon: PhClockCounterClockwise,
  },
  {
    name: "internships",
    path: "/admin/internships",
    label: "Internships",
    description: "FCT placements and surplus hours",
    icon: PhBriefcase,
  },
  {
    name: "announcements",
    path: "/admin/announcements",
    label: "Announcements",
    description: "Targeted notices for members",
    icon: PhMegaphone,
  },
  {
    name: "certificates",
    path: "/admin/certificates",
    label: "Certificates",
    description: "Issued completion records",
    icon: PhCertificate,
  },
  {
    name: "devices",
    path: "/admin/devices",
    label: "Devices",
    description: "Terminal health and firmware",
    icon: PhDeviceMobile,
  },
  {
    name: "audit",
    path: "/admin/audit",
    label: "Audit",
    description: "System logs and actions",
    icon: PhClockCounterClockwise,
  },
  {
    name: "reports",
    path: "/admin/reports",
    label: "Reports",
    description: "Operational exports and summaries",
    icon: PhChartBar,
  },
  {
    name: "users",
    path: "/admin/users",
    label: "Users",
    description: "Staff accounts with system access",
    icon: PhUserGear,
  },
  {
    name: "settings",
    path: "/admin/settings",
    label: "Settings",
    description: "System configuration and access",
    icon: PhGearSix,
  },
];
