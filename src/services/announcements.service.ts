import type { AnnouncementFormValues, AnnouncementRead, AnnouncementSummary, MemberAnnouncement } from "../types/announcements";
import type { PlacementProgram } from "../types/placements";

import { cloneRecord, mockRequest } from "./mockTransport";
import { mockDatabase } from "./mockDatabase";
import { todayIsoDate } from "../utils/date";
import { t } from "../i18n";

function findAnnouncement(announcementId: string): AnnouncementSummary {
  const announcement = mockDatabase.announcements.find((item) => item.id === announcementId);

  if (!announcement) {
    throw new Error(t("errors.announcementNotFound"));
  }

  return announcement;
}

export async function listAnnouncements(): Promise<AnnouncementSummary[]> {
  return mockRequest(() => cloneRecord(mockDatabase.announcements));
}

/**
 * Announcements visible to a participant: published only, and either addressed
 * to everyone or to the participation track the member belongs to.
 */
export async function listAnnouncementsForProgram(program: PlacementProgram): Promise<AnnouncementSummary[]> {
  return mockRequest(() =>
    cloneRecord(
      mockDatabase.announcements.filter(
        (item) => item.status === "published" && (item.audience === "all" || item.audience === program),
      ),
    ),
  );
}

export async function createAnnouncement(values: AnnouncementFormValues, author: string): Promise<AnnouncementSummary> {
  return mockRequest(() => {
    const created: AnnouncementSummary = {
      id: `ann-${mockDatabase.announcements.length + 1}-${Date.now()}`,
      title: values.title,
      body: values.body,
      audience: values.audience,
      priority: values.priority,
      status: values.status,
      publishedAt: values.status === "published" ? todayIsoDate() : null,
      createdAt: new Date().toISOString(),
      createdBy: author,
      updatedAt: null,
    };

    mockDatabase.announcements.unshift(created);
    return cloneRecord(created);
  });
}

export async function updateAnnouncement(announcementId: string, values: AnnouncementFormValues): Promise<AnnouncementSummary> {
  return mockRequest(() => {
    const announcement = findAnnouncement(announcementId);

    announcement.title = values.title;
    announcement.body = values.body;
    announcement.audience = values.audience;
    announcement.priority = values.priority;
    announcement.status = values.status;
    announcement.updatedAt = new Date().toISOString();

    if (values.status === "published" && !announcement.publishedAt) {
      announcement.publishedAt = todayIsoDate();
    }

    if (values.status === "draft") {
      announcement.publishedAt = null;
    }

    return cloneRecord(announcement);
  });
}

export async function publishAnnouncement(announcementId: string): Promise<AnnouncementSummary> {
  return mockRequest(() => {
    const announcement = findAnnouncement(announcementId);

    announcement.status = "published";
    announcement.publishedAt = announcement.publishedAt ?? todayIsoDate();
    announcement.updatedAt = new Date().toISOString();
    return cloneRecord(announcement);
  });
}

export async function archiveAnnouncement(announcementId: string): Promise<AnnouncementSummary> {
  return mockRequest(() => {
    const announcement = findAnnouncement(announcementId);

    announcement.status = "archived";
    announcement.updatedAt = new Date().toISOString();
    return cloneRecord(announcement);
  });
}

export async function deleteAnnouncement(announcementId: string): Promise<void> {
  return mockRequest(() => {
    const index = mockDatabase.announcements.findIndex((item) => item.id === announcementId);

    if (index >= 0) {
      mockDatabase.announcements.splice(index, 1);
    }
  });
}

/* ------------------------------------------------------------- Read state */

/*
 * Whether a member has opened a notice.
 *
 * Backend swap point:
 *   GET  /announcements/mine
 *   POST /announcements/:id/read
 *   GET  /announcements/mine/unread/count
 * The member is taken from the session, never from the request body.
 */

function readKey(memberId: string, announcementId: string) {
  return (entry: AnnouncementRead) => entry.memberId === memberId && entry.announcementId === announcementId;
}

/** Published announcements for this member's track, with their read state. */
export async function listAnnouncementsForMember(
  memberId: string,
  program: PlacementProgram,
): Promise<MemberAnnouncement[]> {
  return mockRequest(() => {
    const visible = mockDatabase.announcements.filter(
      (announcement) =>
        announcement.status === "published" &&
        (announcement.audience === "all" || announcement.audience === program),
    );

    return cloneRecord(
      visible
        .map((announcement) => ({
          ...announcement,
          readAt: mockDatabase.announcementReads.find(readKey(memberId, announcement.id))?.readAt ?? null,
        }))
        .sort((first, second) => (second.publishedAt ?? "").localeCompare(first.publishedAt ?? "")),
    );
  });
}

/** Idempotent: opening a notice twice must not move the timestamp. */
export async function markAnnouncementRead(memberId: string, announcementId: string): Promise<MemberAnnouncement> {
  return mockRequest(() => {
    const announcement = mockDatabase.announcements.find((item) => item.id === announcementId);

    if (!announcement) {
      throw new Error(t("errors.announcementGone"));
    }

    const existing = mockDatabase.announcementReads.find(readKey(memberId, announcementId));

    if (!existing) {
      mockDatabase.announcementReads.push({
        memberId,
        announcementId,
        readAt: new Date().toISOString(),
      });
    }

    return cloneRecord({
      ...announcement,
      readAt: mockDatabase.announcementReads.find(readKey(memberId, announcementId))?.readAt ?? null,
    });
  });
}

/** Drives the sidebar badge. Counted rather than listed, so it stays cheap. */
export async function countUnreadAnnouncements(memberId: string, program: PlacementProgram): Promise<number> {
  return mockRequest(
    () =>
      mockDatabase.announcements.filter(
        (announcement) =>
          announcement.status === "published" &&
          (announcement.audience === "all" || announcement.audience === program) &&
          !mockDatabase.announcementReads.some(readKey(memberId, announcement.id)),
      ).length,
    60,
  );
}
