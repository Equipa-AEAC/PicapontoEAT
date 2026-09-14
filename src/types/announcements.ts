import type { PlacementProgram } from "./placements";

/*
 * The label maps that used to live here now live in `i18n/vocabulary.ts`.
 *
 * A `Record<Status, string>` is evaluated once at import, which cannot
 * survive a language change. The *values* and their order are still a
 * product decision and stay in this file; how to write them is not.
 */
export type AnnouncementStatus = "draft" | "published" | "archived";
export type AnnouncementPriority = "normal" | "important" | "urgent";

/**
 * Announcements can be addressed to everyone or narrowed to one of the two
 * participation tracks, so internship-only notices never reach members who are
 * merely accumulating surplus hours.
 */
export type AnnouncementAudience = "all" | PlacementProgram;

export interface AnnouncementSummary {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  publishedAt: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string | null;
}

/**
 * Which announcements a member has opened.
 *
 * Read state belongs to the (member, announcement) pair rather than to the
 * announcement, because the same notice is unread for one person and read for
 * another. Stored as its own collection for the same reason a join table exists.
 *
 * BACKEND CONTRACT: this needs a real table with a unique key on
 * (memberId, announcementId) and a server-set `readAt`. Marking read must be
 * idempotent — re-opening a notice must not move the timestamp. See
 * docs/ai/BACKEND_CONTRACTS.md.
 */
export interface AnnouncementRead {
  memberId: string;
  announcementId: string;
  readAt: string;
}

/** An announcement as one member sees it. */
export interface MemberAnnouncement extends AnnouncementSummary {
  /** Null while the member has not opened it. */
  readAt: string | null;
}

export interface AnnouncementFormValues {
  title: string;
  body: string;
  audience: AnnouncementAudience;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
}

export interface AnnouncementFilters {
  query: string;
  audience: AnnouncementAudience | "all-audiences";
  status: AnnouncementStatus | "all";
}
