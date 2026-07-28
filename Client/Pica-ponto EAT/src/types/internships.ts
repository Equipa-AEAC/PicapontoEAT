export type InternshipStatus = "planned" | "active" | "paused" | "complete";

export interface InternshipSummary {
  id: string;
  studentId: string;
  studentName: string;
  requiredHours: number;
  completedHours: number;
  remainingHours: number;
  supervisor: string;
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
  supervisor: string;
  startDate: string;
  endDate: string;
  status: InternshipStatus;
  notes: string;
}

export interface InternshipProgressUpdateValues {
  completedHours: number;
  notes: string;
}
