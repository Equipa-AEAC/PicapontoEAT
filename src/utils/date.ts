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

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

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

  return parsed.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
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

  if (daysUntilDue < -1) return `${Math.abs(daysUntilDue)} days overdue`;
  if (daysUntilDue === -1) return "1 day overdue";
  if (daysUntilDue === 0) return "Due today";
  if (daysUntilDue === 1) return "Due tomorrow";
  if (daysUntilDue <= 7) return `Due in ${daysUntilDue} days`;

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

  return parsed.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
