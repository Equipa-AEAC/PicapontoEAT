import type { UploadedFile } from "../services/uploads.service";

/**
 * Two independent certificate tracks:
 * - `surplus` — volunteer team hours, available to every member.
 * - `fct`     — the regulated FCT internship certificate, only for interns.
 */
export type CertificateKind = "surplus" | "fct";

export const CERTIFICATE_KIND_LABELS: Record<CertificateKind, string> = {
  surplus: "Surplus-hours certificate",
  fct: "FCT internship certificate",
};

/**
 * The blank/letterhead PDF a certificate of this kind is generated from. Uploaded
 * once by an administrator and reused for every member.
 */
export interface CertificateTemplate {
  kind: CertificateKind;
  file: UploadedFile;
  uploadedAt: string;
}

/**
 * A certificate issued to one member. `generated` is what the app produced from the
 * template; `signed` is the countersigned copy uploaded back once it returns.
 */
export interface IssuedCertificate {
  id: string;
  memberId: string;
  memberName: string;
  kind: CertificateKind;
  hours: number;
  /** Name of the template file the output was generated from. */
  templateFileName: string;
  generatedAt: string;
  downloadUrl: string;
  summary: string;
  signedFile: UploadedFile | null;
  signedAt: string | null;
}
