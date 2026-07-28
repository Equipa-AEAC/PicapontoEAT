<script setup lang="ts">
import { computed, onMounted, reactive } from "vue";
import Button from "primevue/button";
import Column from "primevue/column";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { PhClockCounterClockwise, PhFingerprint, PhUsersThree } from "@phosphor-icons/vue";

import BaseCard from "../components/base/BaseCard.vue";
import BaseMetricCard from "../components/base/BaseMetricCard.vue";
import BasePageHeader from "../components/base/BasePageHeader.vue";
import BaseStatusPill from "../components/base/BaseStatusPill.vue";
import BaseTable from "../components/base/BaseTable.vue";
import { useAttendanceStore } from "../stores/attendance";
import { useDevicesStore } from "../stores/devices";
import { useMembersStore } from "../stores/members";

const attendanceStore = useAttendanceStore();
const membersStore = useMembersStore();
const devicesStore = useDevicesStore();

const filterForm = reactive<{
  query: string;
  course: string | "all";
  status: "all" | "present" | "late" | "missing" | "corrected";
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

const courseOptions = computed(() => {
  const values = new Set(attendanceStore.items.map((item) => item.course));
  return [{ label: "All courses", value: "all" }, ...Array.from(values).map((value) => ({ label: value, value }))];
});

const statusOptions = [
  { label: "All statuses", value: "all" },
  { label: "Present", value: "present" },
  { label: "Late", value: "late" },
  { label: "Missing", value: "missing" },
  { label: "Corrected", value: "corrected" },
];

const studentOptions = computed(() => [{ label: "All members", value: "all" }, ...membersStore.items.map((student) => ({ label: student.fullName, value: student.id }))]);
const deviceOptions = computed(() => [{ label: "All devices", value: "all" }, ...devicesStore.items.map((device) => ({ label: device.name, value: device.id }))]);

const totalRecords = computed(() => attendanceStore.items.length);
const correctionRecords = computed(() => attendanceStore.correctionCount);
const presentRecords = computed(() => attendanceStore.items.filter((item) => item.status === "present").length);
const hoursRecorded = computed(() => attendanceStore.items.reduce((total, item) => total + (item.hours ?? 0), 0));

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
}

async function removeAttendance(attendanceId: string) {
  await attendanceStore.removeAttendance(attendanceId);
  if (attendanceStore.selectedAttendance?.id === attendanceId) {
    attendanceStore.selectedAttendance = null;
  }
}

onMounted(async () => {
  await Promise.all([membersStore.loadMembers(), devicesStore.loadDevices()]);
  await attendanceStore.loadAttendance();
});
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      eyebrow="Attendance control"
      title="Attendance"
      description="Review scan validation, duplicates, entry and exit records from a single module."
    >
      <template #actions>
        <Button label="Apply filters" severity="secondary" outlined @click="applyFilters" />
        <Button label="Reload" @click="attendanceStore.loadAttendance()" />
      </template>
    </BasePageHeader>

    <section class="metric-grid">
      <BaseMetricCard label="Total records" :value="String(totalRecords)" caption="Attendance rows in the current view" :icon="PhFingerprint" trend-label="Live list" trend-tone="positive" />
      <BaseMetricCard label="Present" :value="String(presentRecords)" caption="Validated present records" :icon="PhUsersThree" trend-label="Operational" trend-tone="positive" />
      <BaseMetricCard label="Corrections" :value="String(correctionRecords)" caption="Records updated by administrators" :icon="PhClockCounterClockwise" trend-label="Needs review" trend-tone="neutral" />
      <BaseMetricCard label="Hours logged" :value="String(hoursRecorded)" caption="Approved attendance hours" :icon="PhFingerprint" trend-label="Tracked" trend-tone="positive" />
    </section>

    <BaseCard title="Filters" description="Narrow attendance by query, course, status and asset.">
      <div class="filter-strip">
        <InputText v-model="filterForm.query" placeholder="Search student, class, device or date" />
        <Select v-model="filterForm.course" :options="courseOptions" optionLabel="label" optionValue="value" />
        <Select v-model="filterForm.status" :options="statusOptions" optionLabel="label" optionValue="value" />
        <Select v-model="filterForm.studentId" :options="studentOptions" optionLabel="label" optionValue="value" />
        <Select v-model="filterForm.deviceId" :options="deviceOptions" optionLabel="label" optionValue="value" />
        <Button label="Reset" severity="secondary" outlined @click="resetFilters" />
      </div>
    </BaseCard>

    <section class="dashboard-grid">
      <BaseCard title="Attendance log" description="Operational rows with direct drill-down and deletion actions.">
        <BaseTable :value="attendanceStore.items" dataKey="id" :loading="attendanceStore.loading" paginator :rows="8">
          <Column field="studentName" header="Student" sortable />
          <Column field="date" header="Date" sortable />
          <Column field="entry" header="Entry" />
          <Column field="exit" header="Exit" />
          <Column field="deviceName" header="Device" />
          <Column field="status" header="Status">
            <template #body="slotProps">
              <BaseStatusPill :label="slotProps.data.status" :tone="slotProps.data.status === 'corrected' ? 'warning' : slotProps.data.status === 'present' ? 'success' : 'danger'" />
            </template>
          </Column>
          <Column field="corrections" header="Corrections" sortable />
          <Column header="Actions">
            <template #body="slotProps">
              <div class="inline-actions">
                <Button label="Open" severity="secondary" text @click="openDetails(slotProps.data.id)" />
                <Button label="Delete" severity="danger" text @click="removeAttendance(slotProps.data.id)" />
              </div>
            </template>
          </Column>
        </BaseTable>
      </BaseCard>

      <BaseCard v-if="selectedRecord" title="Record details" description="Selected attendance entry and audit metadata.">
        <div class="module-summary">
          <BaseStatusPill :label="selectedRecord.status" :tone="selectedRecord.status === 'present' ? 'success' : selectedRecord.status === 'corrected' ? 'warning' : 'danger'" />
          <p><strong>Student:</strong> {{ selectedRecord.studentName }}</p>
          <p><strong>Course:</strong> {{ selectedRecord.course }}</p>
          <p><strong>Class:</strong> {{ selectedRecord.className }}</p>
          <p><strong>Entry:</strong> {{ selectedRecord.entry ?? 'n/a' }} • <strong>Exit:</strong> {{ selectedRecord.exit ?? 'n/a' }}</p>
          <p><strong>Hours:</strong> {{ selectedRecord.hours ?? 0 }}</p>
          <p><strong>Device:</strong> {{ selectedRecord.deviceName }}</p>
          <p><strong>Notes:</strong> {{ selectedRecord.notes }}</p>
          <p><strong>Updated:</strong> {{ selectedRecord.updatedAt ?? 'not updated' }}</p>
        </div>
      </BaseCard>
    </section>
  </section>
</template>