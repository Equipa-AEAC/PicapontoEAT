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

export interface InternshipProgressUpdateValues {
  completedHours: number;
  notes: string;
}

export interface InternshipFilters {
  query: string;
  status: InternshipStatus | "all";
}
