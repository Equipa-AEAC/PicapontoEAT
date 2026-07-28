import { computed, ref } from "vue";
import { defineStore } from "pinia";

import { getDashboardActivity, getDashboardMetrics } from "../services/dashboard.service";

export const useDashboardStore = defineStore("dashboard", () => {
  const metrics = ref<Awaited<ReturnType<typeof getDashboardMetrics>>>([]);
  const activity = ref<Awaited<ReturnType<typeof getDashboardActivity>>>([]);
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
      error.value = loadError instanceof Error ? loadError.message : "Unable to load dashboard data.";
    } finally {
      loading.value = false;
    }
  }

  return {
    metrics,
    activity,
    loading,
    error,
    hasData,
    loadDashboard,
  };
});
