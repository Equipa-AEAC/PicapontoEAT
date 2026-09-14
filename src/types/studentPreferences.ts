/**
 * Per-student portal preferences.
 *
 * Two things, and only two, because they are the two the portal can actually
 * honour today.
 *
 * **Notifications.** An earlier pass deleted every notification toggle from
 * Settings, and was right to: nothing in the platform sends email or push, so a
 * switch labelled "email me" configured a mechanism that did not exist. What
 * does exist is the in-app surface — the sidebar badge and the dashboard's
 * "Needs your attention" list — and every category below is one of those,
 * wired to a collection the portal already reads. Turning a category off hides
 * that alert; it does not silence a delivery nobody performs. The copy on the
 * page says exactly that.
 *
 * **Sidebar order.** Cosmetic and reversible: it reorders the entries, and
 * cannot remove one, so no page can be lost by rearranging the list.
 *
 * BACKEND CONTRACT: both are stored in `localStorage`, which makes them per
 * browser rather than per account — sign in on another machine and the defaults
 * come back. They belong on the member record
 * (`GET/PUT /members/me/preferences`) once there is a server to hold them. See
 * docs/ai/BACKEND_CONTRACTS.md § Student preferences.
 */

/** Alert categories. Each one corresponds to a real record the portal loads. */
export type StudentAlertCategory =
  | "attendance-corrections"
  | "report-reviews"
  | "certificate-requests"
  | "profile-requests"
  | "announcements"
  | "task-deadlines";

/*
 * The category order. Their names and hints live in `i18n/student.ts` under
 * `student.alertCategory` and `student.alertHint`, for the usual reason: a
 * `Record<Category, string>` freezes whichever language loaded first.
 */
export const STUDENT_ALERT_CATEGORIES: StudentAlertCategory[] = [
  "attendance-corrections",
  "report-reviews",
  "certificate-requests",
  "profile-requests",
  "announcements",
  "task-deadlines",
];

export interface StudentPreferences {
  /** Which alert categories surface in the portal. Every category on by default. */
  alerts: Record<StudentAlertCategory, boolean>;
  /**
   * Sidebar entry names, in the order the student wants them.
   *
   * Held as a list of names rather than as a full copy of the sidebar, so an
   * entry added or removed in a later release resolves correctly: unknown names
   * are dropped and missing ones are appended in their default position. A
   * stored preference can therefore never hide a page.
   */
  sidebarOrder: string[];
}

export function defaultStudentPreferences(): StudentPreferences {
  return {
    alerts: Object.fromEntries(STUDENT_ALERT_CATEGORIES.map((category) => [category, true])) as Record<
      StudentAlertCategory,
      boolean
    >,
    sidebarOrder: [],
  };
}

/**
 * Apply a stored order to the canonical entry list.
 *
 * The canonical list is the authority on *what exists*; the preference only says
 * what comes first. Anything stored that no longer exists is ignored, and
 * anything that exists but is not stored keeps its default position at the end,
 * so the result is always the complete navigation.
 */
export function applySidebarOrder<T extends { name: string }>(entries: T[], order: string[]): T[] {
  const byName = new Map(entries.map((entry) => [entry.name, entry]));
  const ordered: T[] = [];

  for (const name of order) {
    const entry = byName.get(name);

    if (entry) {
      ordered.push(entry);
      byName.delete(name);
    }
  }

  return [...ordered, ...byName.values()];
}
