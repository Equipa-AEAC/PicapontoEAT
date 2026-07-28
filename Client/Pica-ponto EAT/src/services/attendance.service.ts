import type { AttendanceCorrectionFormValues, AttendanceDetails, AttendanceFilters, AttendanceSummary, ManualAttendanceFormValues } from "../types/attendance";
import type { AttendanceScanPayload } from "../types/dashboard";

import { cloneRecord, mockRequest } from "./mockTransport";
import { mockDatabase } from "./mockDatabase";

export async function listAttendance(filters: Partial<AttendanceFilters> = {}): Promise<AttendanceSummary[]> {
  return mockRequest(() => {
    const query = filters.query?.trim().toLowerCase() ?? "";

    return cloneRecord(
      mockDatabase.attendance.filter((item) => {
        const matchesQuery =
          query.length === 0 || [item.studentName, item.course, item.className, item.deviceName].join(" ").toLowerCase().includes(query);
        const matchesStatus = !filters.status || filters.status === "all" || item.status === filters.status;
        const matchesCourse = !filters.course || filters.course === "all" || item.course === filters.course;
        const matchesStudent = !filters.studentId || filters.studentId === "all" || item.studentId === filters.studentId;
        const matchesDevice = !filters.deviceId || filters.deviceId === "all" || item.deviceId === filters.deviceId;

        return matchesQuery && matchesStatus && matchesCourse && matchesStudent && matchesDevice;
      }),
    );
  });
}

export async function getAttendanceDetails(attendanceId: string): Promise<AttendanceDetails | null> {
  return mockRequest(() => cloneRecord(mockDatabase.attendance.find((item) => item.id === attendanceId) ?? null));
}

export async function listRecentAttendance(limit = 10): Promise<AttendanceSummary[]> {
  return mockRequest(() => cloneRecord(mockDatabase.attendance.slice(0, limit)));
}

export async function registerAttendanceScan(payload: AttendanceScanPayload): Promise<AttendanceDetails> {
  return mockRequest(() => {
    const createdRecord: AttendanceDetails = {
      id: `att-${mockDatabase.attendance.length + 1}`,
      studentId: payload.uid,
      studentName: "New scan pending resolution",
      course: "Unknown",
      className: "Unknown",
      date: payload.timestamp.slice(0, 10),
      entry: payload.timestamp.slice(11, 16),
      exit: null,
      hours: null,
      deviceName: payload.deviceId,
      deviceId: payload.deviceId,
      status: "present",
      corrections: 0,
      notes: "Created by manual scan registration.",
      createdBy: "System",
      updatedBy: null,
      updatedAt: null,
    };

    mockDatabase.attendance.unshift(createdRecord);
    return cloneRecord(createdRecord);
  });
}

export async function createManualAttendance(values: ManualAttendanceFormValues): Promise<AttendanceDetails> {
  return mockRequest(() => {
    const createdRecord: AttendanceDetails = {
      id: `att-${mockDatabase.attendance.length + 1}`,
      studentId: values.studentId,
      studentName: values.studentId,
      course: "Manual entry",
      className: "Manual entry",
      date: values.date,
      entry: values.entry,
      exit: values.exit,
      hours: 0,
      deviceName: values.deviceId,
      deviceId: values.deviceId,
      status: "corrected",
      corrections: 1,
      notes: values.notes,
      createdBy: "Administrator",
      updatedBy: "Administrator",
      updatedAt: new Date().toISOString(),
    };

    mockDatabase.attendance.unshift(createdRecord);
    return cloneRecord(createdRecord);
  });
}

export async function applyAttendanceCorrection(attendanceId: string, values: AttendanceCorrectionFormValues): Promise<AttendanceDetails> {
  return mockRequest(() => {
    const currentRecord = mockDatabase.attendance.find((item) => item.id === attendanceId);

    if (!currentRecord) {
      throw new Error("Attendance record not found.");
    }

    currentRecord.entry = values.entryTime;
    currentRecord.exit = values.exitTime;
    currentRecord.status = "corrected";
    currentRecord.corrections += 1;
    currentRecord.notes = values.administratorNotes;
    currentRecord.updatedBy = "Administrator";
    currentRecord.updatedAt = new Date().toISOString();

    return cloneRecord(currentRecord);
  });
}

export async function deleteAttendance(attendanceId: string): Promise<void> {
  await mockRequest(() => {
    mockDatabase.attendance = mockDatabase.attendance.filter((item) => item.id !== attendanceId);
  });
}