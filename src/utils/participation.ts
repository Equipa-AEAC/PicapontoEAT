import { t } from "../i18n";
import type {
  MemberParticipationHours,
  ParticipationKind,
  ParticipationPeriod,
  ParticipationPeriodHours,
} from "../types/participation";

/**
 * The one place that decides which participation a day belongs to.
 *
 * Every hour total in the application — dashboards, Worked Hours, certificates,
 * reports, the member timeline — resolves through here. Scattering date-range
 * comparisons across pages is how two screens end up disagreeing about the same
 * day, which is the exact defect this replaces.
 *
 * Pure by design: no store, no service, no mock. It takes periods and rows and
 * returns numbers, so the rule can be reasoned about and checked directly.
 */

/** The minimum an attendance row needs for classification. */
export interface ClassifiableAttendance {
  date: string;
  hours: number | null;
}

/** Oldest first. Dates are `YYYY-MM-DD`, so lexicographic order is chronological. */
export function sortPeriods(periods: ParticipationPeriod[]): ParticipationPeriod[] {
  return periods.slice().sort((a, b) => a.startDate.localeCompare(b.startDate));
}

/** True when `date` falls inside the period. Both ends inclusive; open end runs forever. */
export function periodCoversDate(period: ParticipationPeriod, date: string): boolean {
  if (date < period.startDate) {
    return false;
  }

  return period.endDate === null || date <= period.endDate;
}

/**
 * The period that applied on `date`, or null when none did.
 *
 * Null is a real answer, not a failure: it means the member has attendance on a
 * day no participation covers. Callers must surface it rather than defaulting to
 * a bucket.
 */
export function resolvePeriodForDate(
  periods: ParticipationPeriod[],
  date: string,
): ParticipationPeriod | null {
  return periods.find((period) => periodCoversDate(period, date)) ?? null;
}

/** Two closed/open ranges overlap when each starts before the other ends. */
function rangesOverlap(a: ParticipationPeriod, b: ParticipationPeriod): boolean {
  const aEndsBeforeB = a.endDate !== null && a.endDate < b.startDate;
  const bEndsBeforeA = b.endDate !== null && b.endDate < a.startDate;

  return !aEndsBeforeB && !bEndsBeforeA;
}

/** The first existing period `candidate` collides with, ignoring itself. */
export function findOverlap(
  periods: ParticipationPeriod[],
  candidate: ParticipationPeriod,
): ParticipationPeriod | null {
  return (
    periods.find((period) => period.id !== candidate.id && rangesOverlap(period, candidate)) ?? null
  );
}

/**
 * Why `candidate` cannot be saved, or null when it can.
 *
 * Returns a sentence meant for the person filling the form. The service calls
 * this before writing so the rules hold whatever the UI does — though in the
 * mock that is a convenience, not enforcement: see the authorization note in
 * `docs/ai/PROJECT_CONTEXT.md`.
 */
export function validatePeriod(
  periods: ParticipationPeriod[],
  candidate: ParticipationPeriod,
): string | null {
  if (!candidate.startDate) {
    return t("errors.periodNeedsStart");
  }

  if (candidate.endDate !== null && candidate.endDate < candidate.startDate) {
    return t("errors.endBeforeStart");
  }

  if (candidate.kind === "internship" && !candidate.internshipId) {
    return t("errors.periodNeedsInternship");
  }

  if (candidate.kind !== "internship" && candidate.internshipId) {
    return t("errors.onlyInternshipPeriodRefs");
  }

  const others = periods.filter((period) => period.id !== candidate.id);

  if (candidate.endDate === null && others.some((period) => period.endDate === null)) {
    return t("errors.periodAlreadyOpen");
  }

  const clash = findOverlap(periods, candidate);

  if (clash) {
    const range = `${clash.startDate} to ${clash.endDate ?? "now"}`;
    return t("errors.periodOverlaps", { range });
  }

  return null;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Split a member's attendance across their participation periods.
 *
 * Classification is by the record's own `date`, never by which period is current,
 * which is what keeps a June day counted as volunteering after the member becomes
 * an intern in July. It is also what makes corrections behave: a correction
 * rewrites `hours` on the canonical row, and re-running this puts the new value
 * in the same bucket the old one was in.
 */
export function summariseParticipation(
  memberId: string,
  periods: ParticipationPeriod[],
  rows: ClassifiableAttendance[],
): MemberParticipationHours {
  const ordered = sortPeriods(periods);
  const buckets = new Map<string, ParticipationPeriodHours>(
    ordered.map((period) => [period.id, { period, hours: 0, days: 0 }]),
  );

  let unclassifiedHours = 0;
  let unclassifiedDays = 0;

  for (const row of rows) {
    const period = resolvePeriodForDate(ordered, row.date);
    const hours = row.hours ?? 0;

    if (!period) {
      unclassifiedHours += hours;
      unclassifiedDays += 1;
      continue;
    }

    const bucket = buckets.get(period.id);

    if (bucket) {
      bucket.hours += hours;
      bucket.days += 1;
    }
  }

  const periodHours = [...buckets.values()].map((bucket) => ({
    ...bucket,
    hours: round(bucket.hours),
  }));

  const totalFor = (kind: ParticipationKind) =>
    round(
      periodHours
        .filter((bucket) => bucket.period.kind === kind)
        .reduce((total, bucket) => total + bucket.hours, 0),
    );

  return {
    memberId,
    periods: periodHours,
    teamHours: totalFor("team-member"),
    internshipHours: totalFor("internship"),
    unclassifiedHours: round(unclassifiedHours),
    unclassifiedDays,
  };
}

/** `42h30m` — how the school writes an hour count. */
export function formatHours(hours: number): string {
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);

  // Rounding 4.999 up to 60 minutes must roll into the next hour, not read "4h60m".
  return minutes === 60 ? `${whole + 1}h00m` : `${whole}h${String(minutes).padStart(2, "0")}m`;
}
