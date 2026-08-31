import { computed, ref } from "vue";
import { defineStore } from "pinia";

import type { StudentPortalSummary } from "../types/portal";
import { getStudentPortalSummary } from "../services/portal.service";
import { describeError } from "../utils/errors";

export const usePortalStore = defineStore("portal", () => {
  const summary = ref<StudentPortalSummary | null>(null);
  const loading = ref(false);
  /**
   * Six student pages read this store. Without an error state every one of them
   * renders "you have no records" when the request simply failed — the most
   * alarming thing the portal could tell a student who does have records.
   */
  const errorMessage = ref<string | null>(null);

  const progress = computed(() => summary.value?.internshipProgress ?? 0);

  /**
   * `memberId` comes from `authStore.currentMemberId` at the call site.
   *
   * The portal's hour figures are derived per member, so the summary can no
   * longer be a single fixture object — it has to be built for whoever is signed
   * in. An empty id yields zero hours rather than somebody else's.
   */
  async function loadPortalSummary(memberId: string) {
    loading.value = true;
    errorMessage.value = null;

    try {
      summary.value = await getStudentPortalSummary(memberId);
    } catch (error) {
      errorMessage.value = describeError(error, "Your portal could not be loaded.");
    } finally {
      loading.value = false;
    }
  }

  return {
    summary,
    loading,
    errorMessage,
    progress,
    loadPortalSummary,
  };
});
