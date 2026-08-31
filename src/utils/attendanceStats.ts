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
export interface AttendanceStatRow {
  date: string;
  hours: number | null;
}

export interface AttendancePoint {
  label: string;
  value: number;
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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

/**
 * Total hours per weekday, Monday first.
 *
 * Every weekday is present even at zero: the shape of the week is the point, and
 * dropping the empty days would hide that the member never works a Friday.
 */
export function hoursByWeekday(rows: AttendanceStatRow[]): AttendancePoint[] {
  const totals = new Array<number>(7).fill(0);

  for (const row of rows) {
    // getDay() is Sunday-first; shift so Monday is 0.
    const index = (localDay(row.date).getDay() + 6) % 7;
    totals[index] += row.hours ?? 0;
  }

  return WEEKDAY_LABELS.map((label, index) => ({ label, value: round(totals[index]) }));
}

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
