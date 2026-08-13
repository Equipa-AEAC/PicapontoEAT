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

export const useAnnouncementsStore = defineStore("announcements", () => {
  const items = ref<AnnouncementSummary[]>([]);
  const visibleForMember = ref<AnnouncementSummary[]>([]);
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

  return {
    items,
    visibleForMember,
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
  };
});
