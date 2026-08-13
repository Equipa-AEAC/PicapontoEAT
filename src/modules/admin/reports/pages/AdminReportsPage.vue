<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { PhCalendarCheck, PhClipboardText, PhDownloadSimple, PhFolders, PhNotePencil, PhTimer, PhUsersThree, PhWarning } from "@phosphor-icons/vue";

import {
  BaseButton,
  BaseCard,
  BaseDatePicker,
  BaseDialog,
  BaseEmptyState,
  BaseFilterPanel,
  BaseLoading,
  BasePageHeader,
  BaseSearchBar,
  BaseSection,
  BaseSelect,
  BaseStatusPill,
  BaseStatsCard,
  BaseTable,
  BaseTableColumn,
  BaseTabs,
  BaseTextInput,
  BaseToolbar,
} from "../../../../shared/components/base";
import type { BaseTabItem } from "../../../../shared/components/base";
import { useAdminJournalStore, useDevicesStore, useMembersStore } from "../../../../shared/stores";
import { exportReport, getReportSummary, previewReport } from "../../../../services/reports.service";
import { REPORT_TYPE_OPTIONS } from "../../../../types/reports";
import type { ReportExportFormat, ReportFilterValues, ReportPreview, ReportSummary } from "../../../../types/reports";
import type { TeamJournalEntry } from "../../../../types/internshipReports";

const journalStore = useAdminJournalStore();
const membersStore = useMembersStore();
const devicesStore = useDevicesStore();

const activeTab = ref("activity");
const selectedEntry = ref<TeamJournalEntry | null>(null);

const tabs = computed<BaseTabItem[]>(() => [
  { value: "activity", label: "Activity feed", icon: PhNotePencil, badge: journalStore.entries.length },
  { value: "coverage", label: "Coverage", icon: PhCalendarCheck, badge: journalStore.staleContributors.length },
  { value: "projects", label: "Projects", icon: PhFolders, badge: journalStore.summary?.projects.length ?? 0 },
  { value: "exports", label: "Exports", icon: PhDownloadSimple },
]);

/* ---------------------------------------------------------------- Activity */

const statusOptions = [
  { label: "All statuses", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Submitted", value: "submitted" },
];

const memberFilterOptions = computed(() => [
  { label: "All members", value: "all" },
  ...membersStore.allMembers.map((member) => ({ label: member.fullName, value: member.id })),
]);

const projectFilterOptions = computed(() => [
  { label: "All projects", value: "all" },
  ...journalStore.projects.map((project) => ({ label: project.name, value: project.id })),
]);

const monthFilterOptions = computed(() => [
  { label: "All months", value: "all" },
  ...journalStore.availableMonths.map((month) => ({ label: month, value: month })),
]);

const hasJournalFilters = computed(
  () =>
    journalStore.filters.query.trim().length > 0 ||
    journalStore.filters.memberId !== "all" ||
    journalStore.filters.projectId !== "all" ||
    journalStore.filters.month !== "all" ||
    journalStore.filters.status !== "all",
);

let journalTimer: ReturnType<typeof setTimeout> | undefined;

watch(
  () => journalStore.filters.query,
  () => {
    clearTimeout(journalTimer);
    journalTimer = setTimeout(() => void journalStore.loadJournal(), 250);
  },
);

watch(
  () => [journalStore.filters.memberId, journalStore.filters.projectId, journalStore.filters.month, journalStore.filters.status],
  () => {
    void journalStore.loadJournal();
  },
);

function clearJournalFilters() {
  journalStore.resetFilters();
  void journalStore.loadJournal();
}

function openEntry(entry: TeamJournalEntry) {
  selectedEntry.value = entry;
}

/** Nothing written for over two weeks is the signal worth flagging. */
function coverageTone(daysSinceLastEntry: number | null) {
  if (daysSinceLastEntry === null) return "danger";
  if (daysSinceLastEntry > 14) return "warning";
  return "success";
}

function coverageLabel(daysSinceLastEntry: number | null) {
  if (daysSinceLastEntry === null) return "Never written";
  if (daysSinceLastEntry === 0) return "Today";
  return `${daysSinceLastEntry}d ago`;
}

/* ----------------------------------------------------------------- Exports */

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

const rangeStart = ref("");
const rangeEnd = ref("");

const summary = ref<ReportSummary | null>(null);
const preview = ref<ReportPreview | null>(null);
const downloadUrl = ref<string | null>(null);
const exportLoading = ref(false);
const exporting = ref(false);
const loadError = ref<string | null>(null);

const deviceOptions = computed(() => [
  { label: "All devices", value: "all" },
  ...devicesStore.items.map((device) => ({ label: device.name, value: device.id })),
]);

function currentDateRange(): [string | null, string | null] {
  return [rangeStart.value || null, rangeEnd.value || null];
}

async function loadPreview() {
  exportLoading.value = true;
  loadError.value = null;

  try {
    summary.value = await getReportSummary();
    preview.value = await previewReport({ ...form, dateRange: currentDateRange() });
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : "Unable to load the report preview.";
  } finally {
    exportLoading.value = false;
  }
}

async function exportCurrentReport() {
  exporting.value = true;

  try {
    const result = await exportReport({ ...form, dateRange: currentDateRange() }, form.format);
    downloadUrl.value = result.downloadUrl;
  } finally {
    exporting.value = false;
  }
}

function openDownload() {
  if (downloadUrl.value) {
    window.open(downloadUrl.value, "_blank", "noopener");
  }
}

onMounted(async () => {
  await Promise.all([membersStore.loadAllMembers(), devicesStore.loadDevices(), journalStore.loadJournal()]);
  await loadPreview();
});
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      title="Reports"
      description="The work journal every member keeps — what was done, on which project, and by whom — plus the exports handed over at the end of a period."
    >
      <template #actions>
        <BaseButton label="Refresh" severity="secondary" outlined :loading="journalStore.loading" @click="journalStore.loadJournal()" />
      </template>
    </BasePageHeader>

    <section class="metric-grid">
      <BaseStatsCard label="Journal entries" :value="String(journalStore.summary?.totalEntries ?? 0)" caption="Days registered across the roster" :icon="PhClipboardText" />
      <BaseStatsCard label="Hours described" :value="`${journalStore.summary?.totalHours ?? 0}h`" caption="Work accounted for in writing" :icon="PhTimer" />
      <BaseStatsCard label="Contributors" :value="String(journalStore.summary?.contributors ?? 0)" caption="Members who have written at least once" :icon="PhUsersThree" />
      <BaseStatsCard label="Needs a nudge" :value="String(journalStore.staleContributors.length)" caption="No entry in the last two weeks" :icon="PhWarning" />
    </section>

    <p v-if="journalStore.errorMessage" class="form-error-banner">{{ journalStore.errorMessage }}</p>

    <BaseTabs v-model="activeTab" :tabs="tabs">
      <!-- ------------------------------------------------------- Activity -->
      <template #activity>
        <BaseFilterPanel title="Filter the journal" description="Narrow by member, project, month or status.">
          <div class="filter-strip">
            <BaseSearchBar v-model="journalStore.filters.query" placeholder="Search activities, learnings or difficulties" />
            <BaseSelect v-model="journalStore.filters.memberId" :options="memberFilterOptions" />
            <BaseSelect v-model="journalStore.filters.projectId" :options="projectFilterOptions" />
            <BaseSelect v-model="journalStore.filters.month" :options="monthFilterOptions" />
            <BaseSelect v-model="journalStore.filters.status" :options="statusOptions" />
            <BaseButton label="Clear filters" severity="secondary" outlined :disabled="!hasJournalFilters" @click="clearJournalFilters" />
          </div>
        </BaseFilterPanel>

        <BaseLoading v-if="journalStore.loading" />

        <BaseSection v-else title="What has been done" description="Newest first. Click an entry to read the full write-up.">
          <BaseCard>
            <BaseTable :value="journalStore.entries" dataKey="id" paginator :rows="10" @rowClick="openEntry($event.data)">
              <template #empty>
                <BaseEmptyState
                  title="No journal entries"
                  description="Nobody has written a daily entry matching these filters yet. Logging a day is optional but recommended — it is what the monthly and final internship reports are built from."
                  action-label="Clear filters"
                  @action="clearJournalFilters"
                />
              </template>

              <BaseTableColumn header="Member" field="memberName" sortable width="200px">
                <template #body="slotProps">
                  <div class="cell-stack">
                    <strong>{{ slotProps.data.memberName }}</strong>
                    <small v-if="slotProps.data.memberIsExternal">External intern</small>
                  </div>
                </template>
              </BaseTableColumn>
              <BaseTableColumn field="date" header="Date" sortable width="120px" />
              <BaseTableColumn header="Hours" field="hours" sortable width="90px">
                <template #body="slotProps">{{ slotProps.data.hours }}h</template>
              </BaseTableColumn>
              <BaseTableColumn header="Project" width="180px">
                <template #body="slotProps">
                  <BaseStatusPill v-if="slotProps.data.projectName" :label="slotProps.data.projectName" tone="info" />
                  <span v-else class="journal-muted">Unassigned</span>
                </template>
              </BaseTableColumn>
              <BaseTableColumn header="Activities">
                <template #body="slotProps">
                  <span class="journal-excerpt">{{ slotProps.data.activities }}</span>
                </template>
              </BaseTableColumn>
              <BaseTableColumn header="Status" width="120px">
                <template #body="slotProps">
                  <BaseStatusPill :label="slotProps.data.status" :tone="slotProps.data.status === 'submitted' ? 'success' : 'warning'" />
                </template>
              </BaseTableColumn>
            </BaseTable>
          </BaseCard>
        </BaseSection>
      </template>

      <!-- ------------------------------------------------------- Coverage -->
      <template #coverage>
        <BaseSection
          title="Who is still writing"
          description="Keeping a journal is optional but recommended — for interns it is what the FCT report is assembled from. This shows where the gaps are."
        >
          <BaseCard>
            <BaseTable :value="journalStore.summary?.coverage ?? []" dataKey="memberId" paginator :rows="10">
              <template #empty>
                <BaseEmptyState title="No members loaded" description="The roster returned no members to report on." />
              </template>

              <BaseTableColumn header="Member" field="memberName" sortable>
                <template #body="slotProps">
                  <div class="cell-stack">
                    <strong>{{ slotProps.data.memberName }}</strong>
                    <small>{{ slotProps.data.isIntern ? 'FCT intern' : 'Team member' }}</small>
                  </div>
                </template>
              </BaseTableColumn>
              <BaseTableColumn field="entriesThisMonth" header="Entries this month" sortable />
              <BaseTableColumn header="Hours this month" field="hoursThisMonth" sortable>
                <template #body="slotProps">{{ slotProps.data.hoursThisMonth }}h</template>
              </BaseTableColumn>
              <BaseTableColumn field="totalEntries" header="Total entries" sortable />
              <BaseTableColumn header="Total hours" field="totalHours" sortable>
                <template #body="slotProps">{{ slotProps.data.totalHours }}h</template>
              </BaseTableColumn>
              <BaseTableColumn header="Last entry" field="lastEntryDate" sortable>
                <template #body="slotProps">
                  <div class="cell-stack">
                    <span>{{ slotProps.data.lastEntryDate ?? '—' }}</span>
                    <small>{{ coverageLabel(slotProps.data.daysSinceLastEntry) }}</small>
                  </div>
                </template>
              </BaseTableColumn>
              <BaseTableColumn header="Status" width="140px">
                <template #body="slotProps">
                  <BaseStatusPill
                    :label="slotProps.data.daysSinceLastEntry === null ? 'No journal' : slotProps.data.daysSinceLastEntry > 14 ? 'Behind' : 'Up to date'"
                    :tone="coverageTone(slotProps.data.daysSinceLastEntry)"
                  />
                </template>
              </BaseTableColumn>
            </BaseTable>
          </BaseCard>
        </BaseSection>
      </template>

      <!-- ------------------------------------------------------- Projects -->
      <template #projects>
        <BaseSection
          title="Where the hours went"
          description="Daily entries rolled up by project. This is the seam a fuller task board would grow from."
        >
          <BaseCard>
            <BaseEmptyState
              v-if="!journalStore.summary?.projects.length"
              title="No projects yet"
              description="Projects appear here once they exist and daily entries are tagged against them."
            />

            <article v-for="project in journalStore.summary?.projects ?? []" :key="project.projectId" class="list-row">
              <div>
                <strong>{{ project.projectName }}</strong>
                <p>
                  {{ project.owner }} • {{ project.hours }}h across {{ project.entries }}
                  {{ project.entries === 1 ? 'entry' : 'entries' }}
                  <template v-if="project.contributors.length"> • {{ project.contributors.join(', ') }}</template>
                  <template v-else> • no contributions yet</template>
                </p>
                <p v-if="project.lastActivityDate" class="journal-muted">Last activity {{ project.lastActivityDate }}</p>
              </div>
              <BaseStatusPill
                :label="project.status"
                :tone="project.status === 'active' ? 'success' : project.status === 'paused' ? 'warning' : 'info'"
              />
            </article>
          </BaseCard>
        </BaseSection>
      </template>

      <!-- -------------------------------------------------------- Exports -->
      <template #exports>
        <BaseToolbar>
          <template #left>
            <BaseStatusPill :label="downloadUrl ? 'Export ready' : 'No export yet'" :tone="downloadUrl ? 'success' : 'info'" />
          </template>
          <template #right>
            <div class="inline-actions">
              <BaseButton label="Preview report" severity="secondary" outlined :loading="exportLoading" @click="loadPreview" />
              <BaseButton label="Export report" :loading="exporting" @click="exportCurrentReport" />
              <BaseButton v-if="downloadUrl" label="Open file" severity="secondary" outlined @click="openDownload" />
            </div>
          </template>
        </BaseToolbar>

        <BaseEmptyState
          v-if="loadError"
          title="Reports unavailable"
          :description="loadError"
          action-label="Retry"
          @action="loadPreview()"
        />

        <BaseLoading v-else-if="exportLoading" />

        <div v-else class="dashboard-grid">
          <BaseCard title="Report filters" description="Scope the generated report before previewing or exporting.">
            <div class="settings-grid">
              <label>
                <span>Type</span>
                <BaseSelect v-model="form.type" :options="REPORT_TYPE_OPTIONS" />
              </label>
              <label>
                <span>Format</span>
                <BaseSelect v-model="form.format" :options="reportFormats" />
              </label>
              <label>
                <span>Scope</span>
                <BaseTextInput v-model="form.scope" />
              </label>
              <label>
                <span>From</span>
                <BaseDatePicker v-model="rangeStart" />
              </label>
              <label>
                <span>To</span>
                <BaseDatePicker v-model="rangeEnd" />
              </label>
              <label>
                <span>Member</span>
                <BaseSelect v-model="form.studentId" :options="memberFilterOptions" />
              </label>
              <label>
                <span>Device</span>
                <BaseSelect v-model="form.deviceId" :options="deviceOptions" />
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

          <BaseCard v-if="summary" title="Period snapshot" description="What the export will cover.">
            <div class="module-summary">
              <BaseStatusPill label="Audit safe" tone="success" />
              <p>
                {{ summary.activeStudents }} active members and {{ summary.attendanceTotal }} attendance entries.
                {{ summary.teamHours }}h of volunteer team hours and {{ summary.internshipHours }}h of FCT internship hours are tracked separately.
              </p>
              <p>{{ journalStore.summary?.entriesThisMonth ?? 0 }} journal entries were written this month.</p>
            </div>
          </BaseCard>
        </div>
      </template>
    </BaseTabs>

    <BaseDialog :visible="Boolean(selectedEntry)" header="Daily entry" @update:visible="selectedEntry = null">
      <div v-if="selectedEntry" class="module-summary">
        <BaseStatusPill :label="selectedEntry.status" :tone="selectedEntry.status === 'submitted' ? 'success' : 'warning'" />
        <p><strong>Member:</strong> {{ selectedEntry.memberName }}</p>
        <p><strong>Date:</strong> {{ selectedEntry.date }} • <strong>Hours:</strong> {{ selectedEntry.hours }}h</p>
        <p><strong>Project:</strong> {{ selectedEntry.projectName ?? 'Unassigned' }}</p>
        <p><strong>Activities carried out</strong></p>
        <p>{{ selectedEntry.activities }}</p>
        <p><strong>New learnings</strong></p>
        <p>{{ selectedEntry.learnings || '—' }}</p>
        <p><strong>Difficulties felt</strong></p>
        <p>{{ selectedEntry.difficulties || '—' }}</p>
      </div>

      <template #footer>
        <div class="inline-actions inline-actions--end">
          <BaseButton label="Close" severity="secondary" text @click="selectedEntry = null" />
        </div>
      </template>
    </BaseDialog>
  </section>
</template>

<style scoped>
.journal-muted {
  color: var(--text-muted);
  font-size: 0.82rem;
}

.journal-excerpt {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  max-width: 420px;
}
</style>
