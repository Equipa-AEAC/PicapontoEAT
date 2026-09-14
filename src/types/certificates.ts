import type { UploadedFile } from "../services/uploads.service";

/*
 * The label maps that used to live here now live in `i18n/vocabulary.ts`.
 *
 * A `Record<Status, string>` is evaluated once at import, which cannot
 * survive a language change. The *values* and their order are still a
 * product decision and stay in this file; how to write them is not.
 */
/**
 * Two independent certificate tracks:
 * - `surplus` — volunteer team hours, available to every member.
 * - `fct`     — the regulated FCT internship certificate, only for interns.
 */
export type CertificateKind = "surplus" | "fct";

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

/* ------------------------------------------------------- Requests and profiles */

/**
 * A member asking for a certificate they are eligible for.
 *
 * The workflow used to be inverted: an administrator scanned a roster-wide table
 * and generated documents nobody had asked for, while the member's own page
 * offered a "preview" of a certificate that could not be downloaded. This turns
 * it round the way the school actually works — the member asks, staff decide,
 * and generation is what approval *does*, not a separate button.
 */
export type CertificateRequestStatus = "requested" | "approved" | "rejected";

export const CERTIFICATE_REQUEST_STATUS_TONES: Record<
  CertificateRequestStatus,
  "info" | "success" | "danger"
> = {
  requested: "info",
  approved: "success",
  rejected: "danger",
};

export interface CertificateRequest {
  id: string;
  memberId: string;
  memberName: string;
  /** The school the member is enrolled at, so a reviewer sees which FCT profile applies. */
  originSchool: string;
  kind: CertificateKind;
  /** Hours the member had when they asked. Recomputed on approval; kept for context. */
  hoursAtRequest: number;
  note: string;
  status: CertificateRequestStatus;
  requestedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewNote: string;
  /**
   * The certificate approval produced, or null when the request was rejected.
   * Separate from `status` so "approved" can never imply a file exists.
   */
  issuedCertificateId: string | null;
}

/**
 * The FCT certificate profile for one school.
 *
 * FCT interns are not all enrolled here — Equipa Técnica hosts placements from
 * partner schools, and each school hands out its own document set. The template
 * therefore belongs to the *school*, not to the member: one profile serves every
 * intern from that school, and a per-student template would be the same file
 * copied once per person.
 *
 * The surplus-hours certificate has no equivalent, because it is ours and is the
 * same document for everyone — it stays a single template on `CertificateTemplate`.
 */
export interface SchoolCertificateProfile {
  id: string;
  schoolName: string;
  /** The blank FCT document that school's certificates are generated onto. */
  template: UploadedFile | null;
  /** Who signs it there, printed on the generated document. */
  signatoryName: string;
  signatoryRole: string;
  notes: string;
  updatedAt: string;
}

export interface SchoolCertificateProfileFormValues {
  schoolName: string;
  signatoryName: string;
  signatoryRole: string;
  notes: string;
}

/* ------------------------------------------------------------- Eligibility */

/**
 * Whether one member may ask for one certificate, and why not when they may not.
 *
 * One function rather than a condition repeated on both surfaces: the student
 * page uses it to decide what to *offer*, and the service uses it to decide what
 * to *accept*. When those two drift, a member is shown a button that refuses.
 */
export interface CertificateEligibility {
  kind: CertificateKind;
  eligible: boolean;
  /**
   * Empty when eligible; otherwise the **translation key** for the sentence the
   * member reads instead of a button.
   *
   * A key rather than the sentence: this is a pure function shared by the page
   * and the service, and a resolved string would freeze whichever language was
   * active when it ran.
   */
  reasonKey: string;
  /** Hours the certificate would attest to. */
  hours: number;
}

export interface EligibilityInputs {
  teamHours: number;
  internshipHours: number;
  /** Null when the member is not carrying out an FCT placement. */
  internshipStatus: "planned" | "active" | "paused" | "complete" | null;
}

export function certificateEligibility(inputs: EligibilityInputs): CertificateEligibility[] {
  const surplus: CertificateEligibility = {
    kind: "surplus",
    eligible: inputs.teamHours > 0,
    reasonKey: inputs.teamHours > 0 ? "" : "student.certificates.reasonNoTeamHours",
    hours: inputs.teamHours,
  };

  /*
   * The FCT certificate is not merely hidden from non-interns — it does not
   * exist for them. A member with no placement has no requirement to certify, so
   * the row is omitted rather than shown greyed out with an explanation.
   */
  if (inputs.internshipStatus === null) {
    return [surplus];
  }

  return [
    surplus,
    {
      kind: "fct",
      eligible: inputs.internshipStatus === "complete",
      reasonKey:
        inputs.internshipStatus === "complete" ? "" : "student.certificates.reasonPlacementIncomplete",
      hours: inputs.internshipHours,
    },
  ];
}
