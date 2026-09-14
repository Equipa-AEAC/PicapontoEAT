/**
 * Attendance, aggregated for display.
 *
 * These used to be hand-written arrays on the portal summary
 * (`weeklyStatistics`, `monthlyStatistics`, `recentAttendance`) that had no
 * relationship to the attendance collection: the dashboard claimed hours on
 * weekdays the member never worked, and the Worked Hours page showed three fixed
 * July rows under the heading "the days behind the totals above" — days that
 * were behind no total. Deriving them means a corrected record moves the chart,
 * and two surfaces cannot disagree about the same member.
 *
 * The caller supplies the rows, already scoped to one member, so nothing here
 * needs to know who is signed in.
 */

/** The shape these need off an attendance row. `AttendanceSummary` satisfies it. */
import { t } from "../i18n";

export interface AttendanceStatRow {
  date: string;
  hours: number | null;
}

export interface AttendancePoint {
  label: string;
  value: number;
}

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** One decimal is as precise as a scanned half-hour deserves. */
function round(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Parse `YYYY-MM-DD` as a local day.
 *
 * `new Date("2026-08-03")` is parsed as UTC midnight, which in a negative offset
 * is the 2nd — enough to move a Monday onto Sunday and reshape the whole chart.
 */
function localDay(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/*
 * `hoursByWeekday` was here. It totalled hours per day-of-week across a member's
 * whole record, which is the aggregation that produced "51 hours on Monday" — a
 * figure no Monday ever held, because it was every Monday stacked into one bar.
 * Nothing in the application asks which weekday somebody tends to work; the
 * question the charts are actually answering is how the work was spread across a
 * period, which `hoursByWeekOfMonth` and `hoursByCalendarWeek` below answer with
 * bars that each cover a real stretch of consecutive days.
 */

/**
 * Total hours per calendar month, oldest first, limited to the most recent
 * `limit` months that actually have records. Months with nothing in them are not
 * invented — an absent month is not a zero month.
 */
export function hoursByMonth(rows: AttendanceStatRow[], limit = 6): AttendancePoint[] {
  const totals = new Map<string, number>();

  for (const row of rows) {
    const key = row.date.slice(0, 7);
    totals.set(key, (totals.get(key) ?? 0) + (row.hours ?? 0));
  }

  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-limit)
    .map(([key, value]) => {
      const [year, month] = key.split("-").map(Number);
      return { label: `${MONTH_LABELS[month - 1]} ${year}`, value: round(value) };
    });
}

/** The newest `limit` rows, newest first. */
export function mostRecent<T extends AttendanceStatRow>(rows: T[], limit = 5): T[] {
  return rows.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

/**
 * Total hours per week *of a calendar month*, oldest first.
 *
 * This exists because grouping a reporting period by day-of-week is the wrong
 * question. "Monday" summed across a whole placement reads 51h, which is not a
 * workload anybody ever did — it is five Mondays stacked on top of each other,
 * and it tells the reader nothing about how the period was actually spent.
 * Weeks of the month do: each bar is a stretch of real, consecutive days.
 *
 * Week 1 is the calendar week containing the 1st, Monday-first. Weeks with no
 * attendance are still emitted, because a gap inside a month is information —
 * unlike `hoursByMonth`, where an absent month is simply outside the record.
 */
export function hoursByWeekOfMonth(rows: AttendanceStatRow[], month: string): AttendancePoint[] {
  const [year, monthNumber] = month.split("-").map(Number);

  if (!year || !monthNumber) {
    return [];
  }

  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  // getDay() is Sunday-first; shift so Monday is 0. Day 1 sits `leading` cells in.
  const leading = (new Date(year, monthNumber - 1, 1).getDay() + 6) % 7;
  const weekCount = Math.ceil((leading + daysInMonth) / 7);

  const totals = new Array<number>(weekCount).fill(0);

  for (const row of rows) {
    if (!row.date.startsWith(month)) {
      continue;
    }

    const day = Number(row.date.slice(8, 10));
    const index = Math.floor((leading + day - 1) / 7);

    if (index >= 0 && index < weekCount) {
      totals[index] += row.hours ?? 0;
    }
  }

  return totals.map((value, index) => ({ label: t("common.time.weekNumber", { number: index + 1 }), value: round(value) }));
}

/**
 * Total hours per calendar week across the whole record, oldest first, limited to
 * the most recent `limit` weeks that have something in them.
 *
 * The timeline answer to the same question `hoursByWeekOfMonth` answers inside one
 * month: used where the surface is not scoped to a month and a rolling trend is
 * what the reader needs. Labelled by the week's Monday, so a bar names a real date
 * range rather than an ordinal nobody can map back to a day.
 */
export function hoursByCalendarWeek(rows: AttendanceStatRow[], limit = 8): AttendancePoint[] {
  const totals = new Map<string, number>();

  for (const row of rows) {
    const day = localDay(row.date);
    // Rewind to Monday, so every day of a week lands on the same key.
    day.setDate(day.getDate() - ((day.getDay() + 6) % 7));

    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    totals.set(key, (totals.get(key) ?? 0) + (row.hours ?? 0));
  }

  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-limit)
    .map(([key, value]) => {
      const [, month, day] = key.split("-").map(Number);
      return { label: `${day} ${MONTH_LABELS[month - 1]}`, value: round(value) };
    });
}
