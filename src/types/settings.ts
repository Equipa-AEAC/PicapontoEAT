/*
 * The label maps that used to live here now live in `i18n/vocabulary.ts`.
 *
 * A `Record<Status, string>` is evaluated once at import, which cannot
 * survive a language change. The *values* and their order are still a
 * product decision and stay in this file; how to write them is not.
 */

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

/*
 * Notification settings used to live here: email and desktop toggles, a
 * recipients list and quiet hours. Nothing in the platform sends anything, so
 * every one of those controls configured a delivery mechanism that did not
 * exist. They were removed rather than left as decoration.
 *
 * What replaced them is the sidebar badge in `AppSidebarNav`: a count next to
 * the page that resolves it, drawn from the same collections that page reads.
 * It needs no delivery, cannot show a number the data does not support, and
 * renders nothing at zero.
 *
 * If real delivery is built later, see `docs/ai/BACKEND_CONTRACTS.md` for the
 * shape it should take.
 */

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
  security: SecuritySettings;
  workHours: WorkHoursSettings;
  logRetentionDays: number;
}
