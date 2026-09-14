/*
 * The label maps that used to live here now live in `i18n/vocabulary.ts`.
 *
 * A `Record<Status, string>` is evaluated once at import, which cannot
 * survive a language change. The *values* and their order are still a
 * product decision and stay in this file; how to write them is not.
 */

/**
 * Team moments — a lightweight, temporary photo feed of what the team is doing.
 *
 * Deliberately not a social network: there are no follows, no likes, no comments and
 * no permanent profile. A moment is a photo, a caption and an author, and it stops
 * being visible 24 hours after it was posted. The value is that the admin workspace
 * shows signs of life without anyone having to write a report about it.
 *
 * Expiry is evaluated at read time from `expiresAt` rather than by a background job,
 * so a moment is correct the moment the clock passes it, with no scheduler involved.
 */

/** How long a moment stays in the active gallery. */
export const MOMENT_LIFETIME_HOURS = 24;
export const MOMENT_LIFETIME_MS = MOMENT_LIFETIME_HOURS * 60 * 60 * 1000;

/**
 * Storage guards. Images are held inline by the mock transport, and will be POSTed
 * to an uploads endpoint once one exists, so a cap is needed either way: an
 * unbounded gallery of full-resolution photos would exhaust whatever backs it.
 */
export const MAX_MOMENT_BYTES = 1_500_000;
export const MAX_MOMENTS_PER_MEMBER_PER_DAY = 6;
export const MAX_MOMENT_CAPTION_LENGTH = 140;
/** Longest edge, in pixels, an uploaded photo is downscaled to before storing. */
export const MOMENT_IMAGE_MAX_EDGE = 1280;

/**
 * `visible` is the normal state. `reported` means a member flagged it and it is
 * awaiting an administrator; it stays in the gallery until acted on. `hidden` is the
 * administrator's decision and removes it from the gallery immediately.
 */
export type MomentStatus = "visible" | "reported" | "hidden";

export type MomentReportReason = "inappropriate" | "wrong-person" | "not-work-related" | "other";

export interface MomentReport {
  id: string;
  reporterId: string;
  reporterName: string;
  reason: MomentReportReason;
  note: string;
  createdAt: string;
}

export interface TeamMoment {
  id: string;
  /** Member id or staff account id — the same participant id space projects use. */
  authorId: string;
  authorName: string;
  authorIsExternal: boolean;
  /** Stored image location. A data URL under the mock transport. */
  imageUrl: string;
  caption: string;
  /** Optional link to the project the photo shows work on. */
  projectId: string | null;
  createdAt: string;
  /** `createdAt` + 24h. Read-time expiry compares against this. */
  expiresAt: string;
  status: MomentStatus;
  /** Byte size of the stored image, so the storage guard can be enforced. */
  bytes: number;
  reports: MomentReport[];
  /** Set when an administrator hid or restored the moment. */
  moderatedAt: string | null;
  moderatedBy: string | null;
}

/** A moment joined with what the gallery needs to render it. */
export interface TeamMomentSummary extends TeamMoment {
  projectName: string | null;
  /** Whole minutes since posting, for the "2h ago" line. */
  minutesSincePosted: number;
  /** Whole minutes until expiry. Never negative — expired moments are filtered out. */
  minutesUntilExpiry: number;
}

/** Moments by one author, which is how the gallery groups them. */
export interface MomentAuthorGroup {
  authorId: string;
  authorName: string;
  authorIsExternal: boolean;
  moments: TeamMomentSummary[];
  latestAt: string;
}

export interface MomentFormValues {
  imageUrl: string;
  caption: string;
  projectId: string | null;
  bytes: number;
}

export interface MomentModerationSummary {
  activeMoments: number;
  contributorsToday: number;
  reportedMoments: number;
  hiddenMoments: number;
  /** Total bytes held by moments that have not expired yet. */
  storedBytes: number;
}
