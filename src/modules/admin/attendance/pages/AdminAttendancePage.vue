<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import {
  PhArrowRight,
  PhCheckCircle,
  PhClockCounterClockwise,
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

const attendanceStore = useAttendanceStore();
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

const filterForm = reactive<{
  query: string;
  course: string | "all";
  status: "all" | AttendanceStatus;
  studentId: string | "all";
  deviceId: string | "all";
}>({
  query: "",
  course: "all",
  status: "all",
  studentId: "all",
  deviceId: "all",
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
    filterForm.query.trim().length > 0 ||
    filterForm.course !== "all" ||
    filterForm.status !== "all" ||
    filterForm.studentId !== "all" ||
    filterForm.deviceId !== "all",
);

const statusMeta: Record<AttendanceStatus, { tone: "success" | "warning" | "danger" | "info"; icon: typeof PhCheckCircle }> = {
  present: { tone: "success", icon: PhCheckCircle },
  late: { tone: "warning", icon: PhTimer },
  missing: { tone: "danger", icon: PhXCircle },
  corrected: { tone: "warning", icon: PhWarningCircle },
};

async function applyFilters() {
  attendanceStore.filters.query = filterForm.query;
  attendanceStore.filters.course = filterForm.course;
  attendanceStore.filters.status = filterForm.status;
  attendanceStore.filters.studentId = filterForm.studentId;
  attendanceStore.filters.deviceId = filterForm.deviceId;
  await attendanceStore.loadAttendance();
}

function resetFilters() {
  filterForm.query = "";
  filterForm.course = "all";
  filterForm.status = "all";
  filterForm.studentId = "all";
  filterForm.deviceId = "all";
  void applyFilters();
}

async function openDetails(attendanceId: string) {
  await attendanceStore.loadAttendanceDetails(attendanceId);
  detailsVisible.value = true;
}

function closeDetails() {
  detailsVisible.value = false;
  attendanceStore.selectedAttendance = null;
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
  await Promise.all([membersStore.loadAllMembers(), devicesStore.loadDevices()]);
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
      </template>
    </BasePageHeader>

    <section class="metric-grid">
      <BaseMetricCard label="Total records" :value="String(totalRecords)" caption="Attendance rows in the current view" :icon="PhFingerprint" trend-label="Live list" trend-tone="positive" />
      <BaseMetricCard label="Present" :value="String(presentRecords)" caption="Validated present records" :icon="PhUsersThree" trend-label="Operational" trend-tone="positive" />
      <BaseMetricCard label="Corrections" :value="String(correctionRecords)" caption="Records updated by administrators" :icon="PhClockCounterClockwise" :trend-label="correctionRecords > 0 ? 'Needs review' : 'All clear'" :trend-tone="correctionRecords > 0 ? 'negative' : 'positive'" />
      <BaseMetricCard label="Hours logged" :value="String(Math.round(hoursRecorded))" caption="Approved attendance hours" :icon="PhTimer" trend-label="Tracked" trend-tone="positive" />
    </section>

    <BaseFilterPanel title="Filters" description="Narrow attendance by query, course, status and asset.">
      <div class="filter-strip">
        <BaseSearchBar v-model="filterForm.query" placeholder="Search member, class, device or date" />
        <BaseSelect v-model="filterForm.course" :options="courseOptions" />
        <BaseSelect v-model="filterForm.status" :options="statusOptions" />
        <BaseSelect v-model="filterForm.studentId" :options="studentOptions" />
        <BaseSelect v-model="filterForm.deviceId" :options="deviceOptions" />
        <BaseButton label="Apply" @click="applyFilters" />
        <BaseButton label="Reset" severity="secondary" outlined :disabled="!hasActiveFilters" @click="resetFilters" />
      </div>
    </BaseFilterPanel>

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
            <BaseEmptyState title="No attendance records" description="No scan matches the current filters." action-label="Reset filters" @action="resetFilters" />
          </template>

          <TableColumn header="Member" field="studentName" sortable>
            <template #body="slotProps">
              <div class="cell-stack">
                <strong>{{ slotProps.data.studentName }}</strong>
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
