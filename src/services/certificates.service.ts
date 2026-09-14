import type {
  CertificateKind,
  CertificateRequest,
  CertificateRequestStatus,
  CertificateTemplate,
  IssuedCertificate,
  SchoolCertificateProfile,
  SchoolCertificateProfileFormValues,
} from "../types/certificates";
import { certificateEligibility } from "../types/certificates";
import type { UploadedFile } from "./uploads.service";

import { appendAuditLog } from "./audit.service";
import { cloneRecord, mockRequest } from "./mockTransport";
import { mockDatabase } from "./mockDatabase";
import { computeParticipationHours } from "./participation.service";
import { INTERNSHIP_HOST_ENTITY } from "../shared/constants";
import { t } from "../i18n";

/*
 * Certificates.
 *
 * Two independent tracks, and one rule that governs both: a certificate is
 * generated because somebody approved a request for it, never because an
 * administrator scrolled past a row. `generateCertificate` is therefore no
 * longer called from a table — it is what `resolveCertificateRequest` does when
 * the answer is yes.
 *
 * BACKEND CONTRACT: eligibility is re-checked here, but the check runs in the
 * browser and the mock performs no authorization at all. The API must resolve
 * the member from the session, re-derive both hour buckets server-side, and
 * refuse a request for a certificate the member is not entitled to. Producing
 * the actual PDF is server work as well — `downloadUrl` below is a path, not a
 * file. See docs/ai/BACKEND_CONTRACTS.md § Certificates.
 */

/* ------------------------------------------------------------ Templates */

export async function listCertificateTemplates(): Promise<CertificateTemplate[]> {
  return mockRequest(() => cloneRecord(mockDatabase.certificateTemplates));
}

export async function saveCertificateTemplate(kind: CertificateKind, file: UploadedFile): Promise<CertificateTemplate> {
  return mockRequest(() => {
    const template: CertificateTemplate = { kind, file, uploadedAt: new Date().toISOString() };
    const index = mockDatabase.certificateTemplates.findIndex((item) => item.kind === kind);

    if (index >= 0) {
      mockDatabase.certificateTemplates.splice(index, 1, template);
    } else {
      mockDatabase.certificateTemplates.push(template);
    }

    return cloneRecord(template);
  });
}

export async function removeCertificateTemplate(kind: CertificateKind): Promise<void> {
  await mockRequest(() => {
    mockDatabase.certificateTemplates = mockDatabase.certificateTemplates.filter((item) => item.kind !== kind);
  });
}

/* ------------------------------------------------- School FCT profiles */

export async function listSchoolCertificateProfiles(): Promise<SchoolCertificateProfile[]> {
  return mockRequest(() =>
    cloneRecord(
      mockDatabase.schoolCertificateProfiles
        .slice()
        .sort((a, b) => a.schoolName.localeCompare(b.schoolName)),
    ),
  );
}

export async function saveSchoolCertificateProfile(
  values: SchoolCertificateProfileFormValues,
  profileId?: string,
): Promise<SchoolCertificateProfile> {
  return mockRequest(() => {
    const schoolName = values.schoolName.trim();

    if (!schoolName) {
      throw new Error(t("errors.profileNeedsSchool"));
    }

    const clash = mockDatabase.schoolCertificateProfiles.find(
      (item) => item.id !== profileId && item.schoolName.toLowerCase() === schoolName.toLowerCase(),
    );

    if (clash) {
      throw new Error(t("errors.schoolProfileExists"));
    }

    const existing = profileId
      ? mockDatabase.schoolCertificateProfiles.find((item) => item.id === profileId)
      : undefined;

    if (existing) {
      Object.assign(existing, {
        schoolName,
        signatoryName: values.signatoryName.trim(),
        signatoryRole: values.signatoryRole.trim(),
        notes: values.notes.trim(),
        updatedAt: new Date().toISOString(),
      });

      return cloneRecord(existing);
    }

    const created: SchoolCertificateProfile = {
      id: `scp-${mockDatabase.schoolCertificateProfiles.length + 1}-${Date.now()}`,
      schoolName,
      template: null,
      signatoryName: values.signatoryName.trim(),
      signatoryRole: values.signatoryRole.trim(),
      notes: values.notes.trim(),
      updatedAt: new Date().toISOString(),
    };

    mockDatabase.schoolCertificateProfiles.push(created);
    return cloneRecord(created);
  });
}

export async function saveSchoolProfileTemplate(
  profileId: string,
  file: UploadedFile | null,
): Promise<SchoolCertificateProfile> {
  return mockRequest(() => {
    const profile = mockDatabase.schoolCertificateProfiles.find((item) => item.id === profileId);

    if (!profile) {
      throw new Error(t("errors.certificateProfileGone"));
    }

    profile.template = file;
    profile.updatedAt = new Date().toISOString();
    return cloneRecord(profile);
  });
}

export async function deleteSchoolCertificateProfile(profileId: string): Promise<void> {
  return mockRequest(() => {
    mockDatabase.schoolCertificateProfiles = mockDatabase.schoolCertificateProfiles.filter(
      (item) => item.id !== profileId,
    );
  });
}

/**
 * The blank document a certificate of this kind is generated onto, for this member.
 *
 * Surplus is ours and is one document for everybody. FCT belongs to the school
 * the intern is *enrolled* at, so it resolves through that school's profile, and
 * falls back to the shared FCT template when no profile has been set up yet —
 * which is what lets the workflow run before every partner school is configured.
 */
function resolveTemplate(kind: CertificateKind, originSchool: string): { fileName: string } | null {
  if (kind === "surplus") {
    const template = mockDatabase.certificateTemplates.find((item) => item.kind === "surplus");
    return template ? { fileName: template.file.fileName } : null;
  }

  const profile = mockDatabase.schoolCertificateProfiles.find(
    (item) => item.schoolName.toLowerCase() === originSchool.trim().toLowerCase(),
  );

  if (profile?.template) {
    return { fileName: profile.template.fileName };
  }

  const shared = mockDatabase.certificateTemplates.find((item) => item.kind === "fct");
  return shared ? { fileName: shared.file.fileName } : null;
}

/* ------------------------------------------------- Issued certificates */

export async function listIssuedCertificates(): Promise<IssuedCertificate[]> {
  return mockRequest(() => cloneRecord(mockDatabase.issuedCertificates));
}

/** One member's own certificates, for the student page. */
export async function listMemberCertificates(memberId: string): Promise<IssuedCertificate[]> {
  return mockRequest(() =>
    cloneRecord(mockDatabase.issuedCertificates.filter((item) => item.memberId === memberId)),
  );
}

/**
 * Produce the certificate.
 *
 * Not exported for direct use by a page any more: generation is the consequence
 * of an approval, so it is called from `resolveCertificateRequest`. Hours come
 * from the member's participation periods, so a day counts towards exactly one
 * certificate — the one whose period covered the day it happened.
 */
function issueCertificate(kind: CertificateKind, memberId: string): IssuedCertificate {
  const member = mockDatabase.members.find((item) => item.id === memberId);

  if (!member) {
    throw new Error(t("errors.memberNotFound"));
  }

  const template = resolveTemplate(kind, member.originSchool);

  if (!template) {
    throw new Error(
      kind === "surplus"
        ? t("errors.surplusTemplateMissing")
        : t("errors.fctTemplateMissing", { school: member.originSchool }),
    );
  }

  const internship = mockDatabase.internships.find((item) => item.studentId === memberId);
  const participation = computeParticipationHours(memberId);

  const [eligibility] = certificateEligibility({
    teamHours: participation.teamHours,
    internshipHours: participation.internshipHours,
    internshipStatus: internship?.status ?? null,
  }).filter((entry) => entry.kind === kind);

  if (!eligibility || !eligibility.eligible) {
    throw new Error(
      eligibility?.reasonKey ? t(eligibility.reasonKey) : t("errors.certificateNotEligible"),
    );
  }

  const hours = eligibility.hours;
  const slug = member.fullName.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");
  const generatedAt = new Date().toISOString();

  const issued: IssuedCertificate = {
    id: `cert-${kind}-${memberId}`,
    memberId,
    memberName: member.fullName,
    kind,
    hours,
    templateFileName: template.fileName,
    generatedAt,
    downloadUrl: `/exports/certificates/${slug}-${kind}-${generatedAt.slice(0, 10)}.pdf`,
    summary:
      kind === "surplus"
        ? `Equipa Técnica surplus-hours certificate for ${member.fullName} — ${hours}h of volunteer team work at ${INTERNSHIP_HOST_ENTITY}.`
        : `Official FCT internship certificate for ${member.fullName} — ${hours}h completed at ${INTERNSHIP_HOST_ENTITY}.`,
    signedFile: null,
    signedAt: null,
  };

  const index = mockDatabase.issuedCertificates.findIndex((item) => item.id === issued.id);

  if (index >= 0) {
    // Regenerating keeps any signed copy already attached to this certificate.
    issued.signedFile = mockDatabase.issuedCertificates[index]!.signedFile;
    issued.signedAt = mockDatabase.issuedCertificates[index]!.signedAt;
    mockDatabase.issuedCertificates.splice(index, 1, issued);
  } else {
    mockDatabase.issuedCertificates.unshift(issued);
  }

  return issued;
}

/** Attaches the countersigned PDF that comes back after the certificate is signed. */
export async function attachSignedCertificate(certificateId: string, file: UploadedFile): Promise<IssuedCertificate> {
  return mockRequest(() => {
    const certificate = mockDatabase.issuedCertificates.find((item) => item.id === certificateId);

    if (!certificate) {
      throw new Error(t("errors.certificateNotFound"));
    }

    certificate.signedFile = file;
    certificate.signedAt = new Date().toISOString();
    return cloneRecord(certificate);
  });
}

export async function removeSignedCertificate(certificateId: string): Promise<IssuedCertificate> {
  return mockRequest(() => {
    const certificate = mockDatabase.issuedCertificates.find((item) => item.id === certificateId);

    if (!certificate) {
      throw new Error(t("errors.certificateNotFound"));
    }

    certificate.signedFile = null;
    certificate.signedAt = null;
    return cloneRecord(certificate);
  });
}

/* --------------------------------------------------------- Requests */

export interface CertificateReviewer {
  id: string;
  name: string;
}

function newestRequest(a: CertificateRequest, b: CertificateRequest): number {
  return b.requestedAt.localeCompare(a.requestedAt);
}

export async function listCertificateRequests(
  status: CertificateRequestStatus | "all" = "requested",
): Promise<CertificateRequest[]> {
  return mockRequest(() =>
    cloneRecord(
      mockDatabase.certificateRequests
        .filter((request) => status === "all" || request.status === status)
        .sort(newestRequest),
    ),
  );
}

export async function listMemberCertificateRequests(memberId: string): Promise<CertificateRequest[]> {
  return mockRequest(() =>
    cloneRecord(
      mockDatabase.certificateRequests.filter((request) => request.memberId === memberId).sort(newestRequest),
    ),
  );
}

export async function countPendingCertificateRequests(): Promise<number> {
  return mockRequest(
    () => mockDatabase.certificateRequests.filter((request) => request.status === "requested").length,
    60,
  );
}

/**
 * Ask for a certificate.
 *
 * Eligibility is re-checked from the participation totals rather than trusted
 * from the page, and one open request per kind is allowed — a second would leave
 * a reviewer with two identical questions and no way to tell them apart.
 */
export async function requestCertificate(
  memberId: string,
  kind: CertificateKind,
  note: string,
): Promise<CertificateRequest> {
  return mockRequest(() => {
    const member = mockDatabase.members.find((item) => item.id === memberId);

    if (!member) {
      throw new Error(t("errors.memberNotFound"));
    }

    const internship = mockDatabase.internships.find((item) => item.studentId === memberId);
    const participation = computeParticipationHours(memberId);

    const eligibility = certificateEligibility({
      teamHours: participation.teamHours,
      internshipHours: participation.internshipHours,
      internshipStatus: internship?.status ?? null,
    }).find((entry) => entry.kind === kind);

    if (!eligibility) {
      throw new Error(t("errors.certificateNotApplicable"));
    }

    if (!eligibility.eligible) {
      throw new Error(t(eligibility.reasonKey));
    }

    const alreadyOpen = mockDatabase.certificateRequests.some(
      (request) => request.memberId === memberId && request.kind === kind && request.status === "requested",
    );

    if (alreadyOpen) {
      throw new Error(t("errors.certificateAlreadyRequested"));
    }

    const created: CertificateRequest = {
      id: `creq-${mockDatabase.certificateRequests.length + 1}-${Date.now()}`,
      memberId,
      memberName: member.fullName,
      originSchool: member.originSchool,
      kind,
      hoursAtRequest: eligibility.hours,
      note: note.trim(),
      status: "requested",
      requestedAt: new Date().toISOString(),
      reviewedAt: null,
      reviewedBy: null,
      reviewNote: "",
      issuedCertificateId: null,
    };

    mockDatabase.certificateRequests.unshift(created);

    appendAuditLog({
      userName: member.fullName,
      action: "CREATE",
      entity: "certificate-request",
      description: `${member.fullName} requested the ${kind === "surplus" ? "surplus-hours" : "FCT"} certificate.`,
    });

    return cloneRecord(created);
  });
}

/**
 * Approve or reject.
 *
 * Approving generates the document in the same step. A request that is approved
 * but produced nothing would be the worst of both worlds — the member is told
 * yes and still has nothing to download — so a generation failure rejects the
 * whole transition rather than leaving the request approved and empty.
 */
export async function resolveCertificateRequest(
  requestId: string,
  decision: "approved" | "rejected",
  note: string,
  reviewer: CertificateReviewer,
): Promise<CertificateRequest> {
  return mockRequest(() => {
    const request = mockDatabase.certificateRequests.find((item) => item.id === requestId);

    if (!request) {
      throw new Error(t("errors.requestGone"));
    }

    if (request.status !== "requested") {
      throw new Error(t("errors.requestAnswered"));
    }

    if (decision === "approved") {
      const issued = issueCertificate(request.kind, request.memberId);
      request.issuedCertificateId = issued.id;
    }

    request.status = decision;
    request.reviewedAt = new Date().toISOString();
    request.reviewedBy = reviewer.name;
    request.reviewNote = note.trim();

    appendAuditLog({
      userName: reviewer.name,
      action: "UPDATE",
      entity: "certificate-request",
      description:
        `${decision === "approved" ? "Approved and generated" : "Rejected"} the ` +
        `${request.kind === "surplus" ? "surplus-hours" : "FCT"} certificate for ${request.memberName}.`,
    });

    return cloneRecord(request);
  });
}

/** Re-produce an already approved certificate, e.g. after the template changed. */
export async function regenerateCertificate(certificateId: string, reviewer: CertificateReviewer): Promise<IssuedCertificate> {
  return mockRequest(() => {
    const existing = mockDatabase.issuedCertificates.find((item) => item.id === certificateId);

    if (!existing) {
      throw new Error(t("errors.certificateNotFound"));
    }

    const issued = issueCertificate(existing.kind, existing.memberId);

    appendAuditLog({
      userName: reviewer.name,
      action: "UPDATE",
      entity: "certificate",
      description: `Regenerated the ${issued.kind === "surplus" ? "surplus-hours" : "FCT"} certificate for ${issued.memberName}.`,
    });

    return cloneRecord(issued);
  });
}
