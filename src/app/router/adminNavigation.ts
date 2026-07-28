import { PhBriefcase, PhCertificate, PhChartBar, PhClockCounterClockwise, PhDeviceMobile, PhGearSix, PhHouse, PhUsersThree, PhUserGear } from "@phosphor-icons/vue";

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
    description: "Unified member registry and card assignment",
    icon: PhUsersThree,
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
    description: "Placements and hour tracking",
    icon: PhBriefcase,
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
    description: "Access and role management",
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
