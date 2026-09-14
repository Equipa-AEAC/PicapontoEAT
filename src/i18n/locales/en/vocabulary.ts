/**
 * Every enumerated value the product shows a name for.
 *
 * One file, because these are the words that must not drift: "In review" has to
 * read the same on the board, in the report queue and in a filter, and the way
 * to guarantee that is for all three to read the same key. Anything that is a
 * *sentence* belongs to its page's domain; anything that is the name of a
 * database value belongs here.
 */
export default {
  attendanceStatus: {
    present: "Present",
    late: "Late",
    missing: "Missing",
    corrected: "Corrected",
  },

  attendanceCorrectionReason: {
    "forgot-to-check-out": "Forgot to check out",
    "wrong-device": "Wrong device",
    "duplicate-scan": "Duplicate scan",
    "manual-entry": "Manual entry",
  },

  /**
   * The rows an audit entry can be about, and what was done to one.
   *
   * The audit log stores these as database nouns (`attendance-correction`), and
   * the interface was printing them raw — which read as "Attendance-correction
   * added" beside otherwise translated copy.
   */
  auditEntity: {
    attendance: "Attendance record",
    "attendance-correction": "Correction request",
    "calendar-event": "Calendar event",
    card: "Card",
    certificate: "Certificate",
    "certificate-request": "Certificate request",
    device: "Device",
    "final-report": "Final report",
    "monthly-report": "Monthly report",
    "participation-period": "Participation period",
    "profile-change-request": "Profile change request",
    project: "Project",
    "project-task": "Task",
    user: "Account",
    member: "Member",
  },

  auditAction: {
    CREATE: "Created",
    UPDATE: "Updated",
    DELETE: "Removed",
  },

  memberStatus: {
    active: "Active",
    inactive: "Inactive",
    pending: "Pending",
    graduated: "Graduated",
  },

  memberInternshipStatus: {
    "not-assigned": "No placement",
    "in-progress": "On placement",
    complete: "Placement complete",
  },

  participationKind: {
    "team-member": "Technical Team",
    internship: "Internship",
  },

  participationCredit: {
    "team-member": "Counts towards the surplus-hours certificate",
    internship: "Counts towards the FCT internship requirement",
  },

  correctionStatus: {
    pending: "Waiting for review",
    approved: "Approved",
    rejected: "Not changed",
    withdrawn: "Withdrawn",
  },

  correctionKind: {
    "missing-entry": "My check-in is missing",
    "missing-exit": "My check-out is missing",
    "wrong-times": "The times are wrong",
    "wrong-day": "I was not here on this day",
    "not-mine": "This is not my record",
  },

  correctionKindShort: {
    "missing-entry": "Missing check-in",
    "missing-exit": "Missing check-out",
    "wrong-times": "Wrong times",
    "wrong-day": "Wrong day",
    "not-mine": "Not my record",
  },

  reportStatus: {
    draft: "Draft",
    submitted: "Under review",
    approved: "Approved",
    rejected: "Returned for revision",
  },

  dailyLogStatus: {
    draft: "Draft",
    submitted: "Submitted",
  },

  reportType: {
    attendance: "Attendance",
    "team-hours": "Team hours (surplus)",
    internship: "Internship (FCT)",
    project: "Project delivery",
    student: "Member",
    device: "Device",
  },

  internshipStatus: {
    planned: "Planned",
    active: "Active",
    paused: "Paused",
    complete: "Complete",
  },

  certificateKind: {
    surplus: "Surplus-hours certificate",
    fct: "FCT internship certificate",
  },

  certificateRequestStatus: {
    requested: "Waiting for review",
    approved: "Approved",
    rejected: "Rejected",
  },

  announcementAudience: {
    all: "Everyone",
    "equipa-hours": "Surplus-hours members",
    "official-internship": "Official interns",
  },

  announcementStatus: {
    draft: "Draft",
    published: "Published",
    archived: "Archived",
  },

  announcementPriority: {
    normal: "Normal",
    important: "Important",
    urgent: "Urgent",
  },

  calendarVisibility: {
    personal: "Only me",
    team: "Everyone in the team",
    project: "People on a project",
  },

  calendarVisibilityHint: {
    personal: "Nobody else sees this.",
    team: "Every Equipa Técnica member sees it on their calendar.",
    project: "Only the people assigned to the project you pick.",
  },

  calendarCategory: {
    session: "Work session",
    meeting: "Meeting",
    deadline: "Deadline",
    other: "Other",
  },

  momentReportReason: {
    inappropriate: "Inappropriate content",
    "wrong-person": "Shows someone who did not consent",
    "not-work-related": "Not related to team work",
    other: "Other",
  },

  deviceStatus: {
    online: "Online",
    offline: "Offline",
    warning: "Warning",
    maintenance: "Maintenance",
  },

  firmwareChannel: {
    stable: "Stable",
    beta: "Beta",
    edge: "Edge",
  },

  cardStatus: {
    available: "Available",
    assigned: "Assigned",
    inactive: "Inactive",
    replaced: "Replaced",
  },

  userRole: {
    administrator: "Administrator",
    coordinator: "Coordinator",
    teacher: "Teacher",
    viewer: "Viewer",
  },

  userRoleDescription: {
    administrator: "Full control, including creating and deactivating other accounts.",
    coordinator: "Runs the roster: edit accounts and reset passwords, but cannot create or deactivate them.",
    teacher: "Read-only access to members, attendance and reports.",
    viewer: "Read-only access to reports and dashboards.",
  },

  permission: {
    "users:create": "Create accounts",
    "users:update": "Edit accounts",
    "users:reset-password": "Reset passwords",
    "users:deactivate": "Deactivate and reactivate accounts",
    "members:grant-access": "Grant roster members access",
    "settings:update": "Change system settings",
  },

  weekday: {
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
    sunday: "Sunday",
  },

  program: {
    "equipa-hours": "Equipa Técnica — surplus hours",
    "official-internship": "Official internship (FCT)",
  },
} as const;
