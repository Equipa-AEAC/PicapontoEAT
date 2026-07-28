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

export interface NotificationSettings {
  emailEnabled: boolean;
  desktopEnabled: boolean;
  recipients: string;
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
  logRetentionDays: number;
}
