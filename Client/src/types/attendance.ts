export type AttendanceStatus = "present" | "late" | "missing" | "corrected";
export type AttendanceCorrectionReason = "forgot-to-check-out" | "wrong-device" | "duplicate-scan" | "manual-entry";

export interface AttendanceSummary {
  id: string;
  studentId: string;
  studentName: string;
  course: string;
  className: string;
  date: string;
  entry: string | null;
  exit: string | null;
  hours: number | null;
  deviceName: string;
  deviceId: string;
  status: AttendanceStatus;
  corrections: number;
  notes: string;
  createdBy: string;
  updatedBy: string | null;
  updatedAt: string | null;
}

export interface AttendanceDetails extends AttendanceSummary {}

export interface AttendanceFilters {
  query: string;
  course: string | "all";
  studentId: string | "all";
  deviceId: string | "all";
  status: AttendanceStatus | "all";
  dateRange: [string | null, string | null];
}

export interface AttendanceCorrectionFormValues {
  reason: AttendanceCorrectionReason;
  entryTime: string;
  exitTime: string;
  administratorNotes: string;
}

export interface ManualAttendanceFormValues {
  studentId: string;
  date: string;
  entry: string;
  exit: string;
  deviceId: string;
  notes: string;
}
