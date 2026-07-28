import type { AppNotification } from "../types/notifications";

import { cloneRecord, mockRequest } from "./mockTransport";

const mockNotifications: AppNotification[] = [
  {
    id: "notif-1",
    title: "New attendance correction",
    description: "A manual correction was submitted for Bruno Henrique Costa.",
    createdAt: "2026-07-27T08:58:00.000Z",
    read: false,
    tone: "warning",
  },
  {
    id: "notif-2",
    title: "Device back online",
    description: "Terminal A resumed heartbeat communication.",
    createdAt: "2026-07-27T08:42:00.000Z",
    read: false,
    tone: "success",
  },
  {
    id: "notif-3",
    title: "Weekly report ready",
    description: "The attendance summary report is ready for export.",
    createdAt: "2026-07-26T17:05:00.000Z",
    read: true,
    tone: "info",
  },
];

export async function listNotifications(): Promise<AppNotification[]> {
  return mockRequest(() => cloneRecord(mockNotifications));
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  await mockRequest(() => {
    const target = mockNotifications.find((item) => item.id === notificationId);
    if (!target) {
      throw new Error("Notification not found.");
    }

    target.read = true;
  });
}

export async function markAllNotificationsAsRead(): Promise<void> {
  await mockRequest(() => {
    for (const notification of mockNotifications) {
      notification.read = true;
    }
  });
}
