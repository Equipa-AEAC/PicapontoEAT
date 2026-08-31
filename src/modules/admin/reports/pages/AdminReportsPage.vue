<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
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
import ProjectProgressBar from "../../../../components/projects/ProjectProgressBar.vue";
import { useAdminJournalStore, useDevicesStore, useMembersStore, useProjectsStore } from "../../../../shared/stores";
import { exportReport, getReportSummary, previewReport } from "../../../../services/reports.service";
import { REPORT_TYPE_OPTIONS } from "../../../../types/reports";
import type { ReportExportFormat, ReportFilterValues, ReportPreview, ReportSummary } from "../../../../types/reports";
import type { TeamJournalEntry } from "../../../../types/internshipReports";
import { journalCoverageState } from "../../../../shared/types";

const journalStore = useAdminJournalStore();
const membersStore = useMembersStore();
const devicesStore = useDevicesStore();
const projectsStore = useProjectsStore();
const router = useRouter();

const activeTab = ref("activity");
const selectedEntry = ref<TeamJournalEntry | null>(null);

const tabs = computed<BaseTabItem[]>(() => [
  { value: "activity", label: "Activity feed", icon: PhNotePencil, badge: journalStore.entries.length },
  { value: "coverage", label: "Coverage", icon: PhCalendarCheck, badge: journalStore.staleContributors.length },
  { value: "delivery", label: "Delivery", icon: PhFolders, badge: deliveryRows.value.length },
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

function coverageLabel(daysSinceLastEntry: number | null) {
  if (daysSinceLastEntry === null) return "Never written";
  if (daysSinceLastEntry === 0) return "Today";
  return `${daysSinceLastEntry}d ago`;
}

/* --------------------------------------------------------------- Delivery */

/**
 * Project delivery: the journal rollup Reports already produced, joined with the
 * task progress the project boards own.
 *
 * The two halves answer different questions — hours say how much time went into a
 * project, completed tasks say how much of it is finished — and an operational
 * report needs both side by side. Neither number is recomputed here; both are read
 * from the store that owns them.
 */
const deliveryRows = computed(() => {
  const journalByProject = new Map(
    (journalStore.summary?.projects ?? []).map((project) => [project.projectId, project]),
  );

  return projectsStore.allProjects
    .filter((project) => project.status !== "archived")
    .map((project) => {
      const journal = journalByProject.get(project.id);

      return {
        id: project.id,
        name: project.name,
        owner: project.owner,
        status: project.status,
        progress: project.progress,
        isOverdue: project.isOverdue,
        hours: journal?.hours ?? project.journalHours,
        entries: journal?.entries ?? project.journalEntries,
        contributors: journal?.contributors ?? project.participants.map((participant) => participant.name),
        lastActivityDate: journal?.lastActivityDate ?? null,
      };
    })
    .sort((first, second) => second.progress.overdue - first.progress.overdue || second.hours - first.hours);
});

function openProject(projectId: string) {
  void router.push({ name: "project-details", params: { projectId } });
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
    summary.value = await getReportSummary(currentDateRange());
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
  await Promise.all([
    membersStore.loadAllMembers(),
    devicesStore.loadDevices(),
    journalStore.loadJournal(),
    projectsStore.loadProjects(),
  ]);
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
        <BaseButton label="Project management" severity="secondary" @click="router.push({ name: 'projects-overview' })" />
        <BaseButton label="Refresh" severity="secondary" :loading="journalStore.loading" @click="journalStore.loadJournal()" />
      </template>
    </BasePageHeader>

    <section class="metric-grid">
      <BaseStatsCard label="Journal entries" :value="String(journalStore.summary?.totalEntries ?? 0)" caption="Days registered across the roster" :icon="PhClipboardText" />
      <BaseStatsCard label="Hours described" :value="`${journalStore.summary?.totalHours ?? 0}h`" caption="Work accounted for in writing" :icon="PhTimer" />
      <BaseStatsCard label="Contributors" :value="String(journalStore.summary?.contributors ?? 0)" caption="Members who have written at least once" :icon="PhUsersThree" />
      <!-- The count is only useful if it leads to the names behind it. -->
      <BaseStatsCard
        label="Interns behind"
        :value="String(journalStore.staleContributors.length)"
        caption="Required journal, no entry in two weeks — open the coverage list"
        :icon="PhWarning"
        interactive
        action-hint="Show the interns who are behind on their journal"
        @action="activeTab = 'coverage'"
      />
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
                  <!-- The entry already carries the project id; only the link was missing. -->
                  <button
                    v-if="slotProps.data.projectName"
                    type="button"
                    class="journal-project"
                    @click.stop="openProject(slotProps.data.projectId)"
                  >
                    {{ slotProps.data.projectName }}
                  </button>
                  <span v-else class="journal-muted">No project</span>
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
          description="Interns must keep the journal — their monthly balance and final report are assembled from it. For everyone else it is recommended, and a quiet week is not a fault."
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
                    <small>
                      {{ slotProps.data.isIntern ? 'FCT intern · journal required' : 'Team member · journal optional' }}
                    </small>
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
                    :label="journalCoverageState(slotProps.data.isIntern, slotProps.data.daysSinceLastEntry).label"
                    :tone="journalCoverageState(slotProps.data.isIntern, slotProps.data.daysSinceLastEntry).tone"
                  />
                </template>
              </BaseTableColumn>
            </BaseTable>
          </BaseCard>
        </BaseSection>
      </template>

      <!-- ------------------------------------------------------- Delivery -->
      <template #delivery>
        <BaseSection
          title="Delivery by project"
          description="Hours booked through the daily journal alongside the task progress from the project boards."
        >
          <BaseCard>
            <BaseEmptyState
              v-if="deliveryRows.length === 0"
              title="No active projects"
              description="Create a project in the Project management workspace and it will be reported here."
              action-label="Open project management"
              @action="router.push({ name: 'projects-overview' })"
            />

            <BaseTable v-else :value="deliveryRows" data-key="id">
              <BaseTableColumn header="Project">
                <template #body="{ data }">
                  <button type="button" class="delivery-link" @click="openProject((data as any).id)">
                    <span class="delivery-link__name">{{ (data as any).name }}</span>
                    <span class="delivery-link__meta">{{ (data as any).owner }}</span>
                  </button>
                </template>
              </BaseTableColumn>

              <BaseTableColumn header="Progress" width="170px">
                <template #body="{ data }">
                  <ProjectProgressBar :progress="(data as any).progress" />
                </template>
              </BaseTableColumn>

              <BaseTableColumn header="Tasks done" width="110px">
                <template #body="{ data }">
                  <span class="type-numeric">
                    {{ (data as any).progress.done }} / {{ (data as any).progress.total }}
                  </span>
                </template>
              </BaseTableColumn>

              <BaseTableColumn header="Overdue" width="100px">
                <template #body="{ data }">
                  <BaseStatusPill
                    v-if="(data as any).progress.overdue > 0"
                    :label="String((data as any).progress.overdue)"
                    tone="danger"
                  />
                  <span v-else class="journal-muted">—</span>
                </template>
              </BaseTableColumn>

              <BaseTableColumn header="Journal hours" width="130px">
                <template #body="{ data }">
                  <span class="cell-stack">
                    <span class="type-numeric">{{ (data as any).hours }}</span>
                    <small>{{ (data as any).entries }} {{ (data as any).entries === 1 ? 'entry' : 'entries' }}</small>
                  </span>
                </template>
              </BaseTableColumn>

              <BaseTableColumn header="Contributors">
                <template #body="{ data }">
                  <span v-if="(data as any).contributors.length">{{ (data as any).contributors.join(', ') }}</span>
                  <span v-else class="journal-muted">Nobody yet</span>
                </template>
              </BaseTableColumn>
            </BaseTable>
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
            <BaseEmptyState v-else title="No preview yet" description="Choose a report type and period, then run a preview to see what will be exported." action-label="Preview report" @action="loadPreview()" />
          </BaseCard>

          <BaseCard v-if="summary" title="Period snapshot" description="What the export will cover.">
            <div class="module-summary">
              <BaseStatusPill label="Audit safe" tone="success" />
              <!--
                Says which figures the period actually narrowed. Attendance and the
                two hour buckets are dated; the roster count is not, and pretending
                otherwise is what made this card misleading before.
              -->
              <p>
                {{ summary.attendanceTotal }} attendance entries
                {{ summary.rangeApplied ? 'in the selected period' : 'in the full record' }}:
                {{ summary.teamHours }}h of volunteer team hours and
                {{ summary.internshipHours }}h of FCT internship hours, tracked separately.
              </p>
              <p class="type-meta">{{ summary.activeStudents }} active members on the roster today (not period-scoped).</p>
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
  color: var(--foreground-muted);
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

.delivery-link {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
}

.delivery-link__name {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--foreground);
}

.delivery-link:hover .delivery-link__name {
  color: var(--primary);
}

.delivery-link__meta {
  font-size: var(--text-xs);
  color: var(--foreground-muted);
}

.journal-project {
  padding: 2px var(--space-2);
  border: var(--border-width) solid var(--info-border);
  border-radius: var(--radius-sm);
  background: var(--info-subtle);
  color: var(--info-foreground);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  cursor: pointer;
}

.journal-project:hover {
  border-color: var(--primary);
  color: var(--primary);
}
</style>
