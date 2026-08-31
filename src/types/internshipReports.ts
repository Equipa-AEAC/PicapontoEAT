import type { Project, ProjectStatus } from "./projects";

export type DailyLogStatus = "draft" | "submitted";
export type ReportStatus = "draft" | "submitted" | "approved";

/*
 * `Project` used to be declared here as the minimal record a daily entry could be
 * tagged against. It has since grown into the project-management domain and lives
 * in `./projects`; it is re-exported so journal code keeps importing it from the
 * module it belongs to conceptually, with only one definition behind it.
 */
export type { Project, ProjectStatus };

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

/**
 * Whether keeping the work journal is an obligation for this member.
 *
 * The product rule, made explicit because the interface previously said two
 * contradictory things about it:
 *
 *   - **required** for members carrying an FCT internship. The monthly balance
 *     and the final Relatório de Estágio are assembled from journal entries, so
 *     an intern who stops writing cannot produce the documents the placement is
 *     graded on. A gap is a problem to chase.
 *   - **recommended** for volunteer team members. Their surplus-hours
 *     certificate is earned from attendance, not from writing, so the journal
 *     only enriches project reporting. A gap is worth noticing, never a fault.
 *
 * It is derived from internship status rather than stored, so it cannot drift
 * out of step with the roster.
 */
export type JournalObligation = "required" | "recommended";

export function journalObligationFor(isIntern: boolean): JournalObligation {
  return isIntern ? "required" : "recommended";
}

/** Days without an entry before an intern counts as behind on the requirement. */
export const JOURNAL_GAP_DAYS = 14;

export interface JournalCoverageState {
  obligation: JournalObligation;
  /** Only ever true for a member the journal is required of. */
  isBehind: boolean;
  label: string;
  tone: "success" | "warning" | "danger" | "info";
}

/** One place that decides how a member's coverage reads, for every view. */
export function journalCoverageState(
  isIntern: boolean,
  daysSinceLastEntry: number | null,
): JournalCoverageState {
  const obligation = journalObligationFor(isIntern);
  const stale = daysSinceLastEntry === null || daysSinceLastEntry > JOURNAL_GAP_DAYS;

  if (!stale) {
    return { obligation, isBehind: false, label: "Up to date", tone: "success" };
  }

  if (obligation === "recommended") {
    // A volunteer who has not written is not doing anything wrong.
    return {
      obligation,
      isBehind: false,
      label: daysSinceLastEntry === null ? "Not writing" : "Quiet",
      tone: "info",
    };
  }

  return {
    obligation,
    isBehind: true,
    label: daysSinceLastEntry === null ? "No journal" : "Behind",
    tone: daysSinceLastEntry === null ? "danger" : "warning",
  };
}
