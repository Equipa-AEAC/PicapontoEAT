import { computed, ref } from "vue";
import { defineStore } from "pinia";

import type { AnnouncementFormValues, AnnouncementSummary } from "../types/announcements";
import type { PlacementProgram } from "../types/placements";
import {
  archiveAnnouncement,
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
  listAnnouncementsForProgram,
  publishAnnouncement,
  updateAnnouncement,
} from "../services/announcements.service";
import { countUnreadAnnouncements, listAnnouncementsForMember, markAnnouncementRead } from "../services/announcements.service";
import type { MemberAnnouncement } from "../types/announcements";

export const useAnnouncementsStore = defineStore("announcements", () => {
  const items = ref<AnnouncementSummary[]>([]);
  const visibleForMember = ref<AnnouncementSummary[]>([]);
  /** The member's own view: the same notices, plus whether they opened each one. */
  const mine = ref<MemberAnnouncement[]>([]);
  const unreadCount = ref(0);
  const loading = ref(false);
  const saving = ref(false);
  const errorMessage = ref<string | null>(null);

  const publishedCount = computed(() => items.value.filter((item) => item.status === "published").length);
  const draftCount = computed(() => items.value.filter((item) => item.status === "draft").length);

  async function loadAnnouncements() {
    loading.value = true;
    try {
      items.value = await listAnnouncements();
    } finally {
      loading.value = false;
    }
  }

  async function loadAnnouncementsForProgram(program: PlacementProgram) {
    loading.value = true;
    try {
      visibleForMember.value = await listAnnouncementsForProgram(program);
    } finally {
      loading.value = false;
    }
  }

  async function runMutation(mutation: () => Promise<unknown>) {
    saving.value = true;
    errorMessage.value = null;
    try {
      await mutation();
      await loadAnnouncements();
      return true;
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : "Unexpected error.";
      return false;
    } finally {
      saving.value = false;
    }
  }

  async function addAnnouncement(values: AnnouncementFormValues, author: string) {
    return runMutation(() => createAnnouncement(values, author));
  }

  async function editAnnouncement(announcementId: string, values: AnnouncementFormValues) {
    return runMutation(() => updateAnnouncement(announcementId, values));
  }

  async function publish(announcementId: string) {
    return runMutation(() => publishAnnouncement(announcementId));
  }

  async function archive(announcementId: string) {
    return runMutation(() => archiveAnnouncement(announcementId));
  }

  async function remove(announcementId: string) {
    return runMutation(() => deleteAnnouncement(announcementId));
  }

  /** Load one member's announcements together with their read state. */
  async function loadForMember(memberId: string, program: PlacementProgram) {
    loading.value = true;
    errorMessage.value = null;

    try {
      mine.value = await listAnnouncementsForMember(memberId, program);
      unreadCount.value = mine.value.filter((item) => item.readAt === null).length;
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : "Announcements could not be loaded.";
    } finally {
      loading.value = false;
    }
  }

  /**
   * Mark one notice read.
   *
   * Updates the row in place rather than reloading the list: re-sorting the page
   * under the reader the moment they open something would be hostile.
   */
  async function markRead(memberId: string, announcementId: string) {
    const target = mine.value.find((item) => item.id === announcementId);

    if (!target || target.readAt !== null) {
      return;
    }

    try {
      const updated = await markAnnouncementRead(memberId, announcementId);
      target.readAt = updated.readAt;
      unreadCount.value = mine.value.filter((item) => item.readAt === null).length;
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : "Could not mark that as read.";
    }
  }

  /** Cheap enough to call on every student navigation; drives the sidebar badge. */
  async function refreshUnreadCount(memberId: string, program: PlacementProgram) {
    try {
      unreadCount.value = await countUnreadAnnouncements(memberId, program);
    } catch {
      unreadCount.value = 0;
    }
  }

  return {
    items,
    visibleForMember,
    mine,
    unreadCount,
    loading,
    saving,
    errorMessage,
    publishedCount,
    draftCount,
    loadAnnouncements,
    loadAnnouncementsForProgram,
    addAnnouncement,
    editAnnouncement,
    publish,
    archive,
    remove,
    loadForMember,
    markRead,
    refreshUnreadCount,
  };
});
