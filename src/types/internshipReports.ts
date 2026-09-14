import { t } from "../i18n";

import type { Project, ProjectStatus } from "./projects";

/*
 * The label maps that used to live here now live in `i18n/vocabulary.ts`.
 *
 * A `Record<Status, string>` is evaluated once at import, which cannot
 * survive a language change. The *values* and their order are still a
 * product decision and stay in this file; how to write them is not.
 */
export type DailyLogStatus = "draft" | "submitted";

/**
 * The lifecycle of an internship report.
 *
 * Four states, and the rule that gives them meaning: **a draft is editable and
 * nothing else is**. `rejected` exists so a reviewer can return work rather than
 * only refuse it — a rejected report explains what to change and the student
 * reopens it, which moves it back to `draft`. Without that state, "no" was
 * terminal and the only way forward was to start again.
 */
export type ReportStatus = "draft" | "submitted" | "approved" | "rejected";

export const REPORT_STATUS_TONES: Record<ReportStatus, "warning" | "info" | "success" | "danger"> = {
  draft: "warning",
  submitted: "info",
  approved: "success",
  rejected: "danger",
};

/** The one rule every report surface asks about. Stated once so it cannot drift. */
export function reportIsEditable(status: ReportStatus): boolean {
  return status === "draft";
}

/**
 * Whether a student may reopen this report and work on it again.
 *
 * Only a returned report. An approved one is finished, and a submitted one is
 * somebody else's turn — reopening it under a reviewer mid-decision is how two
 * people end up editing the same document.
 */
export function reportCanBeReopened(status: ReportStatus): boolean {
  return status === "rejected";
}

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
  /**
   * The reviewer's decision, kept alongside the report rather than in a separate
   * queue: a student reading "Returned for revision" needs the reason in the same
   * place, and a reviewer reopening the record needs to see what was said last time.
   */
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewNote: string;
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
  /**
   * The stretch of the placement the report covers.
   *
   * A final report is a document about a period, and the FCT document set asks
   * for that period on its cover. It was absent, which meant a report generated
   * from the journal silently covered "everything ever written" — including
   * volunteer entries from before the placement began. Defaults to the
   * internship's own start and end dates and can be narrowed.
   */
  periodStart: string;
  periodEnd: string;
  companyCharacterization: string;
  activitiesPerformed: string;
  difficulties: string;
  newLearnings: string;
  occurrences: string;
  other: string;
  status: ReportStatus;
  updatedAt: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewNote: string;
}

export interface FinalReportFormValues {
  periodStart: string;
  periodEnd: string;
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
    return { obligation, isBehind: false, label: t("admin.reports.coverageUpToDate"), tone: "success" };
  }

  if (obligation === "recommended") {
    // A volunteer who has not written is not doing anything wrong.
    return {
      obligation,
      isBehind: false,
      label:
        daysSinceLastEntry === null
          ? t("admin.reports.coverageNotWriting")
          : t("admin.reports.coverageQuiet"),
      tone: "info",
    };
  }

  return {
    obligation,
    isBehind: true,
    label:
      daysSinceLastEntry === null ? t("admin.reports.coverageNoJournal") : t("admin.reports.coverageBehind"),
    tone: daysSinceLastEntry === null ? "danger" : "warning",
  };
}

/* ----------------------------------------------------- Admin review views */

/**
 * A monthly report joined with the member who wrote it.
 *
 * The admin Reports page reviews work across the whole roster, and a report row
 * without a name on it is not reviewable. The member is looked up at read time
 * rather than copied onto the record, for the same reason
 * `AttendanceCorrectionRequestSummary` does it: a renamed member must not leave
 * an old name frozen in a queue.
 */
export interface MonthlyReportSummary extends MonthlyReport {
  memberName: string;
  memberIsExternal: boolean;
  originSchool: string;
}

export interface FinalReportSummary extends FinalReport {
  memberName: string;
  memberIsExternal: boolean;
  originSchool: string;
}

/** Narrowing for the reviewer's queues. */
export interface ReportReviewFilters {
  status: ReportStatus | "all";
  memberId: string | "all";
}

/** What a reviewer decides. `rejected` returns the report to the student to redo. */
export interface ReportReviewValues {
  decision: "approved" | "rejected";
  note: string;
}
