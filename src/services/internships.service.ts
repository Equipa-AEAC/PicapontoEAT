import type { InternshipDetails, InternshipFormValues, InternshipProgressUpdateValues, InternshipSummary } from "../types/internships";

import { cloneRecord, mockRequest } from "./mockTransport";
import { mockDatabase } from "./mockDatabase";
import { INTERNSHIP_HOST_ENTITY } from "../shared/constants";

export interface CertificatePreview {
  fileName: string;
  issuedAt: string;
  summary: string;
}

export async function listInternships(): Promise<InternshipSummary[]> {
  return mockRequest(() => cloneRecord(mockDatabase.internships));
}

export async function getInternshipByStudentId(studentId: string): Promise<InternshipDetails | null> {
  return mockRequest(() => cloneRecord(mockDatabase.internships.find((item) => item.studentId === studentId) ?? null));
}

export async function assignInternship(values: InternshipFormValues): Promise<InternshipDetails> {
  return mockRequest(() => {
    const member = mockDatabase.members.find((item) => item.id === values.studentId);

    if (!member) {
      throw new Error("Member not found.");
    }

    if (mockDatabase.internships.some((item) => item.studentId === member.id)) {
      throw new Error("This member already has an internship assigned.");
    }

    const createdInternship: InternshipDetails = {
      id: `int-${mockDatabase.internships.length + 1}`,
      studentId: member.id,
      studentName: member.fullName,
      // Equipa Técnica runs inside the school, so the host is never configurable.
      hostEntity: INTERNSHIP_HOST_ENTITY,
      requiredHours: values.requiredHours,
      completedHours: 0,
      remainingHours: values.requiredHours,
      orientador: values.orientador,
      monitor: values.monitor,
      startDate: values.startDate,
      endDate: values.endDate,
      status: values.status,
      notes: values.notes,
      certificateIssuedAt: null,
    };

    mockDatabase.internships.unshift(createdInternship);
    member.internshipStatus = "in-progress";
    return cloneRecord(createdInternship);
  });
}

export async function updateInternshipProgress(studentId: string, values: InternshipProgressUpdateValues): Promise<InternshipDetails> {
  return mockRequest(() => {
    const internship = mockDatabase.internships.find((item) => item.studentId === studentId);

    if (!internship) {
      throw new Error("Internship not found.");
    }

    // FCT hours only — a member's volunteer team hours are tracked separately.
    internship.completedHours = Math.min(internship.completedHours + values.completedHours, internship.requiredHours);
    internship.remainingHours = Math.max(internship.requiredHours - internship.completedHours, 0);
    internship.notes = values.notes;
    internship.status = internship.remainingHours === 0 ? "complete" : internship.status;

    const member = mockDatabase.members.find((item) => item.id === studentId);
    if (member) {
      member.internshipStatus = internship.status === "complete" ? "complete" : "in-progress";
    }

    return cloneRecord(internship);
  });
}

/** Official FCT internship completion certificate. Only for members who are interns. */
export async function generateCertificatePreview(studentId: string): Promise<CertificatePreview | null> {
  return mockRequest(() => {
    const internship = mockDatabase.internships.find((item) => item.studentId === studentId);

    if (!internship || internship.status !== "complete") {
      return null;
    }

    return {
      fileName: `${studentId}-fct-internship-certificate.pdf`,
      issuedAt: new Date().toISOString(),
      summary: `Official FCT internship certificate for ${internship.studentName} — ${internship.completedHours}h completed at ${internship.hostEntity}.`,
    };
  });
}

/**
 * Surplus-hours certificate for volunteer team work. Available to every team member
 * and completely independent of whether they also carry out an FCT internship.
 */
export async function generateSurplusCertificatePreview(memberId: string): Promise<CertificatePreview | null> {
  return mockRequest(() => {
    const member = mockDatabase.members.find((item) => item.id === memberId);

    if (!member || member.teamHours <= 0) {
      return null;
    }

    return {
      fileName: `${memberId}-equipa-surplus-hours-certificate.pdf`,
      issuedAt: new Date().toISOString(),
      summary: `Equipa Técnica surplus-hours certificate for ${member.fullName} — ${member.teamHours}h of volunteer team work at ${INTERNSHIP_HOST_ENTITY}.`,
    };
  });
}
