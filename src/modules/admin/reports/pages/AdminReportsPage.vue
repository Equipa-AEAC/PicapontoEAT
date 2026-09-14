<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  PhCalendarCheck,
  PhCheckCircle,
  PhClipboardText,
  PhDownloadSimple,
  PhFolders,
  PhNotePencil,
  PhSealCheck,
  PhTimer,
  PhTray,
  PhUsersThree,
  PhWarning,
} from "@phosphor-icons/vue";

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
  BaseTextarea,
  BaseTextInput,
  BaseToolbar,
} from "../../../../shared/components/base";
import BaseFormDialog from "../../../../components/base/BaseFormDialog.vue";
import type { BaseTabItem } from "../../../../shared/components/base";
import ProjectProgressBar from "../../../../components/projects/ProjectProgressBar.vue";
import {
  useAdminJournalStore,
  useDevicesStore,
  useInternshipReportsStore,
  useMembersStore,
  useProjectsStore,
} from "../../../../shared/stores";
import { exportReport, getReportSummary, previewReport } from "../../../../services/reports.service";
import type { ReportExportFormat, ReportFilterValues, ReportPreview, ReportSummary } from "../../../../types/reports";
import type {
  FinalReportSummary,
  MonthlyReportSummary,
  TeamJournalEntry,
} from "../../../../types/internshipReports";
import { REPORT_STATUS_TONES } from "../../../../types/internshipReports";
import { journalCoverageState } from "../../../../shared/types";
import { formatIsoDate, formatTimestamp } from "../../../../shared/utils/date";
import { t } from "../../../../i18n";
import {
  DAILY_LOG_STATUS_ORDER,
  dailyLogStatusLabel,
  reportStatusLabel,
  reportStatusOptions,
  reportTypeOptions,
} from "../../../../i18n/vocabulary";

const journalStore = useAdminJournalStore();
const reportsStore = useInternshipReportsStore();
const membersStore = useMembersStore();
const devicesStore = useDevicesStore();
const projectsStore = useProjectsStore();
const router = useRouter();

/**
 * Reports is first and foremost the desk internship reports arrive at.
 *
 * Monthly balances and the final Relatório de Estágio could be submitted and
 * nothing anywhere read them: `status` reached "submitted" and stopped, because
 * no surface could take it further. The journal feed, coverage and the exports
 * are still here — they are the operational reporting this page already did —
 * but they now sit behind the two queues somebody actually has to work through.
 */
const activeTab = ref("monthly-reports");
const selectedEntry = ref<TeamJournalEntry | null>(null);

const tabs = computed<BaseTabItem[]>(() => [
  {
    value: "monthly-reports",
    label: t("admin.reports.tabMonthly"),
    icon: PhTray,
    badge: reportsStore.monthlyAwaitingReview.length,
  },
  {
    value: "final-reports",
    label: t("admin.reports.tabFinal"),
    icon: PhSealCheck,
    badge: reportsStore.finalAwaitingReview.length,
  },
  { value: "activity", label: t("admin.reports.tabJournal"), icon: PhNotePencil, badge: journalStore.entries.length },
  { value: "coverage", label: t("admin.reports.tabCoverage"), icon: PhCalendarCheck, badge: journalStore.staleContributors.length },
  { value: "delivery", label: t("admin.reports.tabDelivery"), icon: PhFolders, badge: deliveryRows.value.length },
  { value: "exports", label: t("admin.reports.tabExports"), icon: PhDownloadSimple },
]);

/* --------------------------------------------------- Internship reports */

const reviewDialogVisible = ref(false);
const reviewDecision = ref<"approved" | "rejected">("approved");
const reviewNote = ref("");
const reviewMonthly = ref<MonthlyReportSummary | null>(null);
const reviewFinal = ref<FinalReportSummary | null>(null);

const statusFilterOptions = computed(() => [
  { label: t("common.state.all"), value: "all" },
  ...reportStatusOptions(),
]);

const reportMemberOptions = computed(() => [
  { label: t("common.filters.allMembers"), value: "all" },
  ...membersStore.allMembers.map((member) => ({ label: member.fullName, value: member.id })),
]);

function openMonthlyReview(report: MonthlyReportSummary, decision: "approved" | "rejected") {
  reportsStore.clearMessages();
  reviewMonthly.value = report;
  reviewFinal.value = null;
  reviewDecision.value = decision;
  reviewNote.value = "";
  reviewDialogVisible.value = true;
}

function openFinalReview(report: FinalReportSummary, decision: "approved" | "rejected") {
  reportsStore.clearMessages();
  reviewFinal.value = report;
  reviewMonthly.value = null;
  reviewDecision.value = decision;
  reviewNote.value = "";
  reviewDialogVisible.value = true;
}

const reviewSubject = computed(() => {
  if (reviewMonthly.value) {
    return t("admin.reports.reviewMonthlyTitle", {
      name: reviewMonthly.value.memberName,
      month: reviewMonthly.value.month,
    });
  }

  if (reviewFinal.value) {
    return t("admin.reports.reviewFinalTitle", { name: reviewFinal.value.memberName });
  }

  return "";
});

async function submitReview() {
  const values = { decision: reviewDecision.value, note: reviewNote.value };

  const resolved = reviewMonthly.value
    ? await reportsStore.reviewMonthly(reviewMonthly.value.id, values)
    : reviewFinal.value
      ? await reportsStore.reviewFinal(reviewFinal.value.studentId, values)
      : false;

  if (resolved) {
    reviewDialogVisible.value = false;
    reviewMonthly.value = null;
    reviewFinal.value = null;
  }
}

async function reloadReviewQueues() {
  await reportsStore.loadReviewQueues();
}

/* ---------------------------------------------------------------- Activity */

const statusOptions = computed(() => [
  { label: t("common.filters.allStatuses"), value: "all" },
  ...DAILY_LOG_STATUS_ORDER.map((status) => ({ label: dailyLogStatusLabel(status), value: status })),
]);

const memberFilterOptions = computed(() => [
  { label: t("common.filters.allMembers"), value: "all" },
  ...membersStore.allMembers.map((member) => ({ label: member.fullName, value: member.id })),
]);

const projectFilterOptions = computed(() => [
  { label: t("common.filters.allProjects"), value: "all" },
  ...journalStore.projects.map((project) => ({ label: project.name, value: project.id })),
]);

const monthFilterOptions = computed(() => [
  { label: t("common.filters.allMonths"), value: "all" },
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
  return t("common.time.daysAgoShort", { count: daysSinceLastEntry });
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
  { label: t("common.filters.allDevices"), value: "all" },
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
    loadError.value = error instanceof Error ? error.message : t("admin.reports.previewFailed");
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
    reportsStore.loadReviewQueues(),
  ]);
  await loadPreview();
});
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      :title="$t('admin.reports.title')"
      :description="$t('admin.reports.description')"
    >
      <template #actions>
        <BaseButton :label="$t('admin.reports.projectManagement')" severity="secondary" @click="router.push({ name: 'projects-overview' })" />
        <BaseButton :label="$t('common.actions.refresh')" severity="secondary" :loading="journalStore.loading" @click="journalStore.loadJournal()" />
      </template>
    </BasePageHeader>

    <section class="metric-grid">
      <BaseStatsCard :label="$t('admin.reports.metricEntries')" :value="String(journalStore.summary?.totalEntries ?? 0)" :caption="$t('admin.reports.metricEntriesCaption')" :icon="PhClipboardText" />
      <BaseStatsCard :label="$t('admin.reports.metricHours')" :value="`${journalStore.summary?.totalHours ?? 0}h`" :caption="$t('admin.reports.metricHoursCaption')" :icon="PhTimer" />
      <BaseStatsCard :label="$t('admin.reports.metricContributors')" :value="String(journalStore.summary?.contributors ?? 0)" :caption="$t('admin.reports.metricContributorsCaption')" :icon="PhUsersThree" />
      <!-- The count is only useful if it leads to the names behind it. -->
      <BaseStatsCard
        :label="$t('admin.reports.metricBehind')"
        :value="String(journalStore.staleContributors.length)"
        :caption="$t('admin.reports.metricBehindCaption')"
        :icon="PhWarning"
        interactive
        :action-hint="$t('admin.reports.showBehindInterns')"
        @action="activeTab = 'coverage'"
      />
    </section>

    <p v-if="reportsStore.successMessage" class="form-success-banner">
      <PhCheckCircle weight="fill" />
      {{ reportsStore.successMessage }}
    </p>

    <p v-if="journalStore.errorMessage" class="form-error-banner">{{ journalStore.errorMessage }}</p>

    <BaseTabs v-model="activeTab" :tabs="tabs">
      <!-- ------------------------------------------------ Monthly reports -->
      <template #monthly-reports>
        <BaseToolbar>
          <template #left>
            <div class="filter-strip">
              <BaseSelect
                v-model="reportsStore.reviewFilters.status"
                :options="statusFilterOptions"
                @update:model-value="reloadReviewQueues"
              />
              <BaseSelect
                v-model="reportsStore.reviewFilters.memberId"
                :options="reportMemberOptions"
                @update:model-value="reloadReviewQueues"
              />
            </div>
          </template>
          <template #right>
            <BaseStatusPill
              :label="
            $t('admin.reports.waitingForReview', { count: reportsStore.monthlyAwaitingReview.length })
          "
              :tone="reportsStore.monthlyAwaitingReview.length > 0 ? 'warning' : 'success'"
            />
          </template>
        </BaseToolbar>

        <BaseSection
          :title="$t('admin.reports.monthlyTitle')"
          :description="$t('admin.reports.monthlyDescription')"
        >
          <BaseCard>
            <BaseTable :value="reportsStore.allMonthlyReports" dataKey="id" paginator :rows="8">
              <template #empty>
                <BaseEmptyState
                  :title="$t('admin.reports.monthlyEmptyTitle')"
                  :description="$t('admin.reports.monthlyEmptyDescription')"
                />
              </template>

              <BaseTableColumn :header="$t('admin.reports.colMember')" field="memberName" sortable>
                <template #body="{ data }">
                  <div class="cell-stack">
                    <strong>{{ (data as MonthlyReportSummary).memberName }}</strong>
                    <small>{{ (data as MonthlyReportSummary).originSchool }}</small>
                  </div>
                </template>
              </BaseTableColumn>

              <BaseTableColumn :header="$t('admin.reports.colPeriod')" field="month" sortable>
                <template #body="{ data }">
                  <div class="cell-stack">
                    <span>{{ (data as MonthlyReportSummary).month }}</span>
                    <small>
                      {{ formatIsoDate((data as MonthlyReportSummary).periodStart) }} to
                      {{ formatIsoDate((data as MonthlyReportSummary).periodEnd) }}
                    </small>
                  </div>
                </template>
              </BaseTableColumn>

              <BaseTableColumn :header="$t('admin.reports.colContent')" width="150px">
                <template #body="{ data }">
                  <span class="cell-stack">
                    <span class="type-numeric">{{ (data as MonthlyReportSummary).totalHours }}h</span>
                    <small>
                      {{ $t("admin.reports.entriesCount", { count: (data as MonthlyReportSummary).entriesCount }) }}
                    </small>
                  </span>
                </template>
              </BaseTableColumn>

              <BaseTableColumn :header="$t('common.fields.status')" width="170px">
                <template #body="{ data }">
                  <div class="cell-stack">
                    <BaseStatusPill
                      :label="reportStatusLabel((data as MonthlyReportSummary).status)"
                      :tone="REPORT_STATUS_TONES[(data as MonthlyReportSummary).status]"
                    />
                    <small v-if="(data as MonthlyReportSummary).reviewNote">
                      {{ (data as MonthlyReportSummary).reviewNote }}
                    </small>
                  </div>
                </template>
              </BaseTableColumn>

              <BaseTableColumn :header="$t('admin.reports.colSubmitted')" field="submittedAt" sortable>
                <template #body="{ data }">
                  {{ formatTimestamp((data as MonthlyReportSummary).submittedAt) }}
                </template>
              </BaseTableColumn>

              <BaseTableColumn :header="$t('common.fields.actions')">
                <template #body="{ data }">
                  <div class="inline-actions">
                    <!-- Only a submitted report is reviewable; a draft is still the student's. -->
                    <template v-if="(data as MonthlyReportSummary).status === 'submitted'">
                      <BaseButton
                        :label="$t('common.actions.approve')"
                        text
                        size="small"
                        @click="openMonthlyReview(data as MonthlyReportSummary, 'approved')"
                      />
                      <BaseButton
                        :label="$t('admin.reports.returnForRevision')"
                        text
                        size="small"
                        severity="danger"
                        @click="openMonthlyReview(data as MonthlyReportSummary, 'rejected')"
                      />
                    </template>
                    <span v-else-if="(data as MonthlyReportSummary).status === 'draft'" class="type-meta">
                      {{ $t("admin.reports.stillDraft") }}
                    </span>
                    <span v-else class="type-meta">
                      {{ (data as MonthlyReportSummary).reviewedBy ?? $t('admin.reports.reviewed') }}
                    </span>
                  </div>
                </template>
              </BaseTableColumn>
            </BaseTable>
          </BaseCard>
        </BaseSection>
      </template>

      <!-- -------------------------------------------------- Final reports -->
      <template #final-reports>
        <BaseSection
          :title="$t('admin.reports.finalTitle')"
          :description="$t('admin.reports.finalDescription')"
        >
          <BaseCard>
            <BaseTable :value="reportsStore.allFinalReports" dataKey="studentId" paginator :rows="8">
              <template #empty>
                <BaseEmptyState
                  :title="$t('admin.reports.finalEmptyTitle')"
                  :description="$t('admin.reports.finalEmptyDescription')"
                />
              </template>

              <BaseTableColumn :header="$t('admin.reports.colMember')" field="memberName" sortable>
                <template #body="{ data }">
                  <div class="cell-stack">
                    <strong>{{ (data as FinalReportSummary).memberName }}</strong>
                    <small>{{ (data as FinalReportSummary).originSchool }}</small>
                  </div>
                </template>
              </BaseTableColumn>

              <BaseTableColumn :header="$t('admin.reports.colPeriod')">
                <template #body="{ data }">
                  <span class="type-meta">
                    {{ formatIsoDate((data as FinalReportSummary).periodStart) }} to
                    {{ formatIsoDate((data as FinalReportSummary).periodEnd) }}
                  </span>
                </template>
              </BaseTableColumn>

              <BaseTableColumn :header="$t('common.fields.status')" width="170px">
                <template #body="{ data }">
                  <div class="cell-stack">
                    <BaseStatusPill
                      :label="reportStatusLabel((data as FinalReportSummary).status)"
                      :tone="REPORT_STATUS_TONES[(data as FinalReportSummary).status]"
                    />
                    <small v-if="(data as FinalReportSummary).reviewNote">
                      {{ (data as FinalReportSummary).reviewNote }}
                    </small>
                  </div>
                </template>
              </BaseTableColumn>

              <BaseTableColumn :header="$t('admin.reports.colSubmitted')" field="submittedAt" sortable>
                <template #body="{ data }">
                  {{ formatTimestamp((data as FinalReportSummary).submittedAt) }}
                </template>
              </BaseTableColumn>

              <BaseTableColumn :header="$t('common.fields.actions')">
                <template #body="{ data }">
                  <div class="inline-actions">
                    <template v-if="(data as FinalReportSummary).status === 'submitted'">
                      <BaseButton
                        :label="$t('common.actions.approve')"
                        text
                        size="small"
                        @click="openFinalReview(data as FinalReportSummary, 'approved')"
                      />
                      <BaseButton
                        :label="$t('admin.reports.returnForRevision')"
                        text
                        size="small"
                        severity="danger"
                        @click="openFinalReview(data as FinalReportSummary, 'rejected')"
                      />
                    </template>
                    <span v-else-if="(data as FinalReportSummary).status === 'draft'" class="type-meta">
                      {{ $t("admin.reports.stillDraft") }}
                    </span>
                    <span v-else class="type-meta">
                      {{ (data as FinalReportSummary).reviewedBy ?? $t('admin.reports.reviewed') }}
                    </span>
                  </div>
                </template>
              </BaseTableColumn>
            </BaseTable>
          </BaseCard>
        </BaseSection>
      </template>

      <!-- ------------------------------------------------------- Activity -->
      <template #activity>
        <BaseFilterPanel :title="$t('admin.reports.journalFiltersTitle')" :description="$t('admin.reports.journalFiltersDescription')">
          <div class="filter-strip">
            <BaseSearchBar v-model="journalStore.filters.query" :placeholder="$t('admin.reports.journalSearch')" />
            <BaseSelect v-model="journalStore.filters.memberId" :options="memberFilterOptions" />
            <BaseSelect v-model="journalStore.filters.projectId" :options="projectFilterOptions" />
            <BaseSelect v-model="journalStore.filters.month" :options="monthFilterOptions" />
            <BaseSelect v-model="journalStore.filters.status" :options="statusOptions" />
            <BaseButton :label="$t('common.actions.clearFilters')" severity="secondary" outlined :disabled="!hasJournalFilters" @click="clearJournalFilters" />
          </div>
        </BaseFilterPanel>

        <BaseLoading v-if="journalStore.loading" />

        <BaseSection v-else :title="$t('admin.reports.journalTitle')" :description="$t('admin.reports.journalDescription')">
          <BaseCard>
            <BaseTable :value="journalStore.entries" dataKey="id" paginator :rows="10" @rowClick="openEntry($event.data)">
              <template #empty>
                <BaseEmptyState
                  :title="$t('admin.reports.journalEmptyTitle')"
                  :description="$t('admin.reports.journalEmptyDescription')"
                  :action-label="$t('common.actions.clearFilters')"
                  @action="clearJournalFilters"
                />
              </template>

              <BaseTableColumn :header="$t('admin.reports.colMember')" field="memberName" sortable width="200px">
                <template #body="slotProps">
                  <div class="cell-stack">
                    <strong>{{ slotProps.data.memberName }}</strong>
                    <small v-if="slotProps.data.memberIsExternal">{{ $t("admin.reports.externalIntern") }}</small>
                  </div>
                </template>
              </BaseTableColumn>
              <BaseTableColumn field="date" :header="$t('common.time.date')" sortable width="120px" />
              <BaseTableColumn :header="$t('common.fields.hours')" field="hours" sortable width="90px">
                <template #body="slotProps">{{ slotProps.data.hours }}h</template>
              </BaseTableColumn>
              <BaseTableColumn :header="$t('admin.reports.colProject')" width="180px">
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
                  <span v-else class="journal-muted">{{ $t("admin.reports.noProject") }}</span>
                </template>
              </BaseTableColumn>
              <BaseTableColumn :header="$t('admin.reports.colActivities')">
                <template #body="slotProps">
                  <span class="journal-excerpt">{{ slotProps.data.activities }}</span>
                </template>
              </BaseTableColumn>
              <BaseTableColumn :header="$t('common.fields.status')" width="120px">
                <template #body="slotProps">
                  <BaseStatusPill
                    :label="dailyLogStatusLabel(slotProps.data.status)"
                    :tone="slotProps.data.status === 'submitted' ? 'success' : 'warning'"
                  />
                </template>
              </BaseTableColumn>
            </BaseTable>
          </BaseCard>
        </BaseSection>
      </template>

      <!-- ------------------------------------------------------- Coverage -->
      <template #coverage>
        <BaseSection
          :title="$t('admin.reports.coverageTitle')"
          :description="$t('admin.reports.coverageDescription')"
        >
          <BaseCard>
            <BaseTable :value="journalStore.summary?.coverage ?? []" dataKey="memberId" paginator :rows="10">
              <template #empty>
                <BaseEmptyState :title="$t('admin.reports.coverageEmptyTitle')" :description="$t('admin.reports.coverageEmptyDescription')" />
              </template>

              <BaseTableColumn :header="$t('admin.reports.colMember')" field="memberName" sortable>
                <template #body="slotProps">
                  <div class="cell-stack">
                    <strong>{{ slotProps.data.memberName }}</strong>
                    <small>
                      {{
                        slotProps.data.isIntern
                          ? $t('admin.reports.internJournalRequired')
                          : $t('admin.reports.memberJournalOptional')
                      }}
                    </small>
                  </div>
                </template>
              </BaseTableColumn>
              <BaseTableColumn field="entriesThisMonth" :header="$t('admin.reports.colEntriesMonth')" sortable />
              <BaseTableColumn :header="$t('admin.reports.colHoursMonth')" field="hoursThisMonth" sortable>
                <template #body="slotProps">{{ slotProps.data.hoursThisMonth }}h</template>
              </BaseTableColumn>
              <BaseTableColumn field="totalEntries" :header="$t('admin.reports.colTotalEntries')" sortable />
              <BaseTableColumn :header="$t('admin.reports.colTotalHours')" field="totalHours" sortable>
                <template #body="slotProps">{{ slotProps.data.totalHours }}h</template>
              </BaseTableColumn>
              <BaseTableColumn :header="$t('admin.reports.colLastEntry')" field="lastEntryDate" sortable>
                <template #body="slotProps">
                  <div class="cell-stack">
                    <span>{{ slotProps.data.lastEntryDate ?? '—' }}</span>
                    <small>{{ coverageLabel(slotProps.data.daysSinceLastEntry) }}</small>
                  </div>
                </template>
              </BaseTableColumn>
              <BaseTableColumn :header="$t('common.fields.status')" width="140px">
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
          :title="$t('admin.reports.deliveryTitle')"
          :description="$t('admin.reports.deliveryDescription')"
        >
          <BaseCard>
            <BaseEmptyState
              v-if="deliveryRows.length === 0"
              :title="$t('admin.reports.deliveryEmptyTitle')"
              :description="$t('admin.reports.deliveryEmptyDescription')"
              :action-label="$t('admin.reports.deliveryEmptyAction')"
              @action="router.push({ name: 'projects-overview' })"
            />

            <BaseTable v-else :value="deliveryRows" data-key="id">
              <BaseTableColumn :header="$t('admin.reports.colProject')">
                <template #body="{ data }">
                  <button type="button" class="delivery-link" @click="openProject((data as any).id)">
                    <span class="delivery-link__name">{{ (data as any).name }}</span>
                    <span class="delivery-link__meta">{{ (data as any).owner }}</span>
                  </button>
                </template>
              </BaseTableColumn>

              <BaseTableColumn :header="$t('admin.reports.colProgress')" width="170px">
                <template #body="{ data }">
                  <ProjectProgressBar :progress="(data as any).progress" />
                </template>
              </BaseTableColumn>

              <BaseTableColumn :header="$t('admin.reports.colTasksDone')" width="110px">
                <template #body="{ data }">
                  <span class="type-numeric">
                    {{ (data as any).progress.done }} / {{ (data as any).progress.total }}
                  </span>
                </template>
              </BaseTableColumn>

              <BaseTableColumn :header="$t('admin.reports.colOverdue')" width="100px">
                <template #body="{ data }">
                  <BaseStatusPill
                    v-if="(data as any).progress.overdue > 0"
                    :label="String((data as any).progress.overdue)"
                    tone="danger"
                  />
                  <span v-else class="journal-muted">—</span>
                </template>
              </BaseTableColumn>

              <BaseTableColumn :header="$t('admin.reports.colJournalHours')" width="130px">
                <template #body="{ data }">
                  <span class="cell-stack">
                    <span class="type-numeric">{{ (data as any).hours }}</span>
                    <small>{{ (data as any).entries }} {{ (data as any).entries === 1 ? 'entry' : 'entries' }}</small>
                  </span>
                </template>
              </BaseTableColumn>

              <BaseTableColumn :header="$t('admin.reports.colContributors')">
                <template #body="{ data }">
                  <span v-if="(data as any).contributors.length">{{ (data as any).contributors.join(', ') }}</span>
                  <span v-else class="journal-muted">{{ $t("admin.reports.nobodyYet") }}</span>
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
            <BaseStatusPill :label="downloadUrl ? $t('admin.reports.exportReady') : $t('admin.reports.noExportYet')" :tone="downloadUrl ? 'success' : 'info'" />
          </template>
          <template #right>
            <div class="inline-actions">
              <BaseButton :label="$t('admin.reports.previewReport')" severity="secondary" outlined :loading="exportLoading" @click="loadPreview" />
              <BaseButton :label="$t('admin.reports.exportReport')" :loading="exporting" @click="exportCurrentReport" />
              <BaseButton v-if="downloadUrl" :label="$t('admin.reports.openFile')" severity="secondary" outlined @click="openDownload" />
            </div>
          </template>
        </BaseToolbar>

        <BaseEmptyState
          v-if="loadError"
          :title="$t('admin.reports.unavailable')"
          :description="loadError"
          :action-label="$t('common.actions.retry')"
          @action="loadPreview()"
        />

        <BaseLoading v-else-if="exportLoading" />

        <div v-else class="dashboard-grid">
          <BaseCard :title="$t('admin.reports.reportFiltersTitle')" :description="$t('admin.reports.reportFiltersDescription')">
            <div class="settings-grid">
              <label>
                <span>Type</span>
                <BaseSelect v-model="form.type" :options="reportTypeOptions()" />
              </label>
              <label>
                <span>{{ $t("admin.reports.fieldFormat") }}</span>
                <BaseSelect v-model="form.format" :options="reportFormats" />
              </label>
              <label>
                <span>{{ $t("admin.reports.fieldScope") }}</span>
                <BaseTextInput v-model="form.scope" />
              </label>
              <label>
                <span>{{ $t("common.time.from") }}</span>
                <BaseDatePicker v-model="rangeStart" />
              </label>
              <label>
                <span>{{ $t("common.time.to") }}</span>
                <BaseDatePicker v-model="rangeEnd" />
              </label>
              <label>
                <span>{{ $t("admin.reports.fieldMember") }}</span>
                <BaseSelect v-model="form.studentId" :options="memberFilterOptions" />
              </label>
              <label>
                <span>{{ $t("admin.reports.fieldDevice") }}</span>
                <BaseSelect v-model="form.deviceId" :options="deviceOptions" />
              </label>
            </div>
          </BaseCard>

          <BaseCard :title="$t('admin.reports.previewTitle')" :description="$t('admin.reports.previewDescription')">
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
            <BaseEmptyState v-else :title="$t('admin.reports.previewEmptyTitle')" :description="$t('admin.reports.previewEmptyDescription')" :action-label="$t('admin.reports.previewReport')" @action="loadPreview()" />
          </BaseCard>

          <BaseCard v-if="summary" :title="$t('admin.reports.snapshotTitle')" :description="$t('admin.reports.snapshotDescription')">
            <div class="module-summary">
              <BaseStatusPill :label="$t('admin.reports.auditSafe')" tone="success" />
              <!--
                Says which figures the period actually narrowed. Attendance and the
                two hour buckets are dated; the roster count is not, and pretending
                otherwise is what made this card misleading before.
              -->
              <p>
                {{
                  $t("admin.reports.summaryAttendance", {
                    entries: summary.attendanceTotal,
                    scope: summary.rangeApplied
                      ? $t("admin.reports.scopeSelectedPeriod")
                      : $t("admin.reports.scopeFullRecord"),
                    team: summary.teamHours,
                    internship: summary.internshipHours,
                  })
                }}
              </p>
              <p class="type-meta">
                {{ $t("admin.reports.summaryRoster", { count: summary.activeStudents }) }}
              </p>
              <p>
                {{ $t("admin.reports.summaryJournal", { count: journalStore.summary?.entriesThisMonth ?? 0 }) }}
              </p>
            </div>
          </BaseCard>
        </div>
      </template>
    </BaseTabs>

    <BaseFormDialog
      :visible="reviewDialogVisible"
      :title="
        reviewDecision === 'approved'
          ? $t('admin.reports.approveReport')
          : $t('admin.reports.returnForRevision')
      "
      :subtitle="
        reviewDecision === 'approved'
          ? $t('admin.reports.approveApprovedHint')
          : $t('admin.reports.approveReturnHint')
      "
      :confirm-label="
        reviewDecision === 'approved'
          ? $t('common.actions.approve')
          : $t('admin.reports.returnForRevision')
      "
      :cancel-label="$t('common.actions.cancel')"
      :loading="reportsStore.saving"
      @update:visible="reviewDialogVisible = $event"
      @confirm="submitReview"
      @cancel="reviewDialogVisible = false"
    >
      <p v-if="reportsStore.errorMessage" class="form-error-banner">{{ reportsStore.errorMessage }}</p>

      <p class="type-body-secondary">{{ reviewSubject }}</p>

      <label class="review-field">
        <span>
          {{
            reviewDecision === "rejected"
              ? $t("admin.reports.reviewNoteRequired")
              : $t("admin.reports.reviewNoteOptional")
          }}
        </span>
        <BaseTextarea v-model="reviewNote" rows="4" auto-resize />
      </label>
    </BaseFormDialog>

    <BaseDialog :visible="Boolean(selectedEntry)" :header="$t('admin.reports.entryHeader')" @update:visible="selectedEntry = null">
      <div v-if="selectedEntry" class="module-summary">
        <BaseStatusPill
          :label="dailyLogStatusLabel(selectedEntry.status)"
          :tone="selectedEntry.status === 'submitted' ? 'success' : 'warning'"
        />
        <p><strong>{{ $t("admin.reports.entryMemberLabel") }}</strong> {{ selectedEntry.memberName }}</p>
        <p>
          <strong>{{ $t("admin.reports.entryDateLabel") }}</strong> {{ selectedEntry.date }} •
          <strong>{{ $t("admin.reports.entryHoursLabel") }}</strong> {{ selectedEntry.hours }}h
        </p>
        <p>
          <strong>{{ $t('admin.reports.entryProject') }}</strong>
          {{ selectedEntry.projectName ?? $t('admin.reports.noProject') }}
        </p>
        <p><strong>{{ $t("admin.reports.activitiesDone") }}</strong></p>
        <p>{{ selectedEntry.activities }}</p>
        <p><strong>{{ $t("admin.reports.learnings") }}</strong></p>
        <p>{{ selectedEntry.learnings || '—' }}</p>
        <p><strong>{{ $t("admin.reports.difficulties") }}</strong></p>
        <p>{{ selectedEntry.difficulties || '—' }}</p>
      </div>

      <template #footer>
        <div class="inline-actions inline-actions--end">
          <BaseButton :label="$t('common.actions.close')" severity="secondary" text @click="selectedEntry = null" />
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
