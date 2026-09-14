import { hasTranslation, t } from "./index";
import type {
  ProjectPriority,
  ProjectStatus,
  TaskStatus,
} from "../types/projects";
import { PROJECT_STATUS_ORDER, PROJECT_PRIORITY_ORDER, TASK_STATUS_ORDER } from "../types/projects";

/**
 * The translated names of the product's enumerations.
 *
 * These used to be `Record<Status, string>` constants next to the type. A
 * constant is evaluated once at module load, which is exactly wrong for a label
 * that has to change when the language does — so every one of them is a
 * *function* here. Called inside a `computed`, it re-runs on a language change;
 * called at module scope it would freeze, which is why no caller may hoist one
 * into a constant.
 *
 * Keeping them together also keeps the vocabulary consistent: there is one
 * translation of "In review" in the product, and this is where it lives.
 */

export interface LabelledOption<T> {
  label: string;
  value: T;
}

/* -------------------------------------------------------------- Projects */

export function projectStatusLabel(status: ProjectStatus): string {
  return t(`projects.status.${status}`);
}

export function projectStatusOptions(): LabelledOption<ProjectStatus>[] {
  return PROJECT_STATUS_ORDER.map((value) => ({ label: projectStatusLabel(value), value }));
}

export function projectPriorityLabel(priority: ProjectPriority): string {
  return t(`projects.priority.${priority}`);
}

export function projectPriorityOptions(): LabelledOption<ProjectPriority>[] {
  return PROJECT_PRIORITY_ORDER.map((value) => ({ label: projectPriorityLabel(value), value }));
}

export function taskStatusLabel(status: TaskStatus): string {
  return t(`projects.taskStatus.${status}`);
}

export function taskStatusOptions(): LabelledOption<TaskStatus>[] {
  return TASK_STATUS_ORDER.map((value) => ({ label: taskStatusLabel(value), value }));
}

/**
 * A participant's standing, which the service supplies as a translation key.
 *
 * The service assembles participants from two tables and has no view layer, so
 * it records *which* role rather than how to write it. Anything that is not a
 * known key is passed through unchanged, which keeps a future role from
 * rendering as a raw key path.
 */
export function participantRoleLabel(role: string): string {
  return role.startsWith("projects.participantRole.") ? t(role) : role;
}

/* -------------------------------------------------------------- Activity */

/** Params whose value is a status code and therefore has to be translated. */
const STATUS_PARAMS = new Set(["status", "fromStatus", "toStatus"]);

/**
 * One timeline entry, in the language on screen.
 *
 * Falls back to the English `summary` for anything without a `messageKey` —
 * older rows, and anything a future backend writes as plain text. That fallback
 * is why the feed never renders a key path, and why it is worth keeping both
 * fields on the record.
 */
export function formatActivity(event: {
  summary: string;
  messageKey?: string | null;
  messageParams?: Record<string, string> | null;
}): string {
  if (!event.messageKey) {
    return event.summary;
  }

  const params: Record<string, string> = {};

  for (const [name, value] of Object.entries(event.messageParams ?? {})) {
    params[name] = STATUS_PARAMS.has(name) ? statusParamLabel(name, value) : value;
  }

  return t(event.messageKey, params);
}

/**
 * A status code inside an activity message. Project events carry a project
 * status, task events carry a task status, and the parameter name says which.
 */
function statusParamLabel(name: string, value: string): string {
  const isProjectStatus = name === "fromStatus" || name === "toStatus";

  return isProjectStatus
    ? projectStatusLabel(value as ProjectStatus)
    : taskStatusLabel(value as TaskStatus);
}

/* ============================================================ Enumerations */

/**
 * Every other enumerated value the product names.
 *
 * All of these follow the same shape — key path plus the raw value — so they are
 * generated from one helper rather than written out twenty times. `options()`
 * builds the `{label, value}` list a `BaseSelect` wants, in the order given.
 *
 * The one rule for callers: **never hoist these into a module constant.** They
 * read the active locale, and a constant would freeze whichever language was
 * loaded first.
 */
function labeller<T extends string>(group: string) {
  return (value: T): string => t(`vocabulary.${group}.${value}`);
}

function optionsFor<T extends string>(group: string, order: readonly T[]): LabelledOption<T>[] {
  return order.map((value) => ({ label: t(`vocabulary.${group}.${value}`), value }));
}

/* -------------------------------------------------------------- Attendance */

export const ATTENDANCE_STATUS_ORDER = ["present", "late", "missing", "corrected"] as const;
export type AttendanceStatusValue = (typeof ATTENDANCE_STATUS_ORDER)[number];
export const attendanceStatusLabel = labeller<AttendanceStatusValue>("attendanceStatus");
export const attendanceStatusOptions = () => optionsFor("attendanceStatus", ATTENDANCE_STATUS_ORDER);

export const CORRECTION_STATUS_ORDER = ["pending", "approved", "rejected", "withdrawn"] as const;
export const correctionStatusLabel = labeller<(typeof CORRECTION_STATUS_ORDER)[number]>("correctionStatus");
export const correctionStatusOptions = () => optionsFor("correctionStatus", CORRECTION_STATUS_ORDER);

export const CORRECTION_KIND_ORDER = [
  "missing-entry",
  "missing-exit",
  "wrong-times",
  "wrong-day",
  "not-mine",
] as const;
export const correctionKindLabel = labeller<(typeof CORRECTION_KIND_ORDER)[number]>("correctionKind");
export const correctionKindShortLabel = labeller<(typeof CORRECTION_KIND_ORDER)[number]>("correctionKindShort");
export const correctionKindOptions = () => optionsFor("correctionKind", CORRECTION_KIND_ORDER);

/* ----------------------------------------------------------- Participation */

export const PARTICIPATION_KIND_ORDER = ["team-member", "internship"] as const;
export type ParticipationKindValue = (typeof PARTICIPATION_KIND_ORDER)[number];
export const participationKindLabel = labeller<ParticipationKindValue>("participationKind");
export const participationCreditLabel = labeller<ParticipationKindValue>("participationCredit");
export const participationKindOptions = () => optionsFor("participationKind", PARTICIPATION_KIND_ORDER);

/* --------------------------------------------------------------- Reporting */

export const REPORT_STATUS_ORDER = ["draft", "submitted", "approved", "rejected"] as const;
export type ReportStatusValue = (typeof REPORT_STATUS_ORDER)[number];
export const reportStatusLabel = labeller<ReportStatusValue>("reportStatus");
export const reportStatusOptions = () => optionsFor("reportStatus", REPORT_STATUS_ORDER);

export const DAILY_LOG_STATUS_ORDER = ["draft", "submitted"] as const;
export const dailyLogStatusLabel = labeller<(typeof DAILY_LOG_STATUS_ORDER)[number]>("dailyLogStatus");

export const REPORT_TYPE_ORDER = [
  "attendance",
  "team-hours",
  "internship",
  "project",
  "student",
  "device",
] as const;
export const reportTypeLabel = labeller<(typeof REPORT_TYPE_ORDER)[number]>("reportType");
export const reportTypeOptions = () => optionsFor("reportType", REPORT_TYPE_ORDER);

/* -------------------------------------------------------------- Placements */

export const INTERNSHIP_STATUS_ORDER = ["planned", "active", "paused", "complete"] as const;
export const internshipStatusLabel = labeller<(typeof INTERNSHIP_STATUS_ORDER)[number]>("internshipStatus");
export const internshipStatusOptions = () => optionsFor("internshipStatus", INTERNSHIP_STATUS_ORDER);

export const CERTIFICATE_KIND_ORDER = ["surplus", "fct"] as const;
export const certificateKindLabel = labeller<(typeof CERTIFICATE_KIND_ORDER)[number]>("certificateKind");
export const certificateKindOptions = () => optionsFor("certificateKind", CERTIFICATE_KIND_ORDER);

export const CERTIFICATE_REQUEST_STATUS_ORDER = ["requested", "approved", "rejected"] as const;
export const certificateRequestStatusLabel = labeller<(typeof CERTIFICATE_REQUEST_STATUS_ORDER)[number]>(
  "certificateRequestStatus",
);

/* ----------------------------------------------------------- Announcements */

export const ANNOUNCEMENT_AUDIENCE_ORDER = ["all", "equipa-hours", "official-internship"] as const;
export const announcementAudienceLabel = labeller<(typeof ANNOUNCEMENT_AUDIENCE_ORDER)[number]>(
  "announcementAudience",
);
export const announcementAudienceOptions = () => optionsFor("announcementAudience", ANNOUNCEMENT_AUDIENCE_ORDER);

export const ANNOUNCEMENT_STATUS_ORDER = ["draft", "published", "archived"] as const;
export const announcementStatusLabel = labeller<(typeof ANNOUNCEMENT_STATUS_ORDER)[number]>("announcementStatus");
export const announcementStatusOptions = () => optionsFor("announcementStatus", ANNOUNCEMENT_STATUS_ORDER);

export const ANNOUNCEMENT_PRIORITY_ORDER = ["normal", "important", "urgent"] as const;
export const announcementPriorityLabel = labeller<(typeof ANNOUNCEMENT_PRIORITY_ORDER)[number]>(
  "announcementPriority",
);
export const announcementPriorityOptions = () => optionsFor("announcementPriority", ANNOUNCEMENT_PRIORITY_ORDER);

/* ---------------------------------------------------------------- Calendar */

export const CALENDAR_VISIBILITY_ORDER = ["personal", "team", "project"] as const;
export type CalendarVisibilityValue = (typeof CALENDAR_VISIBILITY_ORDER)[number];
export const calendarVisibilityLabel = labeller<CalendarVisibilityValue>("calendarVisibility");
export const calendarVisibilityHint = labeller<CalendarVisibilityValue>("calendarVisibilityHint");
export const calendarVisibilityOptions = () => optionsFor("calendarVisibility", CALENDAR_VISIBILITY_ORDER);

export const CALENDAR_CATEGORY_ORDER = ["session", "meeting", "deadline", "other"] as const;
export const calendarCategoryLabel = labeller<(typeof CALENDAR_CATEGORY_ORDER)[number]>("calendarCategory");
export const calendarCategoryOptions = () => optionsFor("calendarCategory", CALENDAR_CATEGORY_ORDER);

/* ----------------------------------------------------------------- Moments */

export const MOMENT_REPORT_REASON_ORDER = [
  "inappropriate",
  "wrong-person",
  "not-work-related",
  "other",
] as const;
export const momentReportReasonLabel = labeller<(typeof MOMENT_REPORT_REASON_ORDER)[number]>("momentReportReason");
export const momentReportReasonOptions = () => optionsFor("momentReportReason", MOMENT_REPORT_REASON_ORDER);

/* ------------------------------------------------------------ Roster and kit */

export const MEMBER_STATUS_ORDER = ["active", "inactive", "pending", "graduated"] as const;
export const memberStatusLabel = labeller<(typeof MEMBER_STATUS_ORDER)[number]>("memberStatus");
export const memberStatusOptions = () => optionsFor("memberStatus", MEMBER_STATUS_ORDER);

export const MEMBER_INTERNSHIP_STATUS_ORDER = ["not-assigned", "in-progress", "complete"] as const;
export const memberInternshipStatusLabel = labeller<(typeof MEMBER_INTERNSHIP_STATUS_ORDER)[number]>(
  "memberInternshipStatus",
);

export const DEVICE_STATUS_ORDER = ["online", "offline", "warning", "maintenance"] as const;
export const deviceStatusLabel = labeller<(typeof DEVICE_STATUS_ORDER)[number]>("deviceStatus");
export const deviceStatusOptions = () => optionsFor("deviceStatus", DEVICE_STATUS_ORDER);

export const FIRMWARE_CHANNEL_ORDER = ["stable", "beta", "edge"] as const;
export const firmwareChannelLabel = labeller<(typeof FIRMWARE_CHANNEL_ORDER)[number]>("firmwareChannel");
export const firmwareChannelOptions = () => optionsFor("firmwareChannel", FIRMWARE_CHANNEL_ORDER);

export const CARD_STATUS_ORDER = ["available", "assigned", "inactive", "replaced"] as const;
export const cardStatusLabel = labeller<(typeof CARD_STATUS_ORDER)[number]>("cardStatus");
export const cardStatusOptions = () => optionsFor("cardStatus", CARD_STATUS_ORDER);

/* ---------------------------------------------------------------- Accounts */

export const USER_ROLE_ORDER = ["administrator", "coordinator", "teacher", "viewer"] as const;
export type UserRoleValue = (typeof USER_ROLE_ORDER)[number];
export const userRoleLabel = labeller<UserRoleValue>("userRole");
export const userRoleDescription = labeller<UserRoleValue>("userRoleDescription");
export const userRoleOptions = () => optionsFor("userRole", USER_ROLE_ORDER);

export const permissionLabel = (permission: string): string => t(`vocabulary.permission.${permission}`);

/* ---------------------------------------------------------------- Weekdays */

export const WEEKDAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
export const weekdayLabel = labeller<(typeof WEEKDAY_ORDER)[number]>("weekday");

/** The two placement programmes a member can be on. */
export const programLabel = (program: string): string => t(`vocabulary.program.${program}`);

/* --------------------------------------------------- Profile change requests */

export const PROFILE_FIELD_ORDER = ["email", "phone", "photo"] as const;
export type ProfileFieldValue = (typeof PROFILE_FIELD_ORDER)[number];

/**
 * A requestable profile field, named and explained.
 *
 * These live under `student.profile` rather than in `vocabulary` because the
 * words are the student's own view of their record ("Email address", not
 * "email"), and only that page and the review queue ever show them.
 */
export function profileFieldLabel(field: ProfileFieldValue | string): string {
  return t(`student.profile.field${field.charAt(0).toUpperCase()}${field.slice(1)}`);
}

export function profileFieldHint(field: ProfileFieldValue | string): string {
  return t(`student.profile.hint${field.charAt(0).toUpperCase()}${field.slice(1)}`);
}

export function profileFieldOptions(): LabelledOption<ProfileFieldValue>[] {
  return PROFILE_FIELD_ORDER.map((value) => ({ label: profileFieldLabel(value), value }));
}

export function profileChangeStatusLabel(status: string): string {
  return t(`student.profile.changeStatus.${status}`);
}

export const ATTENDANCE_CORRECTION_REASON_ORDER = [
  "forgot-to-check-out",
  "wrong-device",
  "duplicate-scan",
  "manual-entry",
] as const;
export const attendanceCorrectionReasonLabel = labeller<(typeof ATTENDANCE_CORRECTION_REASON_ORDER)[number]>(
  "attendanceCorrectionReason",
);
export const attendanceCorrectionReasonOptions = () =>
  optionsFor("attendanceCorrectionReason", ATTENDANCE_CORRECTION_REASON_ORDER);


/* ------------------------------------------------------------------ Audit */

/**
 * What an audit row is about, and what happened to it.
 *
 * Unknown values fall through unchanged rather than rendering a key path: the
 * audit log is append-only and a row written by an older release must still be
 * readable.
 */
export function auditEntityLabel(entity: string): string {
  const key = `vocabulary.auditEntity.${entity}`;

  return hasTranslation(key) ? t(key) : entity;
}

export function auditActionLabel(action: string): string {
  const key = `vocabulary.auditAction.${action}`;

  return hasTranslation(key) ? t(key) : action;
}
