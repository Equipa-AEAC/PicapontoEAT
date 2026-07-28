import { computed, ref } from "vue";
import { defineStore } from "pinia";

import type { AuditFilters, AuditLogEntry } from "../types/audit";
import { listAuditLogs } from "../services/audit.service";

export const useAuditStore = defineStore("audit", () => {
  const items = ref<AuditLogEntry[]>([]);
  const filters = ref<AuditFilters>({ query: "", entity: "all", action: "all", userName: "all" });
  const loading = ref(false);

  const entityCount = computed(() => new Set(items.value.map((entry) => entry.entity)).size);

  async function loadAuditLogs() {
    loading.value = true;
    try {
      items.value = await listAuditLogs(filters.value);
    } finally {
      loading.value = false;
    }
  }

  return {
    items,
    filters,
    loading,
    entityCount,
    loadAuditLogs,
  };
});
