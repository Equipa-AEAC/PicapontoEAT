<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import Select from "primevue/select";
import InputText from "primevue/inputtext";

import BaseEmptyState from "../components/base/BaseEmptyState.vue";
import BaseLoading from "../components/base/BaseLoading.vue";
import BaseCard from "../components/base/BaseCard.vue";
import BasePageHeader from "../components/base/BasePageHeader.vue";
import BaseStatusPill from "../components/base/BaseStatusPill.vue";
import { useDevicesStore } from "../stores/devices";
import { useMembersStore } from "../stores/members";
import { exportReport, getReportSummary, previewReport } from "../services/reports.service";
import type { ReportExportFormat, ReportFilterValues, ReportPreview, ReportSummary, ReportType } from "../types/reports";

const membersStore = useMembersStore();
const devicesStore = useDevicesStore();

const reportTypes: Array<{ label: string; value: ReportType }> = [
  { label: "Attendance", value: "attendance" },
  { label: "Internship", value: "internship" },
  { label: "Student", value: "student" },
  { label: "Device", value: "device" },
];

const reportFormats: Array<{ label: string; value: ReportExportFormat }> = [
  { label: "PDF", value: "pdf" },
  { label: "Excel", value: "excel" },
  { label: "CSV", value: "csv" },
];

const form = reactive<Omit<ReportFilterValues, "dateRange">>({
  type: "attendance",
  format: "pdf",
  scope: "school-wide",
  studentId: "all",
  deviceId: "all",
});

const dateRange = ref<[Date | null, Date | null]>([null, null]);

const summary = ref<ReportSummary | null>(null);
const preview = ref<ReportPreview | null>(null);
const downloadUrl = ref<string | null>(null);
const loading = ref(false);
const exporting = ref(false);
const loadError = ref<string | null>(null);

const studentOptions = [
  { label: "All members", value: "all" },
];

const deviceOptions = [
  { label: "All devices", value: "all" },
];

function formatDateRange(values: [Date | null, Date | null]) {
  return values.map((value) => (value ? value.toISOString().slice(0, 10) : null)) as [string | null, string | null];
}

async function loadPreview() {
  loading.value = true;
  loadError.value = null;
  try {
    summary.value = await getReportSummary();
    preview.value = await previewReport({
      ...form,
      dateRange: formatDateRange(dateRange.value),
    });
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : "Unable to load the report preview.";
  } finally {
    loading.value = false;
  }
}

async function exportCurrentReport() {
  exporting.value = true;
  try {
    const result = await exportReport({ ...form, dateRange: formatDateRange(dateRange.value) }, form.format);
    downloadUrl.value = result.downloadUrl;
  } finally {
    exporting.value = false;
  }
}

onMounted(async () => {
  await Promise.all([membersStore.loadMembers(), devicesStore.loadDevices()]);
  await loadPreview();
});
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      eyebrow="Reporting"
      title="Reports"
      description="Generate attendance, internship, student and device reports from the API layer."
    >
      <template #actions>
        <Button label="Preview report" severity="secondary" outlined :loading="loading" @click="loadPreview" />
        <Button label="Export report" :loading="exporting" @click="exportCurrentReport" />
      </template>
    </BasePageHeader>

    <div class="page-breadcrumbs">
      <span>Admin Workspace</span>
      <span>/</span>
      <span>Reports</span>
    </div>

    <BaseLoading v-if="loading" />

    <BaseEmptyState
      v-else-if="loadError"
      title="Reports unavailable"
      :description="loadError"
      action-label="Retry"
      @action="loadPreview()"
    />

    <template v-else>
      <section class="metric-grid">
        <BaseCard title="Report summary" description="Current system-wide reporting snapshot.">
          <div class="module-summary">
            <BaseStatusPill label="Audit safe" tone="success" />
            <p v-if="summary">
              {{ summary.activeStudents }} active members, {{ summary.attendanceTotal }} attendance entries and {{ summary.internshipHours }} internship hours generated at {{ summary.generatedAt }}.
            </p>
            <BaseEmptyState v-else title="No summary yet" description="Run a preview to populate the reporting snapshot." action-label="Preview report" @action="loadPreview()" />
          </div>
        </BaseCard>

        <BaseCard title="Export state" description="Latest export request status.">
          <div class="module-summary">
            <BaseStatusPill :label="downloadUrl ? 'Ready to download' : 'No export yet'" :tone="downloadUrl ? 'success' : 'warning'" />
            <p>{{ downloadUrl ?? 'Preview a report to generate the export link.' }}</p>
          </div>
        </BaseCard>
      </section>

      <section class="dashboard-grid">
        <BaseCard title="Report filters" description="Scope the generated report before previewing or exporting.">
          <div class="settings-grid">
            <label>
              <span>Type</span>
              <Select v-model="form.type" :options="reportTypes" optionLabel="label" optionValue="value" />
            </label>
            <label>
              <span>Format</span>
              <Select v-model="form.format" :options="reportFormats" optionLabel="label" optionValue="value" />
            </label>
            <label>
              <span>Scope</span>
              <InputText v-model="form.scope" />
            </label>
            <label>
              <span>Date range</span>
              <DatePicker v-model="dateRange" selectionMode="range" dateFormat="yy-mm-dd" showIcon />
            </label>
            <label>
              <span>Member</span>
              <Select v-model="form.studentId" :options="studentOptions" optionLabel="label" optionValue="value" />
            </label>
            <label>
              <span>Device</span>
              <Select v-model="form.deviceId" :options="deviceOptions" optionLabel="label" optionValue="value" />
            </label>
          </div>
        </BaseCard>

        <BaseCard title="Report preview" description="Mocked output returned by the service layer.">
          <div v-if="preview" class="report-preview">
            <h3>{{ preview.title }}</h3>
            <p>{{ preview.subtitle }}</p>
            <p>{{ preview.summary }}</p>
            <ul class="report-preview__list">
              <li v-for="item in preview.chartData" :key="item.label">
                <strong>{{ item.label }}</strong>
                <span>{{ item.value }}</span>
              </li>
            </ul>
          </div>
          <BaseEmptyState v-else title="No preview yet" description="Run a preview to generate mocked report output." action-label="Preview report" @action="loadPreview()" />
        </BaseCard>
      </section>

      <section class="dashboard-grid">
        <BaseCard title="Source lists" description="Members and devices available for the report filters.">
          <div class="source-columns">
            <div>
              <h3>Members</h3>
              <p v-for="member in membersStore.items.slice(0, 5)" :key="member.id">
                {{ member.fullName }} • {{ member.memberNumber }}
              </p>
            </div>
            <div>
              <h3>Devices</h3>
              <p v-for="device in devicesStore.items.slice(0, 5)" :key="device.id">
                {{ device.name }} • {{ device.location }}
              </p>
            </div>
          </div>
        </BaseCard>
      </section>
    </template>
  </section>
</template>