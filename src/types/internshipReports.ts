export type DailyLogStatus = "draft" | "submitted";
export type ReportStatus = "draft" | "submitted" | "approved";
export type ProjectStatus = "active" | "paused" | "done";

/**
 * A piece of work daily entries can be tagged against. Deliberately minimal — this
 * is the seam a fuller task board would grow from, not the board itself.
 */
export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  owner: string;
}

/**
 * A single day of work written by the member. Daily entries are the raw material
 * every other internship report is derived from, and — because every member can
 * write them, not only interns — the admin's view of what actually got done.
 */
export interface DailyLogEntry {
  id: string;
  studentId: string;
  date: string;
  hours: number;
  /** Optional link to the project this day's work belonged to. */
  projectId: string | null;
  activities: string;
  learnings: string;
  difficulties: string;
  status: DailyLogStatus;
  createdAt: string;
  updatedAt: string | null;
}

export interface DailyLogFormValues {
  date: string;
  hours: number;
  projectId: string | null;
  activities: string;
  learnings: string;
  difficulties: string;
}

export interface DailyLogFilters {
  query: string;
  month: string | "all";
  status: DailyLogStatus | "all";
}

/** Filters for the admin-side, cross-member view of the journal. */
export interface TeamJournalFilters {
  query: string;
  memberId: string | "all";
  projectId: string | "all";
  month: string | "all";
  status: DailyLogStatus | "all";
}

/** One daily entry joined with the member who wrote it and the project it belongs to. */
export interface TeamJournalEntry extends DailyLogEntry {
  memberName: string;
  memberIsExternal: boolean;
  projectName: string | null;
}

/** Per-member journal coverage: is this person still writing entries? */
export interface MemberJournalCoverage {
  memberId: string;
  memberName: string;
  isIntern: boolean;
  entriesThisMonth: number;
  totalEntries: number;
  hoursThisMonth: number;
  totalHours: number;
  lastEntryDate: string | null;
  /** Whole days since the last entry, or null when the member never wrote one. */
  daysSinceLastEntry: number | null;
}

/** Rollup of the journal grouped by project. */
export interface ProjectActivitySummary {
  projectId: string;
  projectName: string;
  status: ProjectStatus;
  owner: string;
  hours: number;
  entries: number;
  contributors: string[];
  lastActivityDate: string | null;
}

export interface TeamJournalSummary {
  totalEntries: number;
  totalHours: number;
  contributors: number;
  entriesThisMonth: number;
  coverage: MemberJournalCoverage[];
  projects: ProjectActivitySummary[];
}

/**
 * Mirrors "CP_M06 - Ficha de Evolução Intermédia": a periodic balance of the
 * activities carried out against the activities planned, plus the main
 * difficulties felt during the period.
 */
export interface MonthlyReport {
  id: string;
  studentId: string;
  month: string;
  periodStart: string;
  periodEnd: string;
  totalHours: number;
  entriesCount: number;
  activitiesCompleted: string[];
  activitiesPlanned: string[];
  mainDifficulties: string;
  status: ReportStatus;
  generatedAt: string;
  submittedAt: string | null;
}

export interface MonthlyReportDraft {
  month: string;
  periodStart: string;
  periodEnd: string;
  totalHours: number;
  entriesCount: number;
  activitiesCompleted: string[];
  activitiesPlanned: string[];
  mainDifficulties: string;
}

/**
 * Mirrors "CP_M08 - Relatório de Estágio": the final report handed in by the
 * student at the end of the internship, section by section.
 */
export interface FinalReport {
  studentId: string;
  companyCharacterization: string;
  activitiesPerformed: string;
  difficulties: string;
  newLearnings: string;
  occurrences: string;
  other: string;
  status: ReportStatus;
  updatedAt: string | null;
  submittedAt: string | null;
}

export interface FinalReportFormValues {
  companyCharacterization: string;
  activitiesPerformed: string;
  difficulties: string;
  newLearnings: string;
  occurrences: string;
  other: string;
}

export interface InternshipJournalSummary {
  totalEntries: number;
  submittedEntries: number;
  totalHours: number;
  lastEntryDate: string | null;
  monthsCovered: string[];
}
