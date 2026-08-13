export interface AttendanceSettings {
  duplicateScanTimeoutMinutes: number;
  workingDayStart: string;
  workingDayEnd: string;
  entryToleranceMinutes: number;
  exitToleranceMinutes: number;
}

export interface DeviceSettings {
  otaEnabled: boolean;
  apiUrl: string;
  backupEnabled: boolean;
  backupPath: string;
}

/** Events an administrator can choose to be notified about. */
export type NotificationEvent =
  | "pending-corrections"
  | "daily-log-gaps"
  | "internship-milestones"
  | "device-offline"
  | "certificate-ready";

export const NOTIFICATION_EVENT_LABELS: Record<NotificationEvent, string> = {
  "pending-corrections": "Attendance corrections pending review",
  "daily-log-gaps": "A member stops writing daily entries",
  "internship-milestones": "An internship hits a milestone or falls behind",
  "device-offline": "A terminal goes offline",
  "certificate-ready": "A certificate becomes available to issue",
};

export interface NotificationSettings {
  emailEnabled: boolean;
  desktopEnabled: boolean;
  recipients: string;
  /** Events opted into. An event not listed here never notifies. */
  events: NotificationEvent[];
  /** Outside work hours, notifications are held rather than delivered. */
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

/** A device trusted to authorise this account. */
export interface TrustedDevice {
  id: string;
  name: string;
  lastUsedAt: string;
  current: boolean;
}

export interface SecuritySettings {
  /** Ask for confirmation the first time an account signs in from a new device. */
  confirmNewDevices: boolean;
  sessionTimeoutMinutes: number;
  twoFactorEnabled: boolean;
  trustedDevices: TrustedDevice[];
}

export type Weekday = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export const WEEKDAYS: Weekday[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

export interface WorkDaySchedule {
  weekday: Weekday;
  open: boolean;
  start: string;
  end: string;
}

/**
 * When Equipa Técnica actually operates. Drives the attendance expectations and
 * the quiet-hours window above — there is no point notifying someone at 3am.
 */
export interface WorkHoursSettings {
  schedule: WorkDaySchedule[];
  /** Hours a member is expected to be around for in a normal week. */
  expectedWeeklyHours: number;
  /** ISO dates the club is closed (holidays, breaks). */
  closedDates: string[];
}

export interface ApplicationSettings {
  schoolName: string;
  logoUrl: string;
  theme: "dark" | "light" | "system";
  language: string;
  timezone: string;
  attendance: AttendanceSettings;
  devices: DeviceSettings;
  notifications: NotificationSettings;
  security: SecuritySettings;
  workHours: WorkHoursSettings;
  logRetentionDays: number;
}
