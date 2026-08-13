import type { PlacementProgram } from "./placements";

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

export const ANNOUNCEMENT_AUDIENCE_LABELS: Record<AnnouncementAudience, string> = {
  all: "Everyone",
  "equipa-hours": "Surplus-hours members",
  "official-internship": "Official interns",
};

export const ANNOUNCEMENT_STATUS_LABELS: Record<AnnouncementStatus, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

export const ANNOUNCEMENT_PRIORITY_LABELS: Record<AnnouncementPriority, string> = {
  normal: "Normal",
  important: "Important",
  urgent: "Urgent",
};

function toOptions<T extends string>(labels: Record<T, string>) {
  return (Object.keys(labels) as T[]).map((value) => ({ label: labels[value], value }));
}

export const ANNOUNCEMENT_AUDIENCE_OPTIONS = toOptions(ANNOUNCEMENT_AUDIENCE_LABELS);
export const ANNOUNCEMENT_STATUS_OPTIONS = toOptions(ANNOUNCEMENT_STATUS_LABELS);
export const ANNOUNCEMENT_PRIORITY_OPTIONS = toOptions(ANNOUNCEMENT_PRIORITY_LABELS);
