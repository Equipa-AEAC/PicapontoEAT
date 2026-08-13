import type { AnnouncementFormValues, AnnouncementSummary } from "../types/announcements";
import type { PlacementProgram } from "../types/placements";

import { cloneRecord, mockRequest } from "./mockTransport";
import { mockDatabase } from "./mockDatabase";
import { todayIsoDate } from "../utils/date";

function findAnnouncement(announcementId: string): AnnouncementSummary {
  const announcement = mockDatabase.announcements.find((item) => item.id === announcementId);

  if (!announcement) {
    throw new Error("Announcement not found.");
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
