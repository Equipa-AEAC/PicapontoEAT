import { currentLocaleTag, t } from "../i18n";

/**
 * Date helpers that stay in the local calendar day.
 *
 * `Date.prototype.toISOString` converts to UTC first, so a local midnight in a
 * timezone ahead of UTC reports the previous day (and a timezone behind UTC
 * reports the next day late in the evening). Every date in this application is
 * a calendar date, never an instant, so formatting must not go through UTC.
 *
 * Everything a reader sees is formatted in the **application's** language, not
 * the browser's. Passing `undefined` to `Intl` reads `navigator.language`, which
 * meant a Portuguese interface printed "30 Sept 2026" on a machine imaged in
 * English — the one place where the language of the operating system leaked into
 * a page the user had explicitly asked for in Portuguese.
 */
export function toLocalIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function todayIsoDate(): string {
  return toLocalIsoDate(new Date());
}

/**
 * `HH:MM` difference in hours, e.g. `08:00` to `12:15` is `4.25`.
 *
 * The one place attendance hours are computed from a pair of clock times. Both
 * the correction-request flow and the admin's direct "Correct record" dialog
 * rewrite `entry`/`exit` on the same canonical row and must derive `hours` the
 * same way — two implementations of this arithmetic is how one correction path
 * ends up leaving a stale hour total that no longer matches the times it shows.
 */
export function hoursBetween(entry: string, exit: string): number {
  const [entryHour, entryMinute] = entry.split(":").map(Number);
  const [exitHour, exitMinute] = exit.split(":").map(Number);

  return (exitHour * 60 + exitMinute - (entryHour * 60 + entryMinute)) / 60;
}

/** Returns the last calendar day of a `YYYY-MM` month as `YYYY-MM-DD`. */
export function lastDayOfMonth(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();

  return `${month}-${String(lastDay).padStart(2, "0")}`;
}

/**
 * Short relative time for activity feeds and metadata lines ("4h ago").
 *
 * Deliberately coarse: past a week the exact hour stopped mattering, so it falls
 * back to the calendar date rather than counting out "23 days ago".
 */
export function formatRelativeTime(isoTimestamp: string | null): string {
  if (!isoTimestamp) {
    return "—";
  }

  const parsed = Date.parse(isoTimestamp);

  if (Number.isNaN(parsed)) {
    return "—";
  }

  const minutes = Math.floor((Date.now() - parsed) / 60_000);

  if (minutes < 1) return t("common.time.justNow");
  if (minutes < 60) return t("common.time.minutesAgo", { count: minutes });

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("common.time.hoursAgo", { count: hours });

  const days = Math.floor(hours / 24);
  if (days < 7) return t("common.time.daysAgo", { count: days });

  return formatIsoDate(isoTimestamp.slice(0, 10));
}

/** `YYYY-MM-DD` as a readable date. Returns an em dash for a missing value. */
export function formatIsoDate(date: string | null): string {
  if (!date) {
    return "—";
  }

  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleDateString(currentLocaleTag(), { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * How a deadline reads next to a task: overdue by how much, or how long is left.
 * Returns null when there is no date, so the caller can omit the element entirely
 * rather than rendering an empty one.
 */
export function formatDueLabel(daysUntilDue: number | null): string | null {
  if (daysUntilDue === null) {
    return null;
  }

  if (daysUntilDue < -1) return t("common.time.overdueByDays", { count: Math.abs(daysUntilDue) });
  if (daysUntilDue === -1) return t("common.time.overdueByOneDay");
  if (daysUntilDue === 0) return t("common.time.dueToday");
  if (daysUntilDue === 1) return t("common.time.dueTomorrow");
  if (daysUntilDue <= 7) return t("common.time.dueInDays", { count: daysUntilDue });

  return null;
}

/**
 * A full ISO timestamp as a readable date and time.
 *
 * `formatIsoDate` only understands a `YYYY-MM-DD` day, so anything carrying a
 * time component (heartbeats, audit rows, card scans) has to come through here
 * instead of being interpolated raw into a template.
 */
export function formatTimestamp(timestamp: string | null): string {
  if (!timestamp) {
    return "—";
  }

  const parsed = new Date(timestamp);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleString(currentLocaleTag(), {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * A `YYYY-MM` month as a readable month and year ("setembro de 2026").
 *
 * Months reach the interface as `2026-07` in several places — report periods,
 * dashboard headings, filters — and were being printed raw.
 */
export function formatIsoMonth(month: string | null): string {
  if (!month) {
    return "—";
  }

  const parsed = new Date(`${month}-01T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return month;
  }

  return parsed.toLocaleDateString(currentLocaleTag(), { month: "long", year: "numeric" });
}

/** Weekday names for the active language, Monday first. */
export function weekdayNames(style: "short" | "long" = "short"): string[] {
  const formatter = new Intl.DateTimeFormat(currentLocaleTag(), { weekday: style });

  // 2024-01-01 was a Monday, which is the first column of every calendar here.
  return Array.from({ length: 7 }, (_, index) =>
    formatter.format(new Date(Date.UTC(2024, 0, 1 + index))),
  );
}
