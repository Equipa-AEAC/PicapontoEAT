import { computed, ref } from "vue";
import { t } from "../i18n";
import { defineStore } from "pinia";

import type { AuditFilters, AuditLogEntry } from "../types/audit";
import { listAuditLogs } from "../services/audit.service";
import { describeError } from "../utils/errors";

export const useAuditStore = defineStore("audit", () => {
  /** The filtered result — what the table shows and what an export contains. */
  const items = ref<AuditLogEntry[]>([]);
  /**
   * The unfiltered log, held only to build the filter dropdowns.
   *
   * Deriving the entity/action/user options from `items` would be a trap: once
   * you filtered to `device`, the entity dropdown would contain nothing but
   * `device` and there would be no way back. This mirrors
   * `useMembersStore.allMembers`, which exists for the same reason.
   */
  const allEntries = ref<AuditLogEntry[]>([]);
  const filters = ref<AuditFilters>({ query: "", entity: "all", action: "all", userName: "all" });
  const loading = ref(false);
  /** A failed request must never be shown as an empty result. */
  const errorMessage = ref<string | null>(null);

  const entityCount = computed(() => new Set(items.value.map((entry) => entry.entity)).size);

  async function loadAuditLogs() {
    loading.value = true;
    errorMessage.value = null;
    try {
      items.value = await listAuditLogs(filters.value);
    } catch (error) {
      errorMessage.value = describeError(error, t("errors.loadAudit"));
    } finally {
      loading.value = false;
    }
  }

  /** Refreshed alongside the filtered read so a new entry reaches the dropdowns. */
  async function loadAllEntries() {
    try {
      allEntries.value = await listAuditLogs({});
    } catch {
      // The dropdowns degrade to whatever is already known; the table reports the error.
    }
  }

  function resetFilters() {
    filters.value = { query: "", entity: "all", action: "all", userName: "all" };
  }

  return {
    items,
    allEntries,
    filters,
    loading,
    errorMessage,
    entityCount,
    loadAuditLogs,
    loadAllEntries,
    resetFilters,
  };
});
