import { computed, ref } from "vue";
import { defineStore } from "pinia";

import type {
  MomentAuthorGroup,
  MomentFormValues,
  MomentModerationSummary,
  MomentReportReason,
  TeamMomentSummary,
} from "../types/moments";
import { MAX_MOMENTS_PER_MEMBER_PER_DAY } from "../types/moments";
import {
  deleteMoment,
  getMomentSummary,
  listMoments,
  listMomentsByAuthor,
  listMomentsForModeration,
  prepareMomentImage,
  publishMoment,
  reportMoment,
  setMomentStatus,
  type MomentAuthor,
} from "../services/moments.service";
import { useAuthStore } from "../modules/authentication/stores/auth";

/**
 * Team moments state.
 *
 * Reloads on every mutation rather than patching in place, because a moment can
 * expire between two reads and the derived counts (quota left, stored bytes, minutes
 * until expiry) are all time-dependent — a cached copy goes wrong on its own.
 */
export const useMomentsStore = defineStore("moments", () => {
  const authStore = useAuthStore();

  const moments = ref<TeamMomentSummary[]>([]);
  const groups = ref<MomentAuthorGroup[]>([]);
  const moderationQueue = ref<TeamMomentSummary[]>([]);
  const summary = ref<MomentModerationSummary | null>(null);
  const loading = ref(false);
  const publishing = ref(false);
  const errorMessage = ref<string | null>(null);

  const currentAuthor = computed<MomentAuthor>(() => ({
    id: authStore.currentUser?.id ?? "unknown",
    name: authStore.currentUser?.fullName ?? "Unknown member",
    isExternal: false,
  }));

  const myMoments = computed(() => moments.value.filter((moment) => moment.authorId === currentAuthor.value.id));

  const remainingQuota = computed(() => Math.max(0, MAX_MOMENTS_PER_MEMBER_PER_DAY - myMoments.value.length));

  const reportedMoments = computed(() => moderationQueue.value.filter((moment) => moment.status === "reported"));

  async function withErrorHandling<T>(fallbackMessage: string, work: () => Promise<T>): Promise<T | null> {
    errorMessage.value = null;

    try {
      return await work();
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : fallbackMessage;
      return null;
    }
  }

  async function loadGallery() {
    loading.value = true;

    await withErrorHandling("Unable to load team moments.", async () => {
      const [loadedMoments, loadedGroups, loadedSummary] = await Promise.all([
        listMoments(),
        listMomentsByAuthor(),
        getMomentSummary(),
      ]);
      moments.value = loadedMoments;
      groups.value = loadedGroups;
      summary.value = loadedSummary;
    });

    loading.value = false;
  }

  async function loadModerationQueue() {
    loading.value = true;

    await withErrorHandling("Unable to load the moderation queue.", async () => {
      const [queue, loadedSummary] = await Promise.all([listMomentsForModeration(), getMomentSummary()]);
      moderationQueue.value = queue;
      summary.value = loadedSummary;
    });

    loading.value = false;
  }

  /** Downscales and encodes a chosen photo so the form can preview it before posting. */
  async function prepareImage(file: File) {
    return withErrorHandling("Unable to process that photo.", () => prepareMomentImage(file));
  }

  async function publish(values: MomentFormValues) {
    publishing.value = true;

    const result = await withErrorHandling("Unable to post the moment.", async () => {
      const moment = await publishMoment(values, currentAuthor.value);
      await loadGallery();
      return moment;
    });

    publishing.value = false;
    return result;
  }

  async function report(momentId: string, reason: MomentReportReason, note: string) {
    await withErrorHandling("Unable to report the moment.", async () => {
      await reportMoment(momentId, reason, note, currentAuthor.value);
      await loadGallery();
    });
  }

  async function hide(momentId: string) {
    await withErrorHandling("Unable to hide the moment.", async () => {
      await setMomentStatus(momentId, "hidden", currentAuthor.value.name);
      await Promise.all([loadModerationQueue(), loadGallery()]);
    });
  }

  async function restore(momentId: string) {
    await withErrorHandling("Unable to restore the moment.", async () => {
      await setMomentStatus(momentId, "visible", currentAuthor.value.name);
      await Promise.all([loadModerationQueue(), loadGallery()]);
    });
  }

  async function remove(momentId: string) {
    await withErrorHandling("Unable to remove the moment.", async () => {
      await deleteMoment(momentId);
      await Promise.all([loadModerationQueue(), loadGallery()]);
    });
  }

  return {
    moments,
    groups,
    moderationQueue,
    summary,
    loading,
    publishing,
    errorMessage,
    currentAuthor,
    myMoments,
    remainingQuota,
    reportedMoments,
    loadGallery,
    loadModerationQueue,
    prepareImage,
    publish,
    report,
    hide,
    restore,
    remove,
  };
});
