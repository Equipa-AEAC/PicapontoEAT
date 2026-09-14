import { createRouter, createWebHistory } from "vue-router";

import AdminLayout from "../layouts/AdminLayout.vue";
import LoginLayout from "../layouts/LoginLayout.vue";
import StudentLayout from "../layouts/StudentLayout.vue";
import { useAuthStore } from "../../modules/authentication";
import { pinia } from "../providers/pinia";
import { adminNavigationItems } from "./adminNavigation";

const adminPageComponents = {
  dashboard: () => import("../../modules/admin/dashboard/pages/AdminDashboardPage.vue"),
  members: () => import("../../modules/admin/members/pages/AdminMembersPage.vue"),
  cards: () => import("../../modules/admin/cards/pages/AdminCardsPage.vue"),
  attendance: () => import("../../modules/admin/attendance/pages/AdminAttendancePage.vue"),
  calendar: () => import("../../modules/admin/calendar/pages/AdminCalendarPage.vue"),
  internships: () => import("../../modules/admin/internships/pages/AdminInternshipsPage.vue"),
  announcements: () => import("../../modules/admin/announcements/pages/AdminAnnouncementsPage.vue"),
  certificates: () => import("../../modules/admin/certificates/pages/AdminCertificatesPage.vue"),
  devices: () => import("../../modules/admin/devices/pages/AdminDevicesPage.vue"),
  audit: () => import("../../modules/admin/audit/pages/AdminAuditPage.vue"),
  reports: () => import("../../modules/admin/reports/pages/AdminReportsPage.vue"),
  users: () => import("../../modules/admin/users/pages/AdminUsersPage.vue"),
  settings: () => import("../../modules/admin/settings/pages/AdminSettingsPage.vue"),
  "projects-overview": () => import("../../modules/admin/projects/pages/ProjectsOverviewPage.vue"),
  projects: () => import("../../modules/admin/projects/pages/ProjectsListPage.vue"),
  "project-tasks": () => import("../../modules/admin/projects/pages/ProjectTasksPage.vue"),
  "project-team": () => import("../../modules/admin/projects/pages/ProjectTeamPage.vue"),
  "project-activity": () => import("../../modules/admin/projects/pages/ProjectActivityPage.vue"),
  "team-moments": () => import("../../modules/admin/moments/pages/AdminTeamMomentsPage.vue"),
} as const;

const studentPageComponents = {
  dashboard: () => import("../../modules/student/dashboard/StudentPortalPage.vue"),
  attendance: () => import("../../modules/student/attendance/pages/StudentAttendancePage.vue"),
  workedHours: () => import("../../modules/student/worked-hours/pages/StudentWorkedHoursPage.vue"),
  calendar: () => import("../../modules/student/calendar/pages/StudentCalendarPage.vue"),
  dailyLog: () => import("../../modules/student/daily-log/pages/StudentDailyLogPage.vue"),
  reports: () => import("../../modules/student/reports/pages/StudentReportsPage.vue"),
  certificates: () => import("../../modules/student/certificates/pages/StudentCertificatesPage.vue"),
  profile: () => import("../../modules/student/profile/pages/StudentProfilePage.vue"),
  announcements: () => import("../../modules/student/announcements/pages/StudentAnnouncementsPage.vue"),
  settings: () => import("../../modules/student/settings/pages/StudentSettingsPage.vue"),
  moments: () => import("../../modules/student/moments/pages/StudentTeamMomentsPage.vue"),
  projects: () => import("../../modules/student/projects/pages/StudentProjectsPage.vue"),
  projectDetail: () => import("../../modules/student/projects/pages/StudentProjectDetailPage.vue"),
  tasks: () => import("../../modules/student/projects/pages/StudentTasksPage.vue"),
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
  history: createWebHistory(),
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
          path: "projects",
          redirect: { name: "projects-overview" },
        },
        {
          // Team moments moved out of the project group; keep old links alive.
          path: "projects/moments",
          redirect: { name: "team-moments" },
        },
        {
          /*
           * Kept under an explicit `detail` segment so a project id can never be
           * mistaken for one of the workspace pages above it.
           */
          path: "projects/detail/:projectId",
          name: "project-details",
          component: () => import("../../modules/admin/projects/pages/ProjectDetailsPage.vue"),
          meta: {
            title: "nav.project-details.label",
            subtitle: "nav.project-details.description",
            workspace: "admin",
          },
        },
        {
          path: "members/:memberId",
          name: "member-details",
          component: () => import("../../modules/admin/members/pages/MemberDetailsPage.vue"),
          meta: {
            title: "nav.member-details.label",
            subtitle: "nav.member-details.description",
            workspace: "admin",
          },
        },
        {
          path: "members/:memberId/attendance",
          name: "member-attendance-history",
          component: () => import("../../modules/admin/members/pages/MemberAttendanceHistoryPage.vue"),
          meta: {
            title: "nav.member-attendance-history.label",
            subtitle: "nav.member-attendance-history.description",
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
            title: "nav.student-dashboard.label",
            subtitle: "nav.student-dashboard.description",
          },
        },
        {
          path: "attendance",
          name: "student-attendance",
          component: studentPageComponents.attendance,
          meta: {
            title: "nav.student-attendance.label",
            subtitle: "nav.student-attendance.description",
          },
        },
        {
          path: "worked-hours",
          name: "student-worked-hours",
          component: studentPageComponents.workedHours,
          meta: {
            title: "nav.student-worked-hours.label",
            subtitle: "nav.student-worked-hours.description",
          },
        },
        {
          path: "calendar",
          name: "student-calendar",
          component: studentPageComponents.calendar,
          meta: {
            title: "nav.student-calendar.label",
            subtitle: "nav.student-calendar.description",
          },
        },
        {
          path: "daily-log",
          name: "student-daily-log",
          component: studentPageComponents.dailyLog,
          meta: {
            title: "nav.student-daily-log.label",
            subtitle: "nav.student-daily-log.description",
          },
        },
        {
          path: "reports",
          name: "student-reports",
          component: studentPageComponents.reports,
          meta: {
            title: "nav.student-reports.label",
            subtitle: "nav.student-reports.description",
          },
        },
        {
          path: "certificates",
          name: "student-certificates",
          component: studentPageComponents.certificates,
          meta: {
            title: "nav.student-certificates.label",
            subtitle: "nav.student-certificates.description",
          },
        },
        {
          path: "profile",
          name: "student-profile",
          component: studentPageComponents.profile,
          meta: {
            title: "nav.student-profile.label",
            subtitle: "nav.student-profile.description",
          },
        },
        {
          path: "announcements",
          name: "student-announcements",
          component: studentPageComponents.announcements,
          meta: {
            title: "nav.student-announcements.label",
            subtitle: "nav.student-announcements.description",
          },
        },
        {
          // Internship was merged into Worked Hours; keep old links alive.
          path: "internship",
          redirect: { name: "student-worked-hours" },
        },
        {
          path: "projects",
          name: "student-projects",
          component: studentPageComponents.projects,
          meta: {
            title: "nav.student-projects.label",
            subtitle: "nav.student-projects.description",
          },
        },
        {
          path: "projects/tasks",
          name: "student-tasks",
          component: studentPageComponents.tasks,
          meta: {
            title: "nav.student-tasks.label",
            subtitle: "nav.student-tasks.description",
          },
        },
        {
          /*
           * Under an explicit `detail` segment so a project id can never be
           * mistaken for `tasks` above it — the same guard the admin routes use.
           */
          path: "projects/detail/:projectId",
          name: "student-project-detail",
          component: studentPageComponents.projectDetail,
          meta: {
            title: "nav.student-project-detail.label",
            subtitle: "nav.student-project-detail.description",
          },
        },
        {
          // My Work became My tasks inside Project management; keep old links alive.
          path: "my-work",
          redirect: { name: "student-tasks" },
        },
        {
          path: "moments",
          name: "student-moments",
          component: studentPageComponents.moments,
          meta: {
            title: "nav.student-moments.label",
            subtitle: "nav.student-moments.description",
          },
        },
        {
          path: "settings",
          name: "student-settings",
          component: studentPageComponents.settings,
          meta: {
            title: "nav.student-settings.label",
            subtitle: "nav.student-settings.description",
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
            title: "nav.login.label",
            subtitle: "nav.login.description",
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