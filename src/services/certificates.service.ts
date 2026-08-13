import type { CertificateKind, CertificateTemplate, IssuedCertificate } from "../types/certificates";
import type { UploadedFile } from "./uploads.service";

import { cloneRecord, mockRequest } from "./mockTransport";
import { mockDatabase } from "./mockDatabase";
import { INTERNSHIP_HOST_ENTITY } from "../shared/constants";

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

export async function listIssuedCertificates(): Promise<IssuedCertificate[]> {
  return mockRequest(() => cloneRecord(mockDatabase.issuedCertificates));
}

/**
 * Generates a certificate for one member from the stored template. Without a
 * template there is nothing to generate from, so this refuses rather than
 * producing an unbranded document.
 */
export async function generateCertificate(kind: CertificateKind, memberId: string): Promise<IssuedCertificate> {
  return mockRequest(() => {
    const template = mockDatabase.certificateTemplates.find((item) => item.kind === kind);

    if (!template) {
      throw new Error(`Upload a ${kind === "surplus" ? "surplus-hours" : "FCT"} template before generating certificates.`);
    }

    const member = mockDatabase.members.find((item) => item.id === memberId);

    if (!member) {
      throw new Error("Member not found.");
    }

    const internship = mockDatabase.internships.find((item) => item.studentId === memberId);

    if (kind === "surplus" && member.teamHours <= 0) {
      throw new Error("This member has no volunteer team hours registered yet.");
    }

    if (kind === "fct" && internship?.status !== "complete") {
      throw new Error("The FCT certificate is only available once the internship is complete.");
    }

    const hours = kind === "surplus" ? member.teamHours : (internship?.completedHours ?? 0);
    const slug = member.fullName.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");
    const generatedAt = new Date().toISOString();

    const issued: IssuedCertificate = {
      id: `cert-${kind}-${memberId}`,
      memberId,
      memberName: member.fullName,
      kind,
      hours,
      templateFileName: template.file.fileName,
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

    return cloneRecord(issued);
  });
}

/** Attaches the countersigned PDF that comes back after the certificate is signed. */
export async function attachSignedCertificate(certificateId: string, file: UploadedFile): Promise<IssuedCertificate> {
  return mockRequest(() => {
    const certificate = mockDatabase.issuedCertificates.find((item) => item.id === certificateId);

    if (!certificate) {
      throw new Error("Certificate not found.");
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
      throw new Error("Certificate not found.");
    }

    certificate.signedFile = null;
    certificate.signedAt = null;
    return cloneRecord(certificate);
  });
}
