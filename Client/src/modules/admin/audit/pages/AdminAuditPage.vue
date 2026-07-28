<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Button from "primevue/button";
import Column from "primevue/column";
import Select from "primevue/select";

import { BaseCard, BaseEmptyState, BaseLoading, BasePageHeader, BaseSection, BaseSearchBar, BaseStatusPill, BaseStatsCard, BaseTable, BaseToolbar } from "../../../../shared/components/base";
import { useAuditStore } from "../../../../shared/stores";
import type { AuditLogEntry } from "../../../../types/audit";

const auditStore = useAuditStore();
const searchQuery = ref("");
const entityFilter = ref<string>("all");
const actionFilter = ref<string>("all");
const userFilter = ref<string>("all");
const selectedLog = ref<AuditLogEntry | null>(null);

const entityOptions = computed(() => [
  { label: "All entities", value: "all" },
  ...Array.from(new Set(auditStore.items.map((entry) => entry.entity))).map((value) => ({ label: value, value })),
]);

const actionOptions = computed(() => [
  { label: "All actions", value: "all" },
  ...Array.from(new Set(auditStore.items.map((entry) => entry.action))).map((value) => ({ label: value, value })),
]);

const userOptions = computed(() => [
  { label: "All users", value: "all" },
  ...Array.from(new Set(auditStore.items.map((entry) => entry.userName))).map((value) => ({ label: value, value })),
]);

const visibleLogs = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  return auditStore.items.filter((entry) => {
    const matchesQuery = query.length === 0 || [entry.userName, entry.action, entry.entity, entry.description, entry.deviceName].join(" ").toLowerCase().includes(query);
    const matchesEntity = entityFilter.value === "all" || entry.entity === entityFilter.value;
    const matchesAction = actionFilter.value === "all" || entry.action === actionFilter.value;
    const matchesUser = userFilter.value === "all" || entry.userName === userFilter.value;
    return matchesQuery && matchesEntity && matchesAction && matchesUser;
  });
});

const selectedCount = computed(() => (selectedLog.value ? 1 : 0));

function openLog(event: unknown) {
  selectedLog.value = (event as { data?: AuditLogEntry } | undefined)?.data ?? null;
}

function resetFilters() {
  searchQuery.value = "";
  entityFilter.value = "all";
  actionFilter.value = "all";
  userFilter.value = "all";
}

onMounted(async () => {
  if (!auditStore.items.length) {
    await auditStore.loadAuditLogs();
  }
});
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      eyebrow="Admin workspace"
      title="Audit"
      description="Review audit-friendly log entries with filters and record drill-down."
    >
      <template #actions>
        <Button label="Refresh" severity="secondary" outlined :loading="auditStore.loading" @click="auditStore.loadAuditLogs()" />
      </template>
    </BasePageHeader>

    <section class="metric-grid">
      <BaseStatsCard label="Entries" :value="String(auditStore.items.length)" caption="Total audit records" />
      <BaseStatsCard label="Selected" :value="String(selectedCount)" caption="Current drill-down row" />
      <BaseStatsCard label="Entities" :value="String(auditStore.entityCount)" caption="Unique audited entities" />
      <BaseStatsCard label="Users" :value="String(userOptions.length - 1)" caption="Distinct actors" />
    </section>

    <BaseToolbar>
      <template #left>
        <div class="filter-strip">
          <BaseSearchBar v-model="searchQuery" placeholder="Search audit logs" />
          <Select v-model="entityFilter" :options="entityOptions" optionLabel="label" optionValue="value" />
          <Select v-model="actionFilter" :options="actionOptions" optionLabel="label" optionValue="value" />
          <Select v-model="userFilter" :options="userOptions" optionLabel="label" optionValue="value" />
        </div>
      </template>
      <template #right>
        <Button label="Reset" severity="secondary" outlined @click="resetFilters" />
      </template>
    </BaseToolbar>

    <BaseLoading v-if="auditStore.loading" />

    <BaseSection v-else title="Audit table" description="Searchable and filterable security and operations logs.">
      <BaseCard>
        <BaseTable :value="visibleLogs" dataKey="id" paginator :rows="8" @rowClick="openLog">
          <template #empty>
            <BaseEmptyState title="No audit logs" description="No audit records match the current filters." />
          </template>

          <Column field="timestamp" header="Timestamp" sortable />
          <Column field="userName" header="User" sortable />
          <Column field="action" header="Action" sortable />
          <Column field="entity" header="Entity" sortable />
          <Column field="description" header="Description" />
          <Column field="ipAddress" header="IP" />
          <Column field="deviceName" header="Device" sortable />
        </BaseTable>
      </BaseCard>

      <BaseCard v-if="selectedLog" title="Audit details" description="Selected audit row and metadata.">
        <div class="module-summary">
          <BaseStatusPill :label="selectedLog.action" tone="info" />
          <p><strong>User:</strong> {{ selectedLog.userName }}</p>
          <p><strong>Entity:</strong> {{ selectedLog.entity }}</p>
          <p><strong>Description:</strong> {{ selectedLog.description }}</p>
          <p><strong>IP address:</strong> {{ selectedLog.ipAddress }}</p>
          <p><strong>Device:</strong> {{ selectedLog.deviceName }}</p>
        </div>
      </BaseCard>
    </BaseSection>
  </section>
</template>
