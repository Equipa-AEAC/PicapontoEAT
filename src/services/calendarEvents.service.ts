import type {
  CalendarEvent,
  CalendarEventFilters,
  CalendarEventFormValues,
} from "../types/calendarEvents";
import { validateCalendarEvent } from "../types/calendarEvents";

import { cloneRecord, mockRequest } from "./mockTransport";
import { mockDatabase } from "./mockDatabase";
import { appendAuditLog } from "./audit.service";
import { t } from "../i18n";

/*
 * Calendar events.
 *
 * BACKEND CONTRACT — read this before treating the filter below as security.
 * `listEventsForMember` decides visibility in the browser, from a member id the
 * client supplies. That is presentation, not authorization: anyone who can open
 * devtools can ask for somebody else's calendar. The API must resolve the member
 * from the session, apply the same three rules server-side, and refuse an event
 * the caller may not see. See docs/ai/BACKEND_CONTRACTS.md § Calendar events.
 */

function nowIso(): string {
  return new Date().toISOString();
}

/** Project ids one member is on — owner or assigned participant. */
function projectIdsFor(memberId: string): Set<string> {
  return new Set(
    mockDatabase.projects
      .filter((project) => project.ownerId === memberId || project.memberIds.includes(memberId))
      .map((project) => project.id),
  );
}

/**
 * Whether one member may see one event.
 *
 * The three rules, in one place so the calendar, the dashboard and the day panel
 * cannot disagree about what a member is allowed to see.
 */
export function memberCanSeeEvent(event: CalendarEvent, memberId: string, memberProjects: Set<string>): boolean {
  if (event.authorId === memberId) {
    return true;
  }

  if (event.visibility === "personal") {
    return false;
  }

  if (event.visibility === "team") {
    return true;
  }

  return event.projectId !== null && memberProjects.has(event.projectId);
}

function sortByDate(events: CalendarEvent[]): CalendarEvent[] {
  return events
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || (a.startTime ?? "").localeCompare(b.startTime ?? ""));
}

/** Every event one member is entitled to see. */
export async function listEventsForMember(memberId: string): Promise<CalendarEvent[]> {
  return mockRequest(() => {
    const memberProjects = projectIdsFor(memberId);

    return cloneRecord(
      sortByDate(mockDatabase.calendarEvents.filter((event) => memberCanSeeEvent(event, memberId, memberProjects))),
    );
  });
}

/**
 * Every event, for the admin calendar.
 *
 * Staff see personal events too, because an operational calendar that silently
 * hides rows is worse than one that shows them and says whose they are. The row
 * carries its visibility, so the admin surface can label a personal entry rather
 * than pass it off as a team one.
 */
export async function listAllEvents(filters: Partial<CalendarEventFilters> = {}): Promise<CalendarEvent[]> {
  return mockRequest(() =>
    cloneRecord(
      sortByDate(
        mockDatabase.calendarEvents.filter((event) => {
          const matchesVisibility =
            !filters.visibility || filters.visibility === "all" || event.visibility === filters.visibility;
          const matchesCategory =
            !filters.category || filters.category === "all" || event.category === filters.category;
          const matchesProject =
            !filters.projectId || filters.projectId === "all" || event.projectId === filters.projectId;
          const matchesAuthor =
            !filters.authorId || filters.authorId === "all" || event.authorId === filters.authorId;

          return matchesVisibility && matchesCategory && matchesProject && matchesAuthor;
        }),
      ),
    ),
  );
}

export interface CalendarAuthor {
  id: string;
  name: string;
}

export async function saveCalendarEvent(
  values: CalendarEventFormValues,
  author: CalendarAuthor,
  eventId?: string,
): Promise<CalendarEvent> {
  return mockRequest(() => {
    const problem = validateCalendarEvent(values);

    if (problem) {
      throw new Error(problem);
    }

    if (values.visibility === "project" && values.projectId) {
      const project = mockDatabase.projects.find((item) => item.id === values.projectId);

      if (!project) {
        throw new Error(t("errors.projectGone"));
      }
    }

    const shared: Omit<CalendarEvent, "id" | "authorId" | "authorName" | "createdAt" | "updatedAt"> = {
      title: values.title.trim(),
      description: values.description.trim(),
      date: values.date,
      startTime: values.startTime || null,
      endTime: values.endTime || null,
      category: values.category,
      visibility: values.visibility,
      projectId: values.visibility === "project" ? values.projectId : null,
    };

    const existing = eventId ? mockDatabase.calendarEvents.find((item) => item.id === eventId) : undefined;

    if (existing) {
      /*
       * Only the author edits an event. Enforced here so the rule exists even
       * when a caller forgets to hide the button — and re-stated as a backend
       * requirement, because this check runs on the reader's own machine.
       */
      if (existing.authorId !== author.id) {
        throw new Error(t("errors.onlyAuthorEdits"));
      }

      Object.assign(existing, shared, { updatedAt: nowIso() });
      return cloneRecord(existing);
    }

    const created: CalendarEvent = {
      id: `evt-${mockDatabase.calendarEvents.length + 1}-${Date.now()}`,
      ...shared,
      authorId: author.id,
      authorName: author.name,
      createdAt: nowIso(),
      updatedAt: null,
    };

    mockDatabase.calendarEvents.unshift(created);

    // Shared events reach other people, so they belong in the trail; private ones do not.
    if (created.visibility !== "personal") {
      appendAuditLog({
        userName: author.name,
        action: "CREATE",
        entity: "calendar-event",
        description: `${created.title} on ${created.date} (${created.visibility}).`,
      });
    }

    return cloneRecord(created);
  });
}

export async function deleteCalendarEvent(eventId: string, author: CalendarAuthor): Promise<void> {
  return mockRequest(() => {
    const index = mockDatabase.calendarEvents.findIndex((item) => item.id === eventId);

    if (index < 0) {
      throw new Error(t("errors.eventGone"));
    }

    const event = mockDatabase.calendarEvents[index]!;

    if (event.authorId !== author.id) {
      throw new Error(t("errors.onlyAuthorRemoves"));
    }

    mockDatabase.calendarEvents.splice(index, 1);

    if (event.visibility !== "personal") {
      appendAuditLog({
        userName: author.name,
        action: "DELETE",
        entity: "calendar-event",
        description: `${event.title} on ${event.date}.`,
      });
    }
  });
}
