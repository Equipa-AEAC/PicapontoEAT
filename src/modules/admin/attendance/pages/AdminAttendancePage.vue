<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  PhArrowRight,
  PhCheckCircle,
  PhClockCounterClockwise,
  PhDownloadSimple,
  PhEye,
  PhFingerprint,
  PhPencilSimple,
  PhTimer,
  PhTrash,
  PhUsersThree,
  PhWarningCircle,
  PhXCircle,
} from "@phosphor-icons/vue";

import BaseButton from "../../../../components/base/BaseButton.vue";
import BaseCard from "../../../../components/base/BaseCard.vue";
import BaseConfirmDialog from "../../../../components/base/BaseConfirmDialog.vue";
import BaseDatePicker from "../../../../components/base/BaseDatePicker.vue";
import BaseDialog from "../../../../components/base/BaseDialog.vue";
import BaseEmptyState from "../../../../components/base/BaseEmptyState.vue";
import BaseFilterPanel from "../../../../components/base/BaseFilterPanel.vue";
import BaseFormDialog from "../../../../components/base/BaseFormDialog.vue";
import BaseMetricCard from "../../../../components/base/BaseMetricCard.vue";
import BasePageHeader from "../../../../components/base/BasePageHeader.vue";
import BaseSearchBar from "../../../../components/base/BaseSearchBar.vue";
import BaseSection from "../../../../components/base/BaseSection.vue";
import BaseSelect from "../../../../components/base/BaseSelect.vue";
import BaseStatusPill from "../../../../components/base/BaseStatusPill.vue";
import BaseTable from "../../../../components/base/BaseTable.vue";
import TableColumn from "../../../../components/base/TableColumn.vue";
import BaseTextInput from "../../../../components/base/BaseTextInput.vue";
import { useAttendanceStore } from "../../../../stores/attendance";
import { useDevicesStore } from "../../../../stores/devices";
import { useMembersStore } from "../../../../stores/members";
import type { AttendanceCorrectionFormValues, AttendanceCorrectionReason, AttendanceStatus } from "../../../../types/attendance";
import CorrectionReviewQueue from "../../../../components/attendance/CorrectionReviewQueue.vue";
import { useAttendanceCorrectionsStore } from "../../../../shared/stores";
import { csvFilename, downloadCsv, toCsv } from "../../../../shared/utils/csv";
import { classifyAttendanceDate } from "../../../../services/participation.service";
import type { ParticipationPeriod } from "../../../../types/participation";
import { t } from "../../../../i18n";
import {
  attendanceCorrectionReasonLabel,
  attendanceStatusLabel,
  attendanceStatusOptions,
  participationCreditLabel,
  participationKindLabel,
} from "../../../../i18n/vocabulary";

const router = useRouter();
const attendanceStore = useAttendanceStore();
const correctionsStore = useAttendanceCorrectionsStore();
const membersStore = useMembersStore();
const devicesStore = useDevicesStore();

const correctionVisible = ref(false);
const correctingId = ref<string | null>(null);
const detailsVisible = ref(false);
const deleteConfirmVisible = ref(false);
const deletingId = ref<string | null>(null);

const correctionForm = reactive<AttendanceCorrectionFormValues>({
  reason: "manual-entry",
  entryTime: "",
  exitTime: "",
  administratorNotes: "",
});

const correctionReasonOptions: Array<{ label: string; value: AttendanceCorrectionReason }> = [
  { label: attendanceCorrectionReasonLabel("forgot-to-check-out"), value: "forgot-to-check-out" },
  { label: attendanceCorrectionReasonLabel("wrong-device"), value: "wrong-device" },
  { label: attendanceCorrectionReasonLabel("duplicate-scan"), value: "duplicate-scan" },
  { label: attendanceCorrectionReasonLabel("manual-entry"), value: "manual-entry" },
];

/**
 * The filter controls bind straight to the store, the way the members and
 * reports pages do. There is no local copy of the filter state any more: a
 * second copy only stays right until the two drift.
 *
 * `dateRange` is a tuple in the store and two inputs on screen, so each end gets
 * a computed accessor rather than its own ref. An empty input means "no bound",
 * which is null, not `""`.
 */
const fromDate = computed({
  get: () => attendanceStore.filters.dateRange[0] ?? "",
  set: (value: string) => {
    attendanceStore.filters.dateRange = [value || null, attendanceStore.filters.dateRange[1]];
  },
});

const toDate = computed({
  get: () => attendanceStore.filters.dateRange[1] ?? "",
  set: (value: string) => {
    attendanceStore.filters.dateRange = [attendanceStore.filters.dateRange[0], value || null];
  },
});

const selectedRecord = computed(() => attendanceStore.selectedAttendance);
const deletingRecord = computed(() => attendanceStore.items.find((item) => item.id === deletingId.value) ?? null);

const courseOptions = computed(() => {
  const values = new Set(membersStore.allMembers.map((member) => member.course).filter((value) => value.trim().length > 0));
  return [{ label: t("common.filters.allCourses"), value: "all" }, ...Array.from(values).map((value) => ({ label: value, value }))];
});

const statusOptions = computed(() => [
  { label: t("common.filters.allStatuses"), value: "all" },
  ...attendanceStatusOptions(),
]);

const studentOptions = computed(() => [
  { label: t("common.filters.allMembers"), value: "all" },
  ...membersStore.allMembers.map((student) => ({ label: student.fullName, value: student.id })),
]);
const deviceOptions = computed(() => [
  { label: t("common.filters.allDevices"), value: "all" },
  ...devicesStore.items.map((device) => ({ label: device.name, value: device.id })),
]);

const totalRecords = computed(() => attendanceStore.items.length);
const correctionRecords = computed(() => attendanceStore.correctionCount);
const presentRecords = computed(() => attendanceStore.items.filter((item) => item.status === "present").length);
const hoursRecorded = computed(() => attendanceStore.items.reduce((total, item) => total + (item.hours ?? 0), 0));

const hasActiveFilters = computed(
  () =>
    attendanceStore.filters.query.trim().length > 0 ||
    attendanceStore.filters.course !== "all" ||
    attendanceStore.filters.status !== "all" ||
    attendanceStore.filters.studentId !== "all" ||
    attendanceStore.filters.deviceId !== "all" ||
    fromDate.value !== "" ||
    toDate.value !== "",
);

/** A backwards range matches nothing; say so rather than render an empty table. */
const rangeIsBackwards = computed(() => Boolean(fromDate.value && toDate.value && toDate.value < fromDate.value));

const statusMeta: Record<AttendanceStatus, { tone: "success" | "warning" | "danger" | "info"; icon: typeof PhCheckCircle }> = {
  present: { tone: "success", icon: PhCheckCircle },
  late: { tone: "warning", icon: PhTimer },
  missing: { tone: "danger", icon: PhXCircle },
  corrected: { tone: "warning", icon: PhWarningCircle },
};

/**
 * Export what the table currently shows.
 *
 * Built from the loaded rows rather than a fresh unfiltered query, so the file
 * always matches the view it was taken from.
 */
function exportCsv() {
  const csv = toCsv(attendanceStore.items, [
    { header: "Member", value: (row) => row.studentName },
    { header: "Course", value: (row) => row.course },
    { header: "Class", value: (row) => row.className },
    { header: "Date", value: (row) => row.date },
    { header: "Entry", value: (row) => row.entry ?? "" },
    { header: "Exit", value: (row) => row.exit ?? "" },
    { header: "Hours", value: (row) => row.hours ?? 0 },
    { header: "Device", value: (row) => row.deviceName },
    { header: "Status", value: (row) => row.status },
    { header: "Corrections", value: (row) => row.corrections },
    { header: "Notes", value: (row) => row.notes },
  ]);

  downloadCsv(csvFilename("attendance", fromDate.value || null, toDate.value || null), csv);
}

/**
 * A backwards range can only ever return nothing, so the request is skipped and
 * the table keeps showing the last real result while the banner explains why.
 * The same guard is on the member history page.
 */
function reload() {
  if (rangeIsBackwards.value) {
    return;
  }

  void attendanceStore.loadAttendance();
}

let searchTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Typing and date entry are debounced; the selects are not.
 *
 * A `type="date"` input emits a value on every keystroke of the year, so an
 * undebounced watch would fire a request for `0002-01-01` on the way to 2026.
 */
watch([() => attendanceStore.filters.query, fromDate, toDate], () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(reload, 250);
});

watch(
  () => [
    attendanceStore.filters.course,
    attendanceStore.filters.status,
    attendanceStore.filters.studentId,
    attendanceStore.filters.deviceId,
  ],
  reload,
);

function clearFilters() {
  attendanceStore.filters.query = "";
  attendanceStore.filters.course = "all";
  attendanceStore.filters.status = "all";
  attendanceStore.filters.studentId = "all";
  attendanceStore.filters.deviceId = "all";
  attendanceStore.filters.dateRange = [null, null];
  reload();
}

/**
 * Which participation the open record counted under.
 *
 * Resolved for the one record being looked at rather than added as a column on
 * every row: the category is the same for long stretches of the table, so a
 * column would repeat it hundreds of times and still not explain the transition.
 * The member's own participation timeline is where the history is read.
 */
const recordPeriod = ref<ParticipationPeriod | null>(null);

async function openDetails(attendanceId: string) {
  await attendanceStore.loadAttendanceDetails(attendanceId);

  const record = attendanceStore.selectedAttendance;
  recordPeriod.value = record ? await classifyAttendanceDate(record.studentId, record.date) : null;

  detailsVisible.value = true;
}

/** Attendance → member, the same target the task and project tables use. */
function openMember(memberId: string) {
  void router.push({ name: "member-details", params: { memberId } });
}

function closeDetails() {
  detailsVisible.value = false;
  attendanceStore.selectedAttendance = null;
  recordPeriod.value = null;
}

function requestDelete(attendanceId: string) {
  deletingId.value = attendanceId;
  deleteConfirmVisible.value = true;
}

async function confirmDelete() {
  if (!deletingId.value) {
    return;
  }

  const removedId = deletingId.value;
  await attendanceStore.removeAttendance(removedId);

  if (attendanceStore.selectedAttendance?.id === removedId) {
    attendanceStore.selectedAttendance = null;
    detailsVisible.value = false;
  }

  deleteConfirmVisible.value = false;
  deletingId.value = null;
}

function openCorrection(record: { id: string; entry: string | null; exit: string | null; notes: string }) {
  correctingId.value = record.id;
  correctionForm.reason = "manual-entry";
  correctionForm.entryTime = record.entry ?? "";
  correctionForm.exitTime = record.exit ?? "";
  correctionForm.administratorNotes = record.notes ?? "";
  correctionVisible.value = true;
}

async function submitCorrection() {
  if (!correctingId.value) return;
  await attendanceStore.correctAttendance(correctingId.value, { ...correctionForm });
  correctionVisible.value = false;
  correctingId.value = null;
}

onMounted(async () => {
  await Promise.all([membersStore.loadAllMembers(), devicesStore.loadDevices(), correctionsStore.loadQueue()]);
  await attendanceStore.loadAttendance();
});
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      :title="$t('admin.attendance.title')"
      :description="$t('admin.attendance.description')"
    >
      <template #actions>
        <BaseButton :label="$t('admin.attendance.reload')" severity="secondary" outlined :loading="attendanceStore.loading" @click="attendanceStore.loadAttendance()" />
        <BaseButton :disabled="attendanceStore.items.length === 0" @click="exportCsv">
          <PhDownloadSimple weight="bold" />
          {{ $t("common.actions.exportCsv") }}
        </BaseButton>
      </template>
    </BasePageHeader>

    <section class="metric-grid">
      <BaseMetricCard :label="$t('admin.attendance.metricTotal')" :value="String(totalRecords)" :caption="$t('admin.attendance.metricTotalCaption')" :icon="PhFingerprint" />
      <BaseMetricCard :label="$t('admin.attendance.metricPresent')" :value="String(presentRecords)" :caption="$t('admin.attendance.metricPresentCaption')" :icon="PhUsersThree" />
      <BaseMetricCard :label="$t('admin.attendance.metricCorrections')" :value="String(correctionRecords)" :caption="$t('admin.attendance.metricCorrectionsCaption')" :icon="PhClockCounterClockwise" :trend-label="
          correctionRecords > 0 ? $t('admin.attendance.needsReview') : $t('admin.attendance.allClear')
        " :trend-tone="correctionRecords > 0 ? 'negative' : 'positive'" />
      <BaseMetricCard :label="$t('admin.attendance.metricHours')" :value="String(Math.round(hoursRecorded))" :caption="$t('admin.attendance.metricHoursCaption')" :icon="PhTimer" />
    </section>

    <BaseFilterPanel
      :title="$t('admin.attendance.filtersTitle')"
      :description="$t('admin.attendance.filtersDescription')"
    >
      <div class="filter-strip">
        <BaseSearchBar v-model="attendanceStore.filters.query" :placeholder="$t('admin.attendance.search')" />
        <BaseSelect v-model="attendanceStore.filters.course" :options="courseOptions" />
        <BaseSelect v-model="attendanceStore.filters.status" :options="statusOptions" />
        <BaseSelect v-model="attendanceStore.filters.studentId" :options="studentOptions" />
        <BaseSelect v-model="attendanceStore.filters.deviceId" :options="deviceOptions" />
        <label class="date-field">
          <span class="type-label">{{ $t("common.time.from") }}</span>
          <BaseDatePicker v-model="fromDate" />
        </label>
        <label class="date-field">
          <span class="type-label">{{ $t("common.time.to") }}</span>
          <BaseDatePicker v-model="toDate" />
        </label>
        <BaseButton :label="$t('common.actions.clearFilters')" severity="secondary" outlined :disabled="!hasActiveFilters" @click="clearFilters" />
      </div>

      <p v-if="rangeIsBackwards" class="form-error-banner">
        {{ $t("admin.attendance.invertedRange") }}
      </p>
    </BaseFilterPanel>

    <p v-if="attendanceStore.errorMessage" class="form-error-banner">{{ attendanceStore.errorMessage }}</p>

    <!--
      The queue sits above the log on purpose: a day a member has reported is
      more urgent than the log it came from, and reviewing it needs the record
      right there, which is why this is not a separate page.
    -->
    <CorrectionReviewQueue @resolved="attendanceStore.loadAttendance()" />

    <BaseSection :title="$t('admin.attendance.tableTitle')" :description="$t('admin.attendance.tableDescription')">
      <BaseCard>
        <BaseTable
          :value="attendanceStore.items"
          dataKey="id"
          :loading="attendanceStore.loading"
          paginator
          :rows="10"
          @rowClick="openDetails($event.data.id)"
        >
          <template #empty>
            <BaseEmptyState
              :title="$t('admin.attendance.emptyTitle')"
              :description="
                hasActiveFilters
                  ? $t('admin.attendance.emptyFiltered')
                  : $t('admin.attendance.emptyNone')
              "
              :action-label="hasActiveFilters ? $t('common.actions.clearFilters') : undefined"
              @action="clearFilters"
            />
          </template>

          <TableColumn :header="$t('admin.attendance.colMember')" field="studentName" sortable>
            <template #body="slotProps">
              <div class="cell-stack">
                <!--
                  Attendance → member. The row itself opens the record, so the
                  name has to stop the event from reaching it.
                -->
                <button
                  v-if="slotProps.data.studentId"
                  type="button"
                  class="member-link"
                  @click.stop="openMember(slotProps.data.studentId)"
                >
                  {{ slotProps.data.studentName }}
                </button>
                <strong v-else>{{ slotProps.data.studentName }}</strong>
                <small>{{ slotProps.data.course }} · {{ slotProps.data.className }}</small>
              </div>
            </template>
          </TableColumn>
          <TableColumn field="date" :header="$t('common.time.date')" sortable />
          <TableColumn :header="$t('admin.attendance.colTimes')" width="150px">
            <template #body="slotProps">
              <span class="attendance-span">
                <span>{{ slotProps.data.entry ?? '—' }}</span>
                <PhArrowRight weight="bold" />
                <span>{{ slotProps.data.exit ?? '—' }}</span>
              </span>
            </template>
          </TableColumn>
          <TableColumn :header="$t('common.fields.hours')" field="hours" sortable width="90px">
            <template #body="slotProps">
              <span>{{ slotProps.data.hours ?? 0 }}h</span>
            </template>
          </TableColumn>
          <TableColumn field="deviceName" :header="$t('admin.attendance.colDevice')" />
          <TableColumn :header="$t('common.fields.status')" field="status" sortable width="140px">
            <template #body="slotProps">
              <span class="status-cell">
                <component :is="statusMeta[slotProps.data.status as AttendanceStatus].icon" weight="fill" :class="`status-cell__icon status-cell__icon--${statusMeta[slotProps.data.status as AttendanceStatus].tone}`" />
                <BaseStatusPill
                  :label="attendanceStatusLabel(slotProps.data.status as AttendanceStatus)"
                  :tone="statusMeta[slotProps.data.status as AttendanceStatus].tone"
                />
              </span>
            </template>
          </TableColumn>
          <TableColumn field="corrections" :header="$t('admin.attendance.colCorrections')" sortable width="80px" />
          <TableColumn :header="$t('common.fields.actions')" width="130px">
            <template #body="slotProps">
              <div class="icon-actions" @click.stop>
                <button type="button" class="icon-actions__button" :title="$t('admin.attendance.viewRecord')" :aria-label="$t('admin.attendance.viewRecord')" @click="openDetails(slotProps.data.id)">
                  <PhEye weight="bold" />
                </button>
                <button type="button" class="icon-actions__button" :title="$t('admin.attendance.correctRecord')" :aria-label="$t('admin.attendance.correctRecord')" @click="openCorrection(slotProps.data)">
                  <PhPencilSimple weight="bold" />
                </button>
                <button type="button" class="icon-actions__button icon-actions__button--danger" :title="$t('admin.attendance.deleteRecord')" :aria-label="$t('admin.attendance.deleteRecord')" @click="requestDelete(slotProps.data.id)">
                  <PhTrash weight="bold" />
                </button>
              </div>
            </template>
          </TableColumn>
        </BaseTable>
      </BaseCard>
    </BaseSection>

    <BaseDialog
      :visible="detailsVisible && Boolean(selectedRecord)"
      :header="$t('admin.attendance.recordHeader')"
      @update:visible="closeDetails"
    >
      <div v-if="selectedRecord" class="module-summary">
        <BaseStatusPill
          :label="attendanceStatusLabel(selectedRecord.status)"
          :tone="statusMeta[selectedRecord.status].tone"
        />
        <p><strong>{{ $t("admin.attendance.memberLabel") }}</strong> {{ selectedRecord.studentName }}</p>
        <p><strong>{{ $t("admin.attendance.courseLabel") }}</strong> {{ selectedRecord.course }}</p>
        <p><strong>{{ $t("admin.attendance.classLabel") }}</strong> {{ selectedRecord.className }}</p>
        <p><strong>{{ $t("admin.attendance.dateLabel") }}</strong> {{ selectedRecord.date }}</p>
        <p>
          <strong>{{ $t("admin.attendance.entryLabel") }}</strong>
          {{ selectedRecord.entry ?? $t("admin.attendance.notAvailable") }} •
          <strong>{{ $t("admin.attendance.exitLabel") }}</strong>
          {{ selectedRecord.exit ?? $t("admin.attendance.notAvailable") }}
        </p>
        <p><strong>{{ $t("admin.attendance.hoursLabel") }}</strong> {{ selectedRecord.hours ?? 0 }}</p>
        <!--
          Says which bucket this day's hours landed in and why, resolved through
          the same rule that produces every total.
        -->
        <p v-if="recordPeriod">
          <strong>{{ $t("admin.attendance.countsAs") }}</strong> {{ participationKindLabel(recordPeriod.kind) }}
          <span class="type-meta">
            ({{ recordPeriod.startDate }} → {{ recordPeriod.endDate ?? $t("admin.attendance.present") }}) ·
            {{ participationCreditLabel(recordPeriod.kind) }}
          </span>
        </p>
        <p v-else>
          <strong>{{ $t("admin.attendance.countsAs") }}</strong> {{ $t("admin.attendance.unclassified") }}
          <span class="type-meta">
            {{ $t("admin.attendance.unclassifiedHint", { date: selectedRecord.date }) }}
          </span>
        </p>
        <p><strong>{{ $t("admin.attendance.deviceLabel") }}</strong> {{ selectedRecord.deviceName }}</p>
        <p>
          <strong>{{ $t("admin.attendance.correctionsLabel") }}</strong> {{ selectedRecord.corrections }}
        </p>
        <p>
          <strong>{{ $t('admin.attendance.notesLabel') }}</strong>
          {{ selectedRecord.notes || $t('admin.attendance.none') }}
        </p>
        <p><strong>{{ $t("admin.attendance.createdBy") }}</strong> {{ selectedRecord.createdBy }}</p>
        <p>
          <strong>{{ $t("admin.attendance.updatedLabel") }}</strong>
          {{ selectedRecord.updatedAt ?? $t("admin.attendance.notUpdated") }}
          <template v-if="selectedRecord.updatedBy">
            {{ $t("admin.attendance.updatedByName", { name: selectedRecord.updatedBy }) }}
          </template>
        </p>
      </div>

      <template #footer>
        <div class="inline-actions inline-actions--end">
          <BaseButton :label="$t('common.actions.close')" severity="secondary" text @click="closeDetails" />
          <BaseButton v-if="selectedRecord" :label="$t('admin.attendance.correctRecord')" @click="openCorrection(selectedRecord)" />
        </div>
      </template>
    </BaseDialog>

    <BaseFormDialog
      :visible="correctionVisible"
      :title="$t('admin.attendance.correctTitle')"
      :subtitle="$t('admin.attendance.correctSubtitle')"
      :confirm-label="$t('admin.attendance.saveCorrection')"
      :cancel-label="$t('common.actions.cancel')"
      :loading="attendanceStore.saving"
      @update:visible="correctionVisible = $event"
      @confirm="submitCorrection"
      @cancel="correctionVisible = false"
    >
      <div class="settings-grid">
        <label>
          <span>{{ $t("admin.attendance.reasonLabel") }}</span>
          <BaseSelect v-model="correctionForm.reason" :options="correctionReasonOptions" />
        </label>
        <label>
          <span>{{ $t("admin.attendance.entryTime") }}</span>
          <BaseTextInput v-model="correctionForm.entryTime" placeholder="HH:mm" />
        </label>
        <label>
          <span>{{ $t("admin.attendance.exitTime") }}</span>
          <BaseTextInput v-model="correctionForm.exitTime" placeholder="HH:mm" />
        </label>
        <label class="settings-grid__wide">
          <span>{{ $t("admin.attendance.adminNotes") }}</span>
          <BaseTextInput v-model="correctionForm.administratorNotes" :placeholder="$t('admin.attendance.notePlaceholder')" />
        </label>
      </div>
    </BaseFormDialog>

    <BaseConfirmDialog
      :visible="deleteConfirmVisible"
      :title="$t('admin.attendance.deleteTitle')"
      :message="
        deletingRecord
          ? $t('admin.attendance.deleteMessageFor', {
              date: deletingRecord.date,
              name: deletingRecord.studentName,
            })
          : $t('admin.attendance.deleteQuestion')
      "
      :loading="attendanceStore.saving"
      @update:visible="deleteConfirmVisible = $event"
      @confirm="confirmDelete"
      @cancel="deleteConfirmVisible = false"
    />
  </section>
</template>

<style scoped>
/* Matches the task table's assignee link: a name that reads as text until you reach it. */
.member-link {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--foreground);
  font: inherit;
  font-weight: var(--weight-semibold);
  text-align: left;
  cursor: pointer;
}

.member-link:hover {
  color: var(--primary);
  text-decoration: underline;
}
</style>
