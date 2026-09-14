/**
 * Sidebar entries and route titles, keyed by the route/entry name.
 *
 * The navigation definitions in `app/router/*Navigation.ts` hold these keys
 * rather than literal text, so the sidebar, the topbar location line and the
 * Settings reordering list all read the same translation.
 */
export default {
  /* ------------------------------------------------------------- Student */
  "student-dashboard": { label: "Dashboard", description: "Personal overview" },
  "student-attendance": { label: "Attendance", description: "Daily records and status" },
  "student-worked-hours": { label: "Worked hours", description: "Internship progress, hours and milestones" },
  "student-calendar": { label: "Calendar", description: "Your days, events and deadlines" },
  "student-project-management": { label: "Project management", description: "Projects and tasks" },
  "student-projects": { label: "Projects", description: "The projects you are on. Open one to work on its board" },
  "student-tasks": { label: "My tasks", description: "Everything assigned to you, most urgent first" },
  "student-project-detail": { label: "Project", description: "Board, tasks and activity for one project" },
  "student-daily-log": { label: "Daily report", description: "Register what you did today" },
  "student-reports": { label: "Internship reports", description: "Monthly and final reports" },
  "student-certificates": { label: "Certificates", description: "Request and download your records" },
  "student-moments": { label: "Team moments", description: "Today's photos from the team" },
  "student-announcements": { label: "Announcements", description: "Latest notices addressed to you" },
  "student-profile": { label: "Profile", description: "Personal information" },
  "student-settings": { label: "Settings", description: "Portal preferences" },

  /* --------------------------------------------------------------- Admin */
  dashboard: { label: "Dashboard", description: "Operations overview" },
  members: { label: "Members", description: "Student and Equipa Técnica roster" },
  "member-details": { label: "Member details", description: "Profile and internship drill-down" },
  "member-attendance-history": { label: "Attendance history", description: "Detailed attendance records by member" },
  cards: { label: "Cards", description: "RFID card inventory and assignment" },
  attendance: { label: "Attendance", description: "Scans, validations and history" },
  calendar: { label: "Calendar", description: "Attendance, team events and deadlines by day" },
  internships: { label: "Internships", description: "FCT placements and surplus hours" },
  "project-management": { label: "Project management", description: "Projects, tasks and team" },
  "projects-overview": { label: "Overview", description: "Progress, deadlines and workload at a glance" },
  projects: { label: "Projects", description: "Every project the team is running" },
  "project-details": { label: "Project", description: "Tasks, team and activity for one project" },
  "project-tasks": { label: "Tasks", description: "Work items across every project" },
  "project-team": { label: "Team", description: "Who is assigned to what, and how much" },
  "project-activity": { label: "Activity", description: "Everything that happened across the projects" },
  "team-moments": { label: "Team moments", description: "Today's photos from the workshop and the labs" },
  reports: { label: "Reports", description: "Monthly and final internship reports to review" },
  announcements: { label: "Announcements", description: "Targeted notices for members" },
  certificates: { label: "Certificates", description: "Issued completion records" },
  devices: { label: "Devices", description: "Terminal health and firmware" },
  audit: { label: "Audit", description: "System logs and actions" },
  users: { label: "Users", description: "Staff accounts with system access" },
  settings: { label: "Settings", description: "System configuration and access" },

  /* ----------------------------------------------------------------- Auth */
  login: { label: "Sign in", description: "Choose your workspace" },
} as const;
