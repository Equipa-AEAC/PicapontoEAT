<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { PhDownloadSimple } from "@phosphor-icons/vue";

import BaseButton from "../../../../components/base/BaseButton.vue";
import BaseCard from "../../../../components/base/BaseCard.vue";
import BaseDatePicker from "../../../../components/base/BaseDatePicker.vue";
import BaseEmptyState from "../../../../components/base/BaseEmptyState.vue";
import BaseErrorState from "../../../../components/base/BaseErrorState.vue";
import BaseFilterPanel from "../../../../components/base/BaseFilterPanel.vue";
import BaseLoading from "../../../../components/base/BaseLoading.vue";
import BasePageHeader from "../../../../components/base/BasePageHeader.vue";
import BaseSection from "../../../../components/base/BaseSection.vue";
import BaseSelect from "../../../../components/base/BaseSelect.vue";
import BaseStatsCard from "../../../../components/base/BaseStatsCard.vue";
import BaseStatusPill from "../../../../components/base/BaseStatusPill.vue";
import BaseTable from "../../../../components/base/BaseTable.vue";
import TableColumn from "../../../../components/base/TableColumn.vue";
import { useMembersStore } from "../../../../stores/members";
import type { MemberAttendanceHistoryItem } from "../../../../shared/types";
import { csvFilename, downloadCsv, toCsv } from "../../../../shared/utils/csv";
import { formatIsoDate } from "../../../../shared/utils/date";
import { t } from "../../../../i18n";
import {
  attendanceStatusLabel,
  attendanceStatusOptions,
} from "../../../../i18n/vocabulary";

/**
 * One member's attendance, in full.
 *
 * This is the page somebody opens to settle a disagreement — "was I here on the
 * 18th?" — so it has to answer a question about a specific period and produce
 * something that can be handed over. It was previously a bare table of every
 * record with no way to narrow it and no way to get it out.
 *
 * The rows are a projection of the one attendance collection, so a correction
 * applied on the attendance page is visible here without a second write.
 */
const route = useRoute();
const router = useRouter();
const membersStore = useMembersStore();

const memberId = computed(() => String(route.params.memberId ?? ""));

const statusFilter = ref<MemberAttendanceHistoryItem["status"] | "all">("all");
const fromDate = ref("");
const toDate = ref("");

const statusOptions = computed(() => [
  { label: t("common.filters.allStatuses"), value: "all" },
  ...attendanceStatusOptions().filter((option) => option.value !== "late"),
]);

const hasFilters = computed(
  () => statusFilter.value !== "all" || fromDate.value !== "" || toDate.value !== "",
);

/** A range entered backwards returns nothing; say so rather than look empty. */
const rangeIsBackwards = computed(
  () => Boolean(fromDate.value && toDate.value && toDate.value < fromDate.value),
);

const rows = computed(() => membersStore.attendanceHistory);

const totalHours = computed(
  () => Math.round(rows.value.reduce((total, row) => total + row.hours, 0) * 10) / 10,
);

const missingCount = computed(() => rows.value.filter((row) => row.status === "missing").length);
const correctedCount = computed(() => rows.value.filter((row) => row.status === "corrected").length);

function statusTone(status: MemberAttendanceHistoryItem["status"]) {
  if (status === "present") return "success";
  if (status === "corrected") return "info";
  return "danger";
}

function load() {
  if (!memberId.value || rangeIsBackwards.value) {
    return;
  }

  return membersStore.loadMemberAttendance(memberId.value, {
    status: statusFilter.value,
    from: fromDate.value || null,
    to: toDate.value || null,
  });
}

function clearFilters() {
  statusFilter.value = "all";
  fromDate.value = "";
  toDate.value = "";
}

/**
 * Export exactly what is on screen.
 *
 * Deliberately built from `rows`, not from a fresh unfiltered query: a file that
 * disagrees with the table it came from is worse than no export at all.
 */
function exportCsv() {
  const name = membersStore.selectedMember?.fullName ?? memberId.value;

  const csv = toCsv(rows.value, [
    { header: "Member", value: () => name },
    { header: "Date", value: (row) => row.date },
    { header: "Entry", value: (row) => row.entry },
    { header: "Exit", value: (row) => row.exit },
    { header: "Hours", value: (row) => row.hours },
    { header: "Device", value: (row) => row.deviceName },
    { header: "Status", value: (row) => row.status },
  ]);

  downloadCsv(csvFilename("attendance", name, fromDate.value || null, toDate.value || null), csv);
}

watch([statusFilter, fromDate, toDate], () => void load());

onMounted(async () => {
  if (memberId.value) {
    await Promise.all([membersStore.loadMember(memberId.value), load()]);
  }
});
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      :title="membersStore.selectedMember?.fullName ?? $t('admin.memberAttendance.back')"
      :description="$t('admin.memberAttendance.description')"
    >
      <template #actions>
        <BaseButton
          :label="$t('admin.memberAttendance.back')"
          severity="secondary"
          outlined
          @click="router.push({ name: 'member-details', params: { memberId } })"
        />
        <BaseButton :disabled="rows.length === 0" @click="exportCsv">
          <PhDownloadSimple weight="bold" />
          {{ $t("common.actions.exportCsv") }}
        </BaseButton>
      </template>
    </BasePageHeader>

    <BaseErrorState
      v-if="membersStore.errorMessage"
      :message="membersStore.errorMessage"
      @retry="load"
    />

    <section class="metric-grid">
      <BaseStatsCard :label="$t('admin.memberAttendance.metricDays')" :value="String(rows.length)" :caption="$t('admin.memberAttendance.metricDaysCaption')" />
      <BaseStatsCard :label="$t('common.fields.hours')" :value="`${totalHours}h`" :caption="$t('admin.memberAttendance.metricHoursCaption')" />
      <BaseStatsCard :label="$t('admin.memberAttendance.metricCorrected')" :value="String(correctedCount)" :caption="$t('admin.memberAttendance.metricCorrectedCaption')" />
      <BaseStatsCard :label="$t('admin.memberAttendance.metricMissing')" :value="String(missingCount)" :caption="$t('admin.memberAttendance.metricMissingCaption')" />
    </section>

    <BaseFilterPanel :title="$t('admin.memberAttendance.filtersTitle')" :description="$t('admin.memberAttendance.filtersDescription')">
      <div class="filter-strip">
        <label class="date-field">
          <span class="type-label">{{ $t("common.time.from") }}</span>
          <BaseDatePicker v-model="fromDate" />
        </label>
        <label class="date-field">
          <span class="type-label">{{ $t("common.time.to") }}</span>
          <BaseDatePicker v-model="toDate" />
        </label>
        <BaseSelect
          :model-value="statusFilter"
          :options="statusOptions"
          @update:model-value="statusFilter = $event as MemberAttendanceHistoryItem['status'] | 'all'"
        />
        <BaseButton :label="$t('common.actions.clearFilters')" severity="secondary" outlined :disabled="!hasFilters" @click="clearFilters" />
      </div>

      <p v-if="rangeIsBackwards" class="form-error-banner range-warning">
        {{ $t("admin.memberAttendance.invertedRange") }}
      </p>
    </BaseFilterPanel>

    <BaseLoading v-if="membersStore.loadingDetails && rows.length === 0" />

    <BaseSection v-else>
      <BaseCard>
        <BaseEmptyState
          v-if="rows.length === 0"
          :title="$t('admin.memberAttendance.emptyTitle')"
          :description="
            hasFilters
              ? $t('admin.memberAttendance.emptyFiltered')
              : $t('admin.memberAttendance.emptyNone')
          "
          :action-label="hasFilters ? $t('common.actions.clearFilters') : undefined"
          @action="clearFilters"
        />

        <BaseTable v-else :value="rows" dataKey="id" :rows="15" paginator>
          <TableColumn field="date" :header="$t('common.time.date')" sortable>
            <template #body="slotProps">{{ formatIsoDate(slotProps.data.date) }}</template>
          </TableColumn>
          <TableColumn field="entry" :header="$t('admin.memberAttendance.colEntry')" />
          <TableColumn field="exit" :header="$t('admin.memberAttendance.colExit')" />
          <TableColumn field="hours" :header="$t('common.fields.hours')" sortable>
            <template #body="slotProps">{{ slotProps.data.hours }}h</template>
          </TableColumn>
          <TableColumn field="deviceName" :header="$t('admin.memberAttendance.colDevice')" sortable />
          <TableColumn field="status" :header="$t('common.fields.status')" sortable>
            <template #body="slotProps">
              <BaseStatusPill
                :label="attendanceStatusLabel(slotProps.data.status)"
                :tone="statusTone(slotProps.data.status)"
              />
            </template>
          </TableColumn>
        </BaseTable>
      </BaseCard>
    </BaseSection>
  </section>
</template>

<style scoped>
.date-field {
  display: grid;
  gap: var(--space-1);
}

.range-warning {
  margin-top: var(--space-3);
}
</style>
