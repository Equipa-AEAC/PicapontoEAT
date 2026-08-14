/**
 * Date helpers that stay in the local calendar day.
 *
 * `Date.prototype.toISOString` converts to UTC first, so a local midnight in a
 * timezone ahead of UTC reports the previous day (and a timezone behind UTC
 * reports the next day late in the evening). Every date in this application is
 * a calendar date, never an instant, so formatting must not go through UTC.
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

/** Returns the last calendar day of a `YYYY-MM` month as `YYYY-MM-DD`. */
export function lastDayOfMonth(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();

  return `${month}-${String(lastDay).padStart(2, "0")}`;
}
