/*
 * The label maps that used to live here now live in `i18n/vocabulary.ts`.
 *
 * A `Record<Status, string>` is evaluated once at import, which cannot
 * survive a language change. The *values* and their order are still a
 * product decision and stay in this file; how to write them is not.
 */

export type InternshipStatus = "planned" | "active" | "paused" | "complete";

/**
 * An FCT internship carried out inside Equipa Técnica. The club is a school-founded
 * club, so the host is always the school itself — there is no external placement.
 *
 * `completedHours` here is the FCT hour count only. A member's volunteer team hours
 * live on the member record (`teamHours`) and are counted separately.
 */
export interface InternshipSummary {
  id: string;
  studentId: string;
  studentName: string;
  /** Always the school; kept because the FCT document set names the host entity. */
  hostEntity: string;
  requiredHours: number;
  completedHours: number;
  remainingHours: number;
  /**
   * Orientador de estágio — the teacher responsible for the intern at the school
   * they are enrolled at. For an intern from another school this is a teacher
   * there, not someone at Equipa Técnica.
   */
  orientador: string;
  /** Monitor de estágio — the Equipa Técnica person supervising the intern day to day. */
  monitor: string;
  startDate: string;
  endDate: string;
  status: InternshipStatus;
  notes: string;
  certificateIssuedAt: string | null;
}

export interface InternshipDetails extends InternshipSummary {}

/**
 * What the mock actually stores for an internship.
 *
 * `completedHours` and `remainingHours` are omitted on purpose: they are summed
 * from the attendance inside the member's internship participation periods, so
 * storing them would be storing a second answer to a question the attendance
 * collection already answers. `requiredHours` stays — a school requirement is
 * not derivable from anything.
 */
export type StoredInternship = Omit<InternshipSummary, "completedHours" | "remainingHours">;

export interface InternshipFormValues {
  studentId: string;
  requiredHours: number;
  orientador: string;
  monitor: string;
  startDate: string;
  endDate: string;
  status: InternshipStatus;
  notes: string;
}

/**
 * What a reviewer can still change about a running placement.
 *
 * `completedHours` used to be here and was added to a stored total. Hours are now
 * summed from the attendance inside the member's internship participation
 * periods, so offering a box to type them into would be offering to write a
 * number the system would then ignore. What remains is the placement's state and
 * the note explaining it.
 */
export interface InternshipProgressUpdateValues {
  status: InternshipStatus;
  notes: string;
}

export interface InternshipFilters {
  query: string;
  status: InternshipStatus | "all";
}
