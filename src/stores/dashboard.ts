import { computed, ref, shallowRef } from "vue";
import { defineStore } from "pinia";

import { getDashboardActivity, getDashboardMetrics } from "../services/dashboard.service";
import { t } from "../i18n";

export const useDashboardStore = defineStore("dashboard", () => {
  /**
   * shallowRef: metrics carry an icon *component*, and a deep ref would proxy it —
   * which Vue warns about. The array is always replaced wholesale, never mutated,
   * so shallow reactivity is all this needs.
   */
  const metrics = shallowRef<Awaited<ReturnType<typeof getDashboardMetrics>>>([]);
  const activity = shallowRef<Awaited<ReturnType<typeof getDashboardActivity>>>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const hasData = computed(() => metrics.value.length > 0 || activity.value.length > 0);

  async function loadDashboard() {
    loading.value = true;
    error.value = null;

    try {
      const [metricData, activityData] = await Promise.all([getDashboardMetrics(), getDashboardActivity()]);
      metrics.value = metricData;
      activity.value = activityData;
    } catch (loadError) {
      error.value = loadError instanceof Error ? loadError.message : t("common.feedback.loadDashboard");
    } finally {
      loading.value = false;
    }
  }

  return {
    metrics,
    activity,
    loading,
    error,
    /** Alias so every page reads the same property name. */
    errorMessage: error,
    hasData,
    loadDashboard,
  };
});
