<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { PhDownloadSimple } from "@phosphor-icons/vue";

import { BaseButton, BaseCard, BaseEmptyState,
  BaseErrorState, BaseFilterPanel, BaseLoading, BasePageHeader, BaseSection, BaseSearchBar, BaseSelect, BaseStatusPill, BaseStatsCard, BaseTable, BaseTableColumn } from "../../../../shared/components/base";
import { useAuditStore } from "../../../../shared/stores";
import type { AuditLogEntry } from "../../../../types/audit";
import { csvFilename, downloadCsv, toCsv } from "../../../../shared/utils/csv";
import { formatTimestamp } from "../../../../shared/utils/date";

/**
 * The audit trail.
 *
 * The page used to hold its own four filter refs and re-filter the rows in the
 * browser, while `auditStore.filters` sat at its defaults and was never written
 * to — so the loaded set and the displayed set were different collections. That
 * split is why there could be no honest export: exporting what was loaded would
 * have handed over rows the table was hiding. Filtering now goes through the
 * store and the service, and the export is the loaded set.
 */
const auditStore = useAuditStore();
const selectedLog = ref<AuditLogEntry | null>(null);

/** Built from the unfiltered log, so narrowing never removes the way back. */
function optionsFrom(read: (entry: AuditLogEntry) => string, allLabel: string) {
  return [
    { label: allLabel, value: "all" },
    ...Array.from(new Set(auditStore.allEntries.map(read))).sort().map((value) => ({ label: value, value })),
  ];
}

const entityOptions = computed(() => optionsFrom((entry) => entry.entity, "All entities"));
const actionOptions = computed(() => optionsFrom((entry) => entry.action, "All actions"));
const userOptions = computed(() => optionsFrom((entry) => entry.userName, "All users"));

const hasActiveFilters = computed(
  () =>
    auditStore.filters.query.trim().length > 0 ||
    auditStore.filters.entity !== "all" ||
    auditStore.filters.action !== "all" ||
    auditStore.filters.userName !== "all",
);

const actorCount = computed(() => new Set(auditStore.items.map((entry) => entry.userName)).size);

function openLog(event: unknown) {
  selectedLog.value = (event as { data?: AuditLogEntry } | undefined)?.data ?? null;
}

/**
 * Export exactly the rows the table is showing.
 *
 * The audit trail is the thing somebody is asked to produce when a decision is
 * questioned, so the file has to be the filtered view and not a silent dump of
 * everything. A full-history export belongs to the server — see
 * docs/ai/BACKEND_CONTRACTS.md.
 */
function exportCsv() {
  const csv = toCsv(auditStore.items, [
    { header: "Timestamp", value: (row) => row.timestamp },
    { header: "User", value: (row) => row.userName },
    { header: "Action", value: (row) => row.action },
    { header: "Entity", value: (row) => row.entity },
    { header: "Description", value: (row) => row.description },
    { header: "IP address", value: (row) => row.ipAddress },
    { header: "Device", value: (row) => row.deviceName },
  ]);

  const scope = [
    auditStore.filters.entity !== "all" ? auditStore.filters.entity : null,
    auditStore.filters.action !== "all" ? auditStore.filters.action : null,
  ];

  downloadCsv(csvFilename("audit", ...scope), csv);
}

let searchTimer: ReturnType<typeof setTimeout> | undefined;

/** Typing filters the list directly — debounced so it is one request, not one per key. */
watch(
  () => auditStore.filters.query,
  () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => void auditStore.loadAuditLogs(), 250);
  },
);

watch(
  () => [auditStore.filters.entity, auditStore.filters.action, auditStore.filters.userName],
  () => {
    void auditStore.loadAuditLogs();
  },
);

function clearFilters() {
  auditStore.resetFilters();
  void auditStore.loadAuditLogs();
}

async function refresh() {
  await Promise.all([auditStore.loadAuditLogs(), auditStore.loadAllEntries()]);
}

onMounted(refresh);
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      title="Audit"
      description="Review audit-friendly log entries with filters and record drill-down."
    >
      <template #actions>
        <BaseButton label="Refresh" severity="secondary" outlined :loading="auditStore.loading" @click="refresh" />
        <BaseButton :disabled="auditStore.items.length === 0" @click="exportCsv">
          <PhDownloadSimple weight="bold" />
          Export CSV
        </BaseButton>
      </template>
    </BasePageHeader>

    <BaseErrorState
      v-if="auditStore.errorMessage"
      :message="auditStore.errorMessage"
      @retry="refresh"
    />

    <section class="metric-grid">
      <!--
        These describe the current view, and "Total records" gives it something
        to be a fraction of. The fourth card used to count whether a row was
        selected, which told a reader nothing they could not see.
      -->
      <BaseStatsCard label="Entries" :value="String(auditStore.items.length)" caption="Records in the current view" />
      <BaseStatsCard label="Total records" :value="String(auditStore.allEntries.length)" caption="The whole audit trail" />
      <BaseStatsCard label="Entities" :value="String(auditStore.entityCount)" caption="Unique entities in the current view" />
      <BaseStatsCard label="Users" :value="String(actorCount)" caption="Distinct actors in the current view" />
    </section>

    <BaseFilterPanel
      title="Search and filters"
      description="Filters apply as you type — no Apply step. The export follows whatever is shown."
    >
      <div class="filter-strip">
        <BaseSearchBar v-model="auditStore.filters.query" placeholder="Search audit logs" />
        <BaseSelect v-model="auditStore.filters.entity" :options="entityOptions" />
        <BaseSelect v-model="auditStore.filters.action" :options="actionOptions" />
        <BaseSelect v-model="auditStore.filters.userName" :options="userOptions" />
        <BaseButton label="Clear filters" severity="secondary" outlined :disabled="!hasActiveFilters" @click="clearFilters" />
      </div>
    </BaseFilterPanel>

    <BaseLoading v-if="auditStore.loading" />

    <BaseSection v-else title="Audit table" description="Searchable and filterable security and operations logs.">
      <BaseCard>
        <BaseTable :value="auditStore.items" dataKey="id" paginator :rows="8" @rowClick="openLog">
          <template #empty>
            <BaseEmptyState
              title="No audit logs"
              :description="
                hasActiveFilters
                  ? 'No audit record matches the current filters.'
                  : 'Nothing has been audited yet. Corrections, device changes and member edits appear here.'
              "
              :action-label="hasActiveFilters ? 'Clear filters' : undefined"
              @action="clearFilters"
            />
          </template>

          <BaseTableColumn field="timestamp" header="Timestamp" sortable>
            <template #body="{ data }">{{ formatTimestamp((data as AuditLogEntry).timestamp) }}</template>
          </BaseTableColumn>
          <BaseTableColumn field="userName" header="User" sortable />
          <BaseTableColumn field="action" header="Action" sortable />
          <BaseTableColumn field="entity" header="Entity" sortable />
          <BaseTableColumn field="description" header="Description" />
          <BaseTableColumn field="ipAddress" header="IP" />
          <BaseTableColumn field="deviceName" header="Device" sortable />
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
