import { computed, ref } from "vue";
import { defineStore } from "pinia";

import type { StudentPortalSummary } from "../types/portal";
import { getStudentPortalSummary } from "../services/portal.service";

export const usePortalStore = defineStore("portal", () => {
  const summary = ref<StudentPortalSummary | null>(null);
  const loading = ref(false);

  const progress = computed(() => summary.value?.internshipProgress ?? 0);

  async function loadPortalSummary() {
    loading.value = true;
    try {
      summary.value = await getStudentPortalSummary();
    } finally {
      loading.value = false;
    }
  }

  return {
    summary,
    loading,
    progress,
    loadPortalSummary,
  };
});
