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
import { PARTICIPATION_KIND_CREDIT, PARTICIPATION_KIND_LABELS } from "../../../../types/participation";

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
  { label: "Forgot to check out", value: "forgot-to-check-out" },
  { label: "Wrong device", value: "wrong-device" },
  { label: "Duplicate scan", value: "duplicate-scan" },
  { label: "Manual entry", value: "manual-entry" },
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
  return [{ label: "All courses", value: "all" }, ...Array.from(values).map((value) => ({ label: value, value }))];
});

const statusOptions = [
  { label: "All statuses", value: "all" },
  { label: "Present", value: "present" },
  { label: "Late", value: "late" },
  { label: "Missing", value: "missing" },
  { label: "Corrected", value: "corrected" },
];

const studentOptions = computed(() => [
  { label: "All members", value: "all" },
  ...membersStore.allMembers.map((student) => ({ label: student.fullName, value: student.id })),
]);
const deviceOptions = computed(() => [
  { label: "All devices", value: "all" },
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
      title="Attendance"
      description="Review scan validation, duplicates, entry and exit records from a single module."
    >
      <template #actions>
        <BaseButton label="Reload" severity="secondary" outlined :loading="attendanceStore.loading" @click="attendanceStore.loadAttendance()" />
        <BaseButton :disabled="attendanceStore.items.length === 0" @click="exportCsv">
          <PhDownloadSimple weight="bold" />
          Export CSV
        </BaseButton>
      </template>
    </BasePageHeader>

    <section class="metric-grid">
      <BaseMetricCard label="Total records" :value="String(totalRecords)" caption="Attendance rows in the current view" :icon="PhFingerprint" />
      <BaseMetricCard label="Present" :value="String(presentRecords)" caption="Validated present records" :icon="PhUsersThree" />
      <BaseMetricCard label="Corrections" :value="String(correctionRecords)" caption="Records updated by administrators" :icon="PhClockCounterClockwise" :trend-label="correctionRecords > 0 ? 'Needs review' : 'All clear'" :trend-tone="correctionRecords > 0 ? 'negative' : 'positive'" />
      <BaseMetricCard label="Hours logged" :value="String(Math.round(hoursRecorded))" caption="Approved attendance hours" :icon="PhTimer" />
    </section>

    <BaseFilterPanel
      title="Search and filters"
      description="Filters apply as you type — no Apply step. The export follows whatever is shown."
    >
      <div class="filter-strip">
        <BaseSearchBar v-model="attendanceStore.filters.query" placeholder="Search member, class, device or date" />
        <BaseSelect v-model="attendanceStore.filters.course" :options="courseOptions" />
        <BaseSelect v-model="attendanceStore.filters.status" :options="statusOptions" />
        <BaseSelect v-model="attendanceStore.filters.studentId" :options="studentOptions" />
        <BaseSelect v-model="attendanceStore.filters.deviceId" :options="deviceOptions" />
        <label class="date-field">
          <span class="type-label">From</span>
          <BaseTextInput v-model="fromDate" type="date" />
        </label>
        <label class="date-field">
          <span class="type-label">To</span>
          <BaseTextInput v-model="toDate" type="date" />
        </label>
        <BaseButton label="Clear filters" severity="secondary" outlined :disabled="!hasActiveFilters" @click="clearFilters" />
      </div>

      <p v-if="rangeIsBackwards" class="form-error-banner">
        The “to” date is before the “from” date, so nothing can match. Swap them to see results.
      </p>
    </BaseFilterPanel>

    <p v-if="attendanceStore.errorMessage" class="form-error-banner">{{ attendanceStore.errorMessage }}</p>

    <!--
      The queue sits above the log on purpose: a day a member has reported is
      more urgent than the log it came from, and reviewing it needs the record
      right there, which is why this is not a separate page.
    -->
    <CorrectionReviewQueue @resolved="attendanceStore.loadAttendance()" />

    <BaseSection title="Attendance log" description="Click a row to open the full record. Corrections and deletions are audited.">
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
              title="No attendance records"
              :description="
                hasActiveFilters
                  ? 'No scan matches the current filters.'
                  : 'No attendance has been recorded yet.'
              "
              :action-label="hasActiveFilters ? 'Clear filters' : undefined"
              @action="clearFilters"
            />
          </template>

          <TableColumn header="Member" field="studentName" sortable>
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
          <TableColumn field="date" header="Date" sortable />
          <TableColumn header="Entry → Exit" width="150px">
            <template #body="slotProps">
              <span class="attendance-span">
                <span>{{ slotProps.data.entry ?? '—' }}</span>
                <PhArrowRight weight="bold" />
                <span>{{ slotProps.data.exit ?? '—' }}</span>
              </span>
            </template>
          </TableColumn>
          <TableColumn header="Hours" field="hours" sortable width="90px">
            <template #body="slotProps">
              <span>{{ slotProps.data.hours ?? 0 }}h</span>
            </template>
          </TableColumn>
          <TableColumn field="deviceName" header="Device" />
          <TableColumn header="Status" field="status" sortable width="140px">
            <template #body="slotProps">
              <span class="status-cell">
                <component :is="statusMeta[slotProps.data.status as AttendanceStatus].icon" weight="fill" :class="`status-cell__icon status-cell__icon--${statusMeta[slotProps.data.status as AttendanceStatus].tone}`" />
                <BaseStatusPill :label="slotProps.data.status" :tone="statusMeta[slotProps.data.status as AttendanceStatus].tone" />
              </span>
            </template>
          </TableColumn>
          <TableColumn field="corrections" header="Corr." sortable width="80px" />
          <TableColumn header="Actions" width="130px">
            <template #body="slotProps">
              <div class="icon-actions" @click.stop>
                <button type="button" class="icon-actions__button" title="View record" aria-label="View record" @click="openDetails(slotProps.data.id)">
                  <PhEye weight="bold" />
                </button>
                <button type="button" class="icon-actions__button" title="Correct record" aria-label="Correct record" @click="openCorrection(slotProps.data)">
                  <PhPencilSimple weight="bold" />
                </button>
                <button type="button" class="icon-actions__button icon-actions__button--danger" title="Delete record" aria-label="Delete record" @click="requestDelete(slotProps.data.id)">
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
      header="Attendance record"
      @update:visible="closeDetails"
    >
      <div v-if="selectedRecord" class="module-summary">
        <BaseStatusPill :label="selectedRecord.status" :tone="statusMeta[selectedRecord.status].tone" />
        <p><strong>Member:</strong> {{ selectedRecord.studentName }}</p>
        <p><strong>Course:</strong> {{ selectedRecord.course }}</p>
        <p><strong>Class:</strong> {{ selectedRecord.className }}</p>
        <p><strong>Date:</strong> {{ selectedRecord.date }}</p>
        <p><strong>Entry:</strong> {{ selectedRecord.entry ?? 'n/a' }} • <strong>Exit:</strong> {{ selectedRecord.exit ?? 'n/a' }}</p>
        <p><strong>Hours:</strong> {{ selectedRecord.hours ?? 0 }}</p>
        <!--
          Says which bucket this day's hours landed in and why, resolved through
          the same rule that produces every total.
        -->
        <p v-if="recordPeriod">
          <strong>Counts as:</strong> {{ PARTICIPATION_KIND_LABELS[recordPeriod.kind] }}
          <span class="type-meta">
            ({{ recordPeriod.startDate }} → {{ recordPeriod.endDate ?? 'present' }}) ·
            {{ PARTICIPATION_KIND_CREDIT[recordPeriod.kind] }}
          </span>
        </p>
        <p v-else>
          <strong>Counts as:</strong> Unclassified
          <span class="type-meta">
            No participation period covers {{ selectedRecord.date }}, so these hours count towards
            neither the surplus certificate nor the FCT requirement.
          </span>
        </p>
        <p><strong>Device:</strong> {{ selectedRecord.deviceName }}</p>
        <p><strong>Corrections:</strong> {{ selectedRecord.corrections }}</p>
        <p><strong>Notes:</strong> {{ selectedRecord.notes || 'None' }}</p>
        <p><strong>Created by:</strong> {{ selectedRecord.createdBy }}</p>
        <p><strong>Updated:</strong> {{ selectedRecord.updatedAt ?? 'not updated' }}<template v-if="selectedRecord.updatedBy"> by {{ selectedRecord.updatedBy }}</template></p>
      </div>

      <template #footer>
        <div class="inline-actions inline-actions--end">
          <BaseButton label="Close" severity="secondary" text @click="closeDetails" />
          <BaseButton v-if="selectedRecord" label="Correct record" @click="openCorrection(selectedRecord)" />
        </div>
      </template>
    </BaseDialog>

    <BaseFormDialog
      :visible="correctionVisible"
      title="Correct attendance record"
      subtitle="Adjust entry/exit times and leave a note explaining the correction."
      confirm-label="Save correction"
      :loading="attendanceStore.saving"
      @update:visible="correctionVisible = $event"
      @confirm="submitCorrection"
      @cancel="correctionVisible = false"
    >
      <div class="settings-grid">
        <label>
          <span>Reason</span>
          <BaseSelect v-model="correctionForm.reason" :options="correctionReasonOptions" />
        </label>
        <label>
          <span>Entry time</span>
          <BaseTextInput v-model="correctionForm.entryTime" placeholder="HH:mm" />
        </label>
        <label>
          <span>Exit time</span>
          <BaseTextInput v-model="correctionForm.exitTime" placeholder="HH:mm" />
        </label>
        <label class="settings-grid__wide">
          <span>Administrator notes</span>
          <BaseTextInput v-model="correctionForm.administratorNotes" placeholder="Reason for the correction" />
        </label>
      </div>
    </BaseFormDialog>

    <BaseConfirmDialog
      :visible="deleteConfirmVisible"
      title="Delete attendance record"
      :message="deletingRecord
        ? `Delete the ${deletingRecord.date} record for ${deletingRecord.studentName}? Attendance hours already credited to this member will no longer include it.`
        : 'Delete this attendance record?'"
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
