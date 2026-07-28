import { computed, ref } from "vue";
import { defineStore } from "pinia";

import { listNotifications, markAllNotificationsAsRead, markNotificationAsRead } from "../services/notifications.service";
import type { AppNotification } from "../types/notifications";

export const useNotificationsStore = defineStore("notifications", () => {
  const items = ref<AppNotification[]>([]);
  const loading = ref(false);
  const saving = ref(false);
  const error = ref<string | null>(null);

  const unreadCount = computed(() => items.value.filter((item) => !item.read).length);

  async function loadNotifications() {
    loading.value = true;
    error.value = null;

    try {
      items.value = await listNotifications();
    } catch (loadError) {
      error.value = loadError instanceof Error ? loadError.message : "Unable to load notifications.";
    } finally {
      loading.value = false;
    }
  }

  async function markRead(notificationId: string) {
    saving.value = true;

    try {
      await markNotificationAsRead(notificationId);
      const target = items.value.find((item) => item.id === notificationId);
      if (target) {
        target.read = true;
      }
    } finally {
      saving.value = false;
    }
  }

  async function markAllRead() {
    saving.value = true;

    try {
      await markAllNotificationsAsRead();
      for (const notification of items.value) {
        notification.read = true;
      }
    } finally {
      saving.value = false;
    }
  }

  return {
    items,
    loading,
    saving,
    error,
    unreadCount,
    loadNotifications,
    markRead,
    markAllRead,
  };
});
