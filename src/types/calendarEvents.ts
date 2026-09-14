import { t } from "../i18n";

/*
 * The label maps that used to live here now live in `i18n/vocabulary.ts`.
 *
 * A `Record<Status, string>` is evaluated once at import, which cannot
 * survive a language change. The *values* and their order are still a
 * product decision and stay in this file; how to write them is not.
 */

/**
 * Calendar events.
 *
 * The calendar already had a real answer for "what did I do" — attendance — but
 * nothing for "what is happening". This adds that, and nothing else: an event is
 * a dated note with a title, not a scheduling system. It never carries hours and
 * is never counted anywhere, because hours come from attendance and only from
 * attendance (see `src/utils/participation.ts`).
 *
 * The visibility model is deliberately the smallest one the existing data
 * supports. There are exactly three relationships in this application that can
 * decide who sees what — you, the club, and a project's participant list — so
 * those are the three audiences. Anything finer would need a sub-team entity
 * that does not exist, and inventing one to back a dropdown is how a permission
 * model ends up describing nothing.
 */

/** Who an event is addressed to. */
export type CalendarEventVisibility = "personal" | "team" | "project";

export type CalendarEventCategory = "session" | "meeting" | "deadline" | "other";

export const CALENDAR_CATEGORY_TONES: Record<CalendarEventCategory, "info" | "warning" | "danger" | "success"> = {
  session: "info",
  meeting: "success",
  deadline: "danger",
  other: "warning",
};

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  /** Inclusive `YYYY-MM-DD`. Events are whole-day records, like attendance. */
  date: string;
  /** `HH:MM`, or null for an all-day entry. */
  startTime: string | null;
  endTime: string | null;
  category: CalendarEventCategory;
  visibility: CalendarEventVisibility;
  /** Required when `visibility` is "project"; null otherwise. */
  projectId: string | null;
  /**
   * Who wrote it. A member id for a student-authored event, a user id for one
   * written by staff — the two id spaces do not collide, which is the same
   * assumption `ProjectParticipant` already makes.
   */
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface CalendarEventFormValues {
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  category: CalendarEventCategory;
  visibility: CalendarEventVisibility;
  projectId: string | null;
}

/** Narrowing for the admin calendar, which looks across the whole club. */
export interface CalendarEventFilters {
  visibility: CalendarEventVisibility | "all";
  category: CalendarEventCategory | "all";
  projectId: string | "all";
  authorId: string | "all";
}

/**
 * Why an event cannot be saved, or null when it can.
 *
 * Pure, and shared by the service and the dialog, so the rule holds whatever the
 * UI does. As everywhere else in the mock, this is a convenience for the person
 * filling the form — it is not enforcement. See `docs/ai/BACKEND_CONTRACTS.md`.
 */
export function validateCalendarEvent(values: CalendarEventFormValues): string | null {
  if (!values.title.trim()) {
    return t("errors.eventNeedsTitle");
  }

  if (!values.date) {
    return t("errors.eventNeedsDate");
  }

  if (values.visibility === "project" && !values.projectId) {
    return t("errors.eventNeedsProject");
  }

  if (values.startTime && values.endTime && values.endTime < values.startTime) {
    return t("errors.endTimeBeforeStart");
  }

  return null;
}
