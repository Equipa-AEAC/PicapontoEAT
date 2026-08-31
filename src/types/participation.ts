import type { PlacementProgram } from "./placements";

/**
 * How a member was participating during a stretch of time.
 *
 * A Member is a stable person; how they participate changes. Ana is a volunteer
 * through June, starts her FCT internship in July, and is the same member
 * throughout — `stu-1001` before and after.
 *
 * This exists because hours have to be attributed to the participation that
 * applied **when the attendance happened**. Before it, the only thing resembling
 * a role was `member.internshipStatus`, a current-state flag, and using that to
 * classify history means the day Ana becomes an intern her June volunteering
 * silently turns into internship hours.
 *
 * The two kinds mirror `PlacementProgram` so the vocabulary stays single —
 * see `participationKindToProgram`.
 */
export type ParticipationKind = "team-member" | "internship";

export const PARTICIPATION_KIND_LABELS: Record<ParticipationKind, string> = {
  "team-member": "Technical Team",
  internship: "Internship",
};

/** What each kind's hours are creditable towards. Shown next to the totals. */
export const PARTICIPATION_KIND_CREDIT: Record<ParticipationKind, string> = {
  "team-member": "Counts towards the surplus-hours certificate",
  internship: "Counts towards the FCT internship requirement",
};

export const PARTICIPATION_KIND_OPTIONS = (
  Object.keys(PARTICIPATION_KIND_LABELS) as ParticipationKind[]
).map((value) => ({ label: PARTICIPATION_KIND_LABELS[value], value }));

/** The same distinction `PlacementProgram` draws, under the names it uses. */
export function participationKindToProgram(kind: ParticipationKind): PlacementProgram {
  return kind === "internship" ? "official-internship" : "equipa-hours";
}

export interface ParticipationPeriod {
  id: string;
  memberId: string;
  kind: ParticipationKind;
  /** Inclusive `YYYY-MM-DD`. */
  startDate: string;
  /**
   * Inclusive `YYYY-MM-DD`, or null while the period is still running.
   *
   * Inclusive at both ends, and whole-day: attendance stores one row per member
   * per day and cannot express half a day, so a period boundary is a date, never
   * a time. A transition recorded mid-day takes effect from the following whole
   * day — see `docs/ai/PROJECT_CONTEXT.md`.
   */
  endDate: string | null;
  /** The internship this period covers. Required when `kind` is "internship". */
  internshipId: string | null;
  note: string;
}

export interface ParticipationPeriodFormValues {
  kind: ParticipationKind;
  startDate: string;
  endDate: string;
  internshipId: string;
  note: string;
}

/** One period with the attendance that fell inside it. */
export interface ParticipationPeriodHours {
  period: ParticipationPeriod;
  hours: number;
  /** Attendance rows inside the period, including days with no usable scan. */
  days: number;
}

/**
 * A member's hours, split by the participation that applied at the time.
 *
 * `teamHours` and `internshipHours` are the two buckets the product keeps apart;
 * they are sums over periods, never over a member's current status.
 */
export interface MemberParticipationHours {
  memberId: string;
  /** Oldest first. */
  periods: ParticipationPeriodHours[];
  teamHours: number;
  internshipHours: number;
  /**
   * Attendance on a day no period covers.
   *
   * Deliberately its own bucket rather than being folded into either total: a
   * day nobody can account for is a data problem to fix, and silently crediting
   * it to one side would hide that.
   */
  unclassifiedHours: number;
  unclassifiedDays: number;
}
