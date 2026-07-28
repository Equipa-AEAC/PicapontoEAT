import { createRouter, createWebHashHistory } from "vue-router";

import AdminLayout from "../layouts/AdminLayout.vue";
import LoginLayout from "../layouts/LoginLayout.vue";
import StudentLayout from "../layouts/StudentLayout.vue";
import { useAuthStore } from "../../modules/authentication";
import { pinia } from "../providers/pinia";
import { adminNavigationItems } from "./adminNavigation";

const adminPageComponents = {
  dashboard: () => import("../../modules/admin/dashboard/pages/AdminDashboardPage.vue"),
  members: () => import("../../modules/admin/members/pages/AdminMembersPage.vue"),
  attendance: () => import("../../modules/admin/attendance/pages/AdminAttendancePage.vue"),
  internships: () => import("../../modules/admin/internships/pages/AdminInternshipsPage.vue"),
  certificates: () => import("../../modules/admin/certificates/pages/AdminCertificatesPage.vue"),
  devices: () => import("../../modules/admin/devices/pages/AdminDevicesPage.vue"),
  audit: () => import("../../modules/admin/audit/pages/AdminAuditPage.vue"),
  reports: () => import("../../modules/admin/reports/pages/AdminReportsPage.vue"),
  users: () => import("../../modules/admin/users/pages/AdminUsersPage.vue"),
  settings: () => import("../../modules/admin/settings/pages/AdminSettingsPage.vue"),
} as const;

const studentPageComponents = {
  dashboard: () => import("../../modules/student/dashboard/StudentPortalPage.vue"),
  attendance: () => import("../../modules/student/attendance/pages/StudentAttendancePage.vue"),
  workedHours: () => import("../../modules/student/worked-hours/pages/StudentWorkedHoursPage.vue"),
  calendar: () => import("../../modules/student/calendar/pages/StudentCalendarPage.vue"),
  internship: () => import("../../modules/student/internship/pages/StudentInternshipPage.vue"),
  certificates: () => import("../../modules/student/certificates/pages/StudentCertificatesPage.vue"),
  profile: () => import("../../modules/student/profile/pages/StudentProfilePage.vue"),
  announcements: () => import("../../modules/student/announcements/pages/StudentAnnouncementsPage.vue"),
  settings: () => import("../../modules/student/settings/pages/StudentSettingsPage.vue"),
} as const;

const adminChildRoutes = adminNavigationItems.map((item) => ({
  path: item.path.replace("/admin/", ""),
  name: item.name,
  component: adminPageComponents[item.name as keyof typeof adminPageComponents],
  meta: {
    title: item.label,
    subtitle: item.description,
    workspace: "admin",
  },
}));

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      redirect: { name: "login" },
    },
    {
      path: "/admin",
      component: AdminLayout,
      children: [
        {
          path: "",
          redirect: { name: "dashboard" },
        },
        ...adminChildRoutes,
        {
          path: "students",
          redirect: { name: "members" },
        },
        {
          path: "members/:memberId",
          name: "member-details",
          component: () => import("../../pages/StudentDetailsPage.vue"),
          meta: {
            title: "Member details",
            subtitle: "Profile and internship drill-down",
            workspace: "admin",
          },
        },
        {
          path: "members/:memberId/attendance",
          name: "member-attendance-history",
          component: () => import("../../pages/StudentAttendanceHistoryPage.vue"),
          meta: {
            title: "Attendance history",
            subtitle: "Detailed attendance records by member",
            workspace: "admin",
          },
        },
      ],
    },
    {
      path: "/student",
      component: StudentLayout,
      meta: { workspace: "student" },
      children: [
        {
          path: "",
          redirect: { name: "student-dashboard" },
        },
        {
          path: "dashboard",
          name: "student-dashboard",
          component: studentPageComponents.dashboard,
          meta: {
            title: "Dashboard",
            subtitle: "Student workspace overview",
          },
        },
        {
          path: "attendance",
          name: "student-attendance",
          component: studentPageComponents.attendance,
          meta: {
            title: "Attendance",
            subtitle: "View your attendance history",
          },
        },
        {
          path: "worked-hours",
          name: "student-worked-hours",
          component: studentPageComponents.workedHours,
          meta: {
            title: "Worked Hours",
            subtitle: "Track completed and remaining hours",
          },
        },
        {
          path: "calendar",
          name: "student-calendar",
          component: studentPageComponents.calendar,
          meta: {
            title: "Calendar",
            subtitle: "Attendance calendar overview",
          },
        },
        {
          path: "internship",
          name: "student-internship",
          component: studentPageComponents.internship,
          meta: {
            title: "Internship Progress",
            subtitle: "Track required and completed hours",
          },
        },
        {
          path: "certificates",
          name: "student-certificates",
          component: studentPageComponents.certificates,
          meta: {
            title: "Certificates",
            subtitle: "Preview internship completion certificates",
          },
        },
        {
          path: "profile",
          name: "student-profile",
          component: studentPageComponents.profile,
          meta: {
            title: "Profile",
            subtitle: "Personal and course information",
          },
        },
        {
          path: "announcements",
          name: "student-announcements",
          component: studentPageComponents.announcements,
          meta: {
            title: "Announcements",
            subtitle: "Latest student updates",
          },
        },
        {
          path: "settings",
          name: "student-settings",
          component: studentPageComponents.settings,
          meta: {
            title: "Settings",
            subtitle: "Student portal preferences",
          },
        },
      ],
    },
    {
      path: "/portal",
      name: "student-portal",
      redirect: { name: "student-dashboard" },
    },
    {
      path: "/login",
      component: LoginLayout,
      children: [
        {
          path: "",
          name: "login",
          component: () => import("../../modules/authentication/pages/LoginPage.vue"),
          meta: {
            title: "Login",
            subtitle: "Select your workspace",
            workspace: "authentication",
          },
        },
      ],
    },
    {
      path: "/:pathMatch(.*)*",
      redirect: { name: "login" },
    },
  ],
  scrollBehavior() {
    return { top: 0 };
  },
});

router.beforeEach((to) => {
  const authStore = useAuthStore(pinia);

  if (!authStore.isAuthenticated) {
    authStore.rehydrateSession();
  }

  const isAuthRoute = to.path.startsWith("/login");
  const isAdminRoute = to.path.startsWith("/admin");
  const isStudentRoute = to.path.startsWith("/student");

  if (!authStore.isAuthenticated) {
    return isAuthRoute ? true : { name: "login" };
  }

  if (isAuthRoute) {
    return authStore.hasRole("administrator") ? { name: "dashboard" } : { name: "student-dashboard" };
  }

  if (authStore.hasRole("administrator") && isStudentRoute) {
    return { name: "dashboard" };
  }

  if (authStore.hasRole("student") && isAdminRoute) {
    return { name: "student-dashboard" };
  }

  return true;
});

export default router;