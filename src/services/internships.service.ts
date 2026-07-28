import type { InternshipDetails, InternshipFormValues, InternshipProgressUpdateValues, InternshipSummary } from "../types/internships";

import { cloneRecord, mockRequest } from "./mockTransport";
import { mockDatabase } from "./mockDatabase";

export async function listInternships(): Promise<InternshipSummary[]> {
  return mockRequest(() => cloneRecord(mockDatabase.internships));
}

export async function getInternshipByStudentId(studentId: string): Promise<InternshipDetails | null> {
  return mockRequest(() => cloneRecord(mockDatabase.internships.find((item) => item.studentId === studentId) ?? null));
}

export async function assignInternship(values: InternshipFormValues): Promise<InternshipDetails> {
  return mockRequest(() => {
    const student = mockDatabase.members.find((item) => item.id === values.studentId);

    if (!student) {
      throw new Error("Student not found.");
    }

    const createdInternship: InternshipDetails = {
      id: `int-${mockDatabase.internships.length + 1}`,
      studentId: student.id,
      studentName: student.fullName,
      requiredHours: values.requiredHours,
      completedHours: 0,
      remainingHours: values.requiredHours,
      supervisor: values.supervisor,
      startDate: values.startDate,
      endDate: values.endDate,
      status: values.status,
      notes: values.notes,
      certificateIssuedAt: null,
    };

    mockDatabase.internships.unshift(createdInternship);
    return cloneRecord(createdInternship);
  });
}

export async function updateInternshipProgress(studentId: string, values: InternshipProgressUpdateValues): Promise<InternshipDetails> {
  return mockRequest(() => {
    const internship = mockDatabase.internships.find((item) => item.studentId === studentId);

    if (!internship) {
      throw new Error("Internship not found.");
    }

    internship.completedHours = Math.min(internship.completedHours + values.completedHours, internship.requiredHours);
    internship.remainingHours = Math.max(internship.requiredHours - internship.completedHours, 0);
    internship.notes = values.notes;
    internship.status = internship.remainingHours === 0 ? "complete" : internship.status;
    return cloneRecord(internship);
  });
}

export async function generateCertificatePreview(studentId: string): Promise<{ fileName: string; issuedAt: string; summary: string } | null> {
  return mockRequest(() => {
    const internship = mockDatabase.internships.find((item) => item.studentId === studentId);

    if (!internship || internship.status !== "complete") {
      return null;
    }

    return {
      fileName: `${studentId}-internship-certificate.pdf`,
      issuedAt: new Date().toISOString(),
      summary: `Certificate preview for ${internship.studentName}`,
    };
  });
}
