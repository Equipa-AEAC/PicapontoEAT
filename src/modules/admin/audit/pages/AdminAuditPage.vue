<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { PhDownloadSimple } from "@phosphor-icons/vue";

import { BaseButton, BaseCard, BaseEmptyState,
  BaseErrorState, BaseFilterPanel, BaseLoading, BasePageHeader, BaseSection, BaseSearchBar, BaseSelect, BaseStatusPill, BaseStatsCard, BaseTable, BaseTableColumn } from "../../../../shared/components/base";
import { useAuditStore } from "../../../../shared/stores";
import type { AuditLogEntry } from "../../../../types/audit";
import { csvFilename, downloadCsv, toCsv } from "../../../../shared/utils/csv";
import { formatTimestamp } from "../../../../shared/utils/date";
import { t } from "../../../../i18n";
import { auditActionLabel, auditEntityLabel } from "../../../../i18n/vocabulary";

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
function optionsFrom(
  read: (entry: AuditLogEntry) => string,
  allLabel: string,
  name: (value: string) => string = (value) => value,
) {
  return [
    { label: allLabel, value: "all" },
    ...Array.from(new Set(auditStore.allEntries.map(read)))
      .sort()
      .map((value) => ({ label: name(value), value })),
  ];
}

const entityOptions = computed(() =>
  optionsFrom((entry) => entry.entity, t("admin.audit.allEntities"), auditEntityLabel),
);
const actionOptions = computed(() =>
  optionsFrom((entry) => entry.action, t("admin.audit.allActions"), auditActionLabel),
);
const userOptions = computed(() => optionsFrom((entry) => entry.userName, t("admin.audit.allUsers")));

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
      :title="$t('admin.audit.title')"
      :description="$t('admin.audit.description')"
    >
      <template #actions>
        <BaseButton :label="$t('common.actions.refresh')" severity="secondary" outlined :loading="auditStore.loading" @click="refresh" />
        <BaseButton :disabled="auditStore.items.length === 0" @click="exportCsv">
          <PhDownloadSimple weight="bold" />
          {{ $t("common.actions.exportCsv") }}
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
      <BaseStatsCard :label="$t('admin.audit.metricEntries')" :value="String(auditStore.items.length)" :caption="$t('admin.audit.metricEntriesCaption')" />
      <BaseStatsCard :label="$t('admin.audit.metricTotal')" :value="String(auditStore.allEntries.length)" :caption="$t('admin.audit.metricTotalCaption')" />
      <BaseStatsCard :label="$t('admin.audit.metricEntities')" :value="String(auditStore.entityCount)" :caption="$t('admin.audit.metricEntitiesCaption')" />
      <BaseStatsCard :label="$t('admin.audit.metricUsers')" :value="String(actorCount)" :caption="$t('admin.audit.metricUsersCaption')" />
    </section>

    <BaseFilterPanel
      :title="$t('admin.audit.filtersTitle')"
      :description="$t('admin.audit.filtersDescription')"
    >
      <div class="filter-strip">
        <BaseSearchBar v-model="auditStore.filters.query" :placeholder="$t('admin.audit.search')" />
        <BaseSelect v-model="auditStore.filters.entity" :options="entityOptions" />
        <BaseSelect v-model="auditStore.filters.action" :options="actionOptions" />
        <BaseSelect v-model="auditStore.filters.userName" :options="userOptions" />
        <BaseButton :label="$t('common.actions.clearFilters')" severity="secondary" outlined :disabled="!hasActiveFilters" @click="clearFilters" />
      </div>
    </BaseFilterPanel>

    <BaseLoading v-if="auditStore.loading" />

    <BaseSection v-else :title="$t('admin.audit.tableTitle')" :description="$t('admin.audit.tableDescription')">
      <BaseCard>
        <BaseTable :value="auditStore.items" dataKey="id" paginator :rows="8" @rowClick="openLog">
          <template #empty>
            <BaseEmptyState
              :title="$t('admin.audit.emptyTitle')"
              :description="
                hasActiveFilters
                  ? $t('admin.audit.emptyFiltered')
                  : $t('admin.audit.emptyNone')
              "
              :action-label="hasActiveFilters ? $t('common.actions.clearFilters') : undefined"
              @action="clearFilters"
            />
          </template>

          <BaseTableColumn field="timestamp" :header="$t('admin.audit.colTimestamp')" sortable>
            <template #body="{ data }">{{ formatTimestamp((data as AuditLogEntry).timestamp) }}</template>
          </BaseTableColumn>
          <BaseTableColumn field="userName" :header="$t('admin.audit.colUser')" sortable />
          <BaseTableColumn field="action" :header="$t('admin.audit.colAction')" sortable>
            <template #body="{ data }">{{ auditActionLabel((data as AuditLogEntry).action) }}</template>
          </BaseTableColumn>
          <BaseTableColumn field="entity" :header="$t('admin.audit.colEntity')" sortable>
            <template #body="{ data }">{{ auditEntityLabel((data as AuditLogEntry).entity) }}</template>
          </BaseTableColumn>
          <BaseTableColumn field="description" :header="$t('admin.audit.colDescription')" />
          <BaseTableColumn field="ipAddress" header="IP" />
          <BaseTableColumn field="deviceName" :header="$t('admin.audit.colDevice')" sortable />
        </BaseTable>
      </BaseCard>

      <BaseCard v-if="selectedLog" :title="$t('admin.audit.detailsTitle')" :description="$t('admin.audit.detailsDescription')">
        <div class="module-summary">
          <BaseStatusPill :label="auditActionLabel(selectedLog.action)" tone="info" />
          <p><strong>{{ $t("admin.audit.userLabel") }}</strong> {{ selectedLog.userName }}</p>
          <p><strong>{{ $t("admin.audit.entityLabel") }}</strong> {{ auditEntityLabel(selectedLog.entity) }}</p>
          <p><strong>{{ $t("admin.audit.descriptionLabel") }}</strong> {{ selectedLog.description }}</p>
          <p><strong>{{ $t("admin.audit.ipLabel") }}</strong> {{ selectedLog.ipAddress }}</p>
          <p><strong>{{ $t("admin.audit.deviceLabel") }}</strong> {{ selectedLog.deviceName }}</p>
        </div>
      </BaseCard>
    </BaseSection>
  </section>
</template>
