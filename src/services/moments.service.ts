import type {
  MomentAuthorGroup,
  MomentFormValues,
  MomentModerationSummary,
  MomentReportReason,
  MomentStatus,
  TeamMoment,
  TeamMomentSummary,
} from "../types/moments";
import {
  MAX_MOMENTS_PER_MEMBER_PER_DAY,
  MAX_MOMENT_BYTES,
  MAX_MOMENT_CAPTION_LENGTH,
  MOMENT_IMAGE_MAX_EDGE,
  MOMENT_LIFETIME_MS,
} from "../types/moments";

import { cloneRecord, mockRequest } from "./mockTransport";
import { mockDatabase } from "./mockDatabase";
import { ACCEPTED_IMAGE_TYPES } from "./uploads.service";

/**
 * Team moments.
 *
 * Two things make this cheap enough to belong in the product rather than being a
 * social network bolted onto it:
 *
 *  1. Expiry is a read-time filter on `expiresAt`, not a scheduled job. A moment is
 *     gone the instant the clock passes it, on every client, with nothing to run.
 *  2. Photos are downscaled and re-encoded in the browser before they are stored, so
 *     the storage cost is bounded by `MAX_MOMENT_BYTES` regardless of what camera
 *     the photo came from.
 *
 * The mock transport keeps the encoded image inline as a data URL. Swapping to the
 * real backend replaces the body of `publishMoment` with the upload call and leaves
 * every caller unchanged:
 *
 *   const body = new FormData();
 *   body.append("file", file);
 *   const { data } = await httpClient.post<TeamMoment>("/moments", body);
 *   return data;
 */

export interface MomentAuthor {
  id: string;
  name: string;
  isExternal: boolean;
}

function nowIso(): string {
  return new Date().toISOString();
}

function nextId(prefix: string, existing: Array<{ id: string }>): string {
  const highest = existing.reduce((max, item) => {
    const numeric = Number(item.id.replace(/^\D+/, ""));
    return Number.isFinite(numeric) && numeric > max ? numeric : max;
  }, 0);

  return `${prefix}-${highest + 1}`;
}

/** Moments whose 24 hours have not run out yet, regardless of moderation status. */
function unexpired(): TeamMoment[] {
  const now = Date.now();
  return mockDatabase.teamMoments.filter((moment) => Date.parse(moment.expiresAt) > now);
}

/**
 * Drops expired rows from storage.
 *
 * Read-time filtering already hides them, so this is purely about not holding image
 * bytes for photos nobody can see any more. It runs on every read, which is enough
 * for a gallery this size and needs no scheduler.
 */
function pruneExpired() {
  const now = Date.now();

  for (let index = mockDatabase.teamMoments.length - 1; index >= 0; index -= 1) {
    if (Date.parse(mockDatabase.teamMoments[index].expiresAt) <= now) {
      mockDatabase.teamMoments.splice(index, 1);
    }
  }
}

function toSummary(moment: TeamMoment): TeamMomentSummary {
  const project = mockDatabase.projects.find((item) => item.id === moment.projectId);
  const created = Date.parse(moment.createdAt);
  const expires = Date.parse(moment.expiresAt);
  const now = Date.now();

  return {
    ...moment,
    projectName: project?.name ?? null,
    minutesSincePosted: Math.max(0, Math.floor((now - created) / 60_000)),
    minutesUntilExpiry: Math.max(0, Math.floor((expires - now) / 60_000)),
  };
}

/* ---------------------------------------------------------------- Uploading */

/**
 * Downscales and re-encodes a photo in the browser.
 *
 * This is the storage guard doing its real work: a 6 MB phone photo comes back as a
 * few hundred kilobytes of JPEG, so the per-moment cap is something an upload will
 * pass rather than something it constantly trips over. Quality is stepped down until
 * the result fits, and the last attempt is returned either way so the caller's size
 * check is the single place a too-large image is rejected.
 */
async function encodeMomentImage(file: File): Promise<{ dataUrl: string; bytes: number }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MOMENT_IMAGE_MAX_EDGE / Math.max(bitmap.width, bitmap.height));

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("This browser cannot process the selected image.");
  }

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  let dataUrl = "";
  let bytes = Number.POSITIVE_INFINITY;

  for (const quality of [0.82, 0.7, 0.58, 0.45]) {
    dataUrl = canvas.toDataURL("image/jpeg", quality);
    // A base64 payload is 4 characters per 3 bytes; close enough for a size guard.
    bytes = Math.round((dataUrl.length - dataUrl.indexOf(",") - 1) * 0.75);

    if (bytes <= MAX_MOMENT_BYTES) {
      break;
    }
  }

  return { dataUrl, bytes };
}

/** Rejects a file before any work is done on it. Returns null when it is fine. */
export function validateMomentFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return "Use a PNG, JPG or WebP photo.";
  }

  return null;
}

/**
 * Prepares a chosen photo for posting. Kept separate from `publishMoment` so the
 * form can show a preview and let the author write a caption before anything is
 * committed.
 */
export async function prepareMomentImage(file: File): Promise<{ imageUrl: string; bytes: number }> {
  const validationError = validateMomentFile(file);

  if (validationError) {
    throw new Error(validationError);
  }

  const { dataUrl, bytes } = await encodeMomentImage(file);

  if (bytes > MAX_MOMENT_BYTES) {
    throw new Error("That photo is too large to post even after compression. Try a smaller one.");
  }

  return { imageUrl: dataUrl, bytes };
}

/* ------------------------------------------------------------------ Reading */

/** Active gallery: unexpired, not hidden by an administrator, newest first. */
export async function listMoments(): Promise<TeamMomentSummary[]> {
  return mockRequest(() => {
    pruneExpired();

    const visible = unexpired()
      .filter((moment) => moment.status !== "hidden")
      .map(toSummary)
      .sort((first, second) => second.createdAt.localeCompare(first.createdAt));

    return cloneRecord(visible);
  });
}

/**
 * The same moments grouped by author, which is how the gallery is browsed: one
 * entry per person, their moments inside it oldest-first so they read in order.
 */
export async function listMomentsByAuthor(): Promise<MomentAuthorGroup[]> {
  return mockRequest(() => {
    pruneExpired();

    const groups = new Map<string, MomentAuthorGroup>();

    for (const moment of unexpired().filter((item) => item.status !== "hidden")) {
      const existing = groups.get(moment.authorId);
      const summary = toSummary(moment);

      if (existing) {
        existing.moments.push(summary);
        existing.latestAt =
          summary.createdAt > existing.latestAt ? summary.createdAt : existing.latestAt;
        continue;
      }

      groups.set(moment.authorId, {
        authorId: moment.authorId,
        authorName: moment.authorName,
        authorIsExternal: moment.authorIsExternal,
        moments: [summary],
        latestAt: summary.createdAt,
      });
    }

    const ordered = [...groups.values()].sort((first, second) => second.latestAt.localeCompare(first.latestAt));
    ordered.forEach((group) => group.moments.sort((first, second) => first.createdAt.localeCompare(second.createdAt)));

    return cloneRecord(ordered);
  });
}

/** Everything an administrator moderates: includes hidden and reported moments. */
export async function listMomentsForModeration(): Promise<TeamMomentSummary[]> {
  return mockRequest(() => {
    pruneExpired();

    const all = unexpired()
      .map(toSummary)
      .sort((first, second) => {
        // Reported first — that is what an administrator opened this page for.
        if (first.status === "reported" && second.status !== "reported") return -1;
        if (second.status === "reported" && first.status !== "reported") return 1;
        return second.createdAt.localeCompare(first.createdAt);
      });

    return cloneRecord(all);
  });
}

export async function getMomentSummary(): Promise<MomentModerationSummary> {
  return mockRequest(() => {
    pruneExpired();

    const active = unexpired();
    const visible = active.filter((moment) => moment.status !== "hidden");

    return {
      activeMoments: visible.length,
      contributorsToday: new Set(visible.map((moment) => moment.authorId)).size,
      reportedMoments: active.filter((moment) => moment.status === "reported").length,
      hiddenMoments: active.filter((moment) => moment.status === "hidden").length,
      storedBytes: active.reduce((total, moment) => total + moment.bytes, 0),
    };
  });
}

/** How many more moments this author may post in the current 24-hour window. */
export async function getRemainingMomentQuota(authorId: string): Promise<number> {
  return mockRequest(() => {
    pruneExpired();
    const posted = unexpired().filter((moment) => moment.authorId === authorId).length;

    return Math.max(0, MAX_MOMENTS_PER_MEMBER_PER_DAY - posted);
  });
}

/* ------------------------------------------------------------------ Writing */

export async function publishMoment(values: MomentFormValues, author: MomentAuthor): Promise<TeamMoment> {
  return mockRequest(() => {
    pruneExpired();

    const alreadyPosted = unexpired().filter((moment) => moment.authorId === author.id).length;

    if (alreadyPosted >= MAX_MOMENTS_PER_MEMBER_PER_DAY) {
      throw new Error(`You can post ${MAX_MOMENTS_PER_MEMBER_PER_DAY} moments in a 24-hour window.`);
    }

    if (values.bytes > MAX_MOMENT_BYTES) {
      throw new Error("That photo is too large to post.");
    }

    const createdAt = nowIso();

    const moment: TeamMoment = {
      id: nextId("mom", mockDatabase.teamMoments),
      authorId: author.id,
      authorName: author.name,
      authorIsExternal: author.isExternal,
      imageUrl: values.imageUrl,
      caption: values.caption.trim().slice(0, MAX_MOMENT_CAPTION_LENGTH),
      projectId: values.projectId,
      createdAt,
      expiresAt: new Date(Date.parse(createdAt) + MOMENT_LIFETIME_MS).toISOString(),
      status: "visible",
      bytes: values.bytes,
      reports: [],
      moderatedAt: null,
      moderatedBy: null,
    };

    mockDatabase.teamMoments.push(moment);

    return cloneRecord(moment);
  });
}

/**
 * Flags a moment for an administrator. It stays in the gallery — a single report
 * should not let one person remove someone else's post — but it is surfaced at the
 * top of the moderation list.
 */
export async function reportMoment(
  momentId: string,
  reason: MomentReportReason,
  note: string,
  reporter: MomentAuthor,
): Promise<void> {
  return mockRequest(() => {
    const moment = mockDatabase.teamMoments.find((item) => item.id === momentId);

    if (!moment) {
      return;
    }

    if (moment.reports.some((report) => report.reporterId === reporter.id)) {
      return;
    }

    moment.reports.push({
      id: nextId("rep", moment.reports),
      reporterId: reporter.id,
      reporterName: reporter.name,
      reason,
      note: note.trim(),
      createdAt: nowIso(),
    });

    if (moment.status === "visible") {
      moment.status = "reported";
    }
  });
}

/** Administrator decision. Hiding is reversible until the moment expires anyway. */
export async function setMomentStatus(
  momentId: string,
  status: Extract<MomentStatus, "visible" | "hidden">,
  moderatorName: string,
): Promise<void> {
  return mockRequest(() => {
    const moment = mockDatabase.teamMoments.find((item) => item.id === momentId);

    if (!moment) {
      return;
    }

    moment.status = status;
    moment.moderatedAt = nowIso();
    moment.moderatedBy = moderatorName;

    if (status === "visible") {
      moment.reports = [];
    }
  });
}

/**
 * Removes a moment outright. The author may take down their own; an administrator
 * may take down any. Since every moment disappears within a day regardless, this is
 * a convenience rather than a destructive operation on a record of work.
 */
export async function deleteMoment(momentId: string): Promise<void> {
  return mockRequest(() => {
    const index = mockDatabase.teamMoments.findIndex((item) => item.id === momentId);

    if (index >= 0) {
      mockDatabase.teamMoments.splice(index, 1);
    }
  });
}
