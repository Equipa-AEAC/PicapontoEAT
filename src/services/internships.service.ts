import type { InternshipDetails, InternshipFormValues, InternshipProgressUpdateValues, InternshipSummary, StoredInternship } from "../types/internships";

import { cloneRecord, mockRequest } from "./mockTransport";
import { mockDatabase } from "./mockDatabase";
import { INTERNSHIP_HOST_ENTITY } from "../shared/constants";
import { computeParticipationHours } from "./participation.service";
import { t } from "../i18n";

/**
 * Fill in the hours an internship has actually accrued.
 *
 * `completedHours` is the sum of attendance inside the member's *internship*
 * participation periods — never their volunteer hours, and never a number typed
 * by an administrator. It used to be manually accumulated and stored in four
 * places; the audit in docs/ai/PROJECT_CONTEXT.md records why that had to go.
 *
 * `requiredHours` is left alone. It is what the school demands, not a measurement.
 */
function withDerivedHours(internship: StoredInternship): InternshipDetails {
  const completedHours = computeParticipationHours(internship.studentId).internshipHours;

  return {
    ...internship,
    completedHours,
    remainingHours: Math.max(internship.requiredHours - completedHours, 0),
  };
}

export interface CertificatePreview {
  fileName: string;
  issuedAt: string;
  summary: string;
}

export async function listInternships(): Promise<InternshipSummary[]> {
  return mockRequest(() => cloneRecord(mockDatabase.internships.map(withDerivedHours)));
}

export async function getInternshipByStudentId(studentId: string): Promise<InternshipDetails | null> {
  return mockRequest(() => {
    const internship = mockDatabase.internships.find((item) => item.studentId === studentId);
    return internship ? cloneRecord(withDerivedHours(internship)) : null;
  });
}

export async function assignInternship(values: InternshipFormValues): Promise<InternshipDetails> {
  return mockRequest(() => {
    const member = mockDatabase.members.find((item) => item.id === values.studentId);

    if (!member) {
      throw new Error(t("errors.memberNotFound"));
    }

    if (mockDatabase.internships.some((item) => item.studentId === member.id)) {
      throw new Error(t("errors.internshipAlreadyAssigned"));
    }

    const createdInternship: StoredInternship = {
      id: `int-${mockDatabase.internships.length + 1}`,
      studentId: member.id,
      studentName: member.fullName,
      // Equipa Técnica runs inside the school, so the host is never configurable.
      hostEntity: INTERNSHIP_HOST_ENTITY,
      requiredHours: values.requiredHours,
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

    /*
     * Deliberately does NOT create the matching participation period. Assigning an
     * internship record and deciding which days its hours start counting from are
     * two separate acts, and guessing the second would silently re-bucket
     * attendance the member already has. Staff record the period explicitly.
     */
    return cloneRecord(withDerivedHours(createdInternship));
  });
}

export async function updateInternshipProgress(studentId: string, values: InternshipProgressUpdateValues): Promise<InternshipDetails> {
  return mockRequest(() => {
    const internship = mockDatabase.internships.find((item) => item.studentId === studentId);

    if (!internship) {
      throw new Error(t("errors.internshipNotFound"));
    }

    /*
     * Hours are no longer entered here.
     *
     * This used to add a number to `completedHours`, which is why the internship
     * hour totals reconciled with neither attendance nor each other. Hours now
     * come from the attendance inside the member's internship periods, so what is
     * left for a reviewer to set is the placement's state and its notes.
     */
    internship.notes = values.notes;
    internship.status = values.status;

    const member = mockDatabase.members.find((item) => item.id === studentId);
    if (member) {
      member.internshipStatus = internship.status === "complete" ? "complete" : "in-progress";
    }

    return cloneRecord(withDerivedHours(internship));
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
      summary: `Official FCT internship certificate for ${internship.studentName} — ${computeParticipationHours(studentId).internshipHours}h completed at ${internship.hostEntity}.`,
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
    const teamHours = member ? computeParticipationHours(memberId).teamHours : 0;

    if (!member || teamHours <= 0) {
      return null;
    }

    return {
      fileName: `${memberId}-equipa-surplus-hours-certificate.pdf`,
      issuedAt: new Date().toISOString(),
      summary: `Equipa Técnica surplus-hours certificate for ${member.fullName} — ${teamHours}h of volunteer team work at ${INTERNSHIP_HOST_ENTITY}.`,
    };
  });
}
