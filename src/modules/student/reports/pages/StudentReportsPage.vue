<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";

import {
  BaseButton,
  BaseCard,
  BaseConfirmDialog,
  BaseEmptyState,
  BaseLoading,
  BasePageHeader,
  BaseSection,
  BaseSelect,
  BaseStatsCard,
  BaseStatusPill,
  BaseTable,
  BaseTableColumn,
  BaseTextarea,
  BaseToolbar,
} from "../../../../shared/components/base";
import { CURRENT_MEMBER_ID } from "../../../../shared/constants";
import { useInternshipReportsStore } from "../../../../shared/stores";
import type { FinalReportFormValues, MonthlyReport, ReportStatus } from "../../../../types/internshipReports";

const reportsStore = useInternshipReportsStore();

const selectedMonth = ref<string | null>(null);
const plannedActivitiesText = ref("");
const difficultiesText = ref("");
const submitMonthlyConfirmVisible = ref(false);
const submitFinalConfirmVisible = ref(false);
const pendingMonthlyReportId = ref<string | null>(null);

const finalForm = reactive<FinalReportFormValues>({
  companyCharacterization: "",
  activitiesPerformed: "",
  difficulties: "",
  newLearnings: "",
  occurrences: "",
  other: "",
});

const statusTones: Record<ReportStatus, "success" | "warning" | "info"> = {
  approved: "success",
  submitted: "info",
  draft: "warning",
};

const monthOptions = computed(() => reportsStore.availableMonths.map((month) => ({ label: month, value: month })));
const draft = computed(() => reportsStore.monthlyDraft);
const finalReport = computed(() => reportsStore.finalReport);
const finalReportLocked = computed(() => finalReport.value?.status !== "draft");

const savedReportForMonth = computed<MonthlyReport | null>(
  () => reportsStore.monthlyReports.find((report) => report.month === selectedMonth.value) ?? null,
);

function toLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

async function generateDraft() {
  if (!selectedMonth.value) {
    return;
  }

  await reportsStore.prepareMonthlyDraft(CURRENT_MEMBER_ID, selectedMonth.value);
  plannedActivitiesText.value = (draft.value?.activitiesPlanned ?? []).join("\n");
  difficultiesText.value = draft.value?.mainDifficulties ?? "";
}

async function saveMonthlyDraft() {
  if (!draft.value) {
    return;
  }

  await reportsStore.persistMonthlyReport(CURRENT_MEMBER_ID, {
    ...draft.value,
    activitiesPlanned: toLines(plannedActivitiesText.value),
    mainDifficulties: difficultiesText.value,
  });
}

function requestSubmitMonthly(reportId: string) {
  pendingMonthlyReportId.value = reportId;
  submitMonthlyConfirmVisible.value = true;
}

async function confirmSubmitMonthly() {
  if (pendingMonthlyReportId.value) {
    await reportsStore.submitMonthly(CURRENT_MEMBER_ID, pendingMonthlyReportId.value);
  }

  pendingMonthlyReportId.value = null;
  submitMonthlyConfirmVisible.value = false;
}

function applyFinalReport() {
  if (!finalReport.value) {
    return;
  }

  finalForm.companyCharacterization = finalReport.value.companyCharacterization;
  finalForm.activitiesPerformed = finalReport.value.activitiesPerformed;
  finalForm.difficulties = finalReport.value.difficulties;
  finalForm.newLearnings = finalReport.value.newLearnings;
  finalForm.occurrences = finalReport.value.occurrences;
  finalForm.other = finalReport.value.other;
}

async function prefillFromJournal() {
  const suggestion = await reportsStore.suggestFinalReport(CURRENT_MEMBER_ID, "Escola Secundária Augusto Cabrita");
  Object.assign(finalForm, suggestion);
}

async function saveFinal() {
  await reportsStore.persistFinalReport(CURRENT_MEMBER_ID, { ...finalForm });
}

async function confirmSubmitFinal() {
  await reportsStore.submitFinal(CURRENT_MEMBER_ID);
  submitFinalConfirmVisible.value = false;
}

watch(finalReport, applyFinalReport);

onMounted(async () => {
  await Promise.all([
    reportsStore.loadJournal(CURRENT_MEMBER_ID),
    reportsStore.loadMonthlyReports(CURRENT_MEMBER_ID),
    reportsStore.loadFinalReport(CURRENT_MEMBER_ID),
  ]);

  selectedMonth.value = reportsStore.availableMonths[0] ?? null;
  applyFinalReport();
});
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      title="Internship Reports"
      description="Build your monthly balance and your final internship report from the daily entries you already wrote."
    >
      <template #actions>
        <BaseButton label="Refresh" severity="secondary" outlined :loading="reportsStore.loading" @click="reportsStore.loadMonthlyReports(CURRENT_MEMBER_ID)" />
      </template>
    </BasePageHeader>

    <section class="metric-grid">
      <BaseStatsCard label="Journal entries" :value="String(reportsStore.journalSummary?.totalEntries ?? 0)" caption="Source material for every report" />
      <BaseStatsCard label="Monthly reports" :value="String(reportsStore.monthlyReports.length)" caption="Generated so far" />
      <BaseStatsCard label="Registered hours" :value="String(reportsStore.journalSummary?.totalHours ?? 0)" caption="Sum of every daily entry" />
      <BaseStatsCard label="Final report" :value="finalReport?.status ?? '—'" caption="Relatório de Estágio status" />
    </section>

    <p v-if="reportsStore.errorMessage" class="form-error-banner">{{ reportsStore.errorMessage }}</p>

    <BaseLoading v-if="reportsStore.loading" />

    <template v-else>
      <BaseSection
        title="Monthly report"
        description="Balance of activities carried out against activities planned, following the Ficha de Evolução Intermédia."
      >
        <BaseToolbar>
          <template #left>
            <div class="filter-strip">
              <BaseSelect v-model="selectedMonth" :options="monthOptions" placeholder="Select a month" />
              <BaseButton label="Generate from journal" :disabled="!selectedMonth" :loading="reportsStore.loading" @click="generateDraft()" />
            </div>
          </template>
          <template #right>
            <BaseStatusPill v-if="savedReportForMonth" :label="savedReportForMonth.status" :tone="statusTones[savedReportForMonth.status]" />
          </template>
        </BaseToolbar>

        <BaseCard v-if="draft" title="Draft preview" description="Activities are collected automatically from your submitted daily entries.">
          <div class="report-summary">
            <p><strong>Period:</strong> {{ draft.periodStart }} → {{ draft.periodEnd }}</p>
            <p><strong>Entries:</strong> {{ draft.entriesCount }}</p>
            <p><strong>Hours:</strong> {{ draft.totalHours }}</p>
          </div>

          <h4 class="report-subtitle">Activities carried out</h4>
          <ul v-if="draft.activitiesCompleted.length > 0" class="report-list">
            <li v-for="(activity, index) in draft.activitiesCompleted" :key="index">{{ activity }}</li>
          </ul>
          <BaseEmptyState v-else title="No activities" description="No daily entries were found for the selected month." />

          <label class="report-field">
            <span>Activities planned for the next period</span>
            <BaseTextarea v-model="plannedActivitiesText" rows="4" auto-resize placeholder="One activity per line" />
          </label>

          <label class="report-field">
            <span>Main difficulties felt</span>
            <BaseTextarea v-model="difficultiesText" rows="3" auto-resize />
          </label>

          <div class="inline-actions">
            <BaseButton label="Save monthly report" :loading="reportsStore.saving" @click="saveMonthlyDraft()" />
          </div>
        </BaseCard>

        <BaseCard title="Submitted history" description="Monthly reports already generated for this internship.">
          <BaseTable :value="reportsStore.monthlyReports" dataKey="id" paginator :rows="6">
            <template #empty>
              <BaseEmptyState title="No monthly reports" description="Select a month and generate your first monthly balance." />
            </template>

            <BaseTableColumn field="month" header="Month" sortable />
            <BaseTableColumn field="entriesCount" header="Entries" sortable />
            <BaseTableColumn field="totalHours" header="Hours" sortable />
            <BaseTableColumn header="Status">
              <template #body="slotProps">
                <BaseStatusPill :label="slotProps.data.status" :tone="statusTones[slotProps.data.status as ReportStatus]" />
              </template>
            </BaseTableColumn>
            <BaseTableColumn field="submittedAt" header="Submitted">
              <template #body="slotProps">{{ slotProps.data.submittedAt ?? "—" }}</template>
            </BaseTableColumn>
            <BaseTableColumn header="Actions">
              <template #body="slotProps">
                <BaseButton label="Submit" text size="small" :disabled="slotProps.data.status !== 'draft'" @click="requestSubmitMonthly(slotProps.data.id)" />
              </template>
            </BaseTableColumn>
          </BaseTable>
        </BaseCard>
      </BaseSection>

      <BaseSection
        title="Final internship report"
        description="Section by section, following the Relatório de Estágio handed in at the end of the internship."
      >
        <BaseCard>
          <div class="inline-actions">
            <BaseButton label="Prefill from journal" severity="secondary" outlined :disabled="finalReportLocked" @click="prefillFromJournal()" />
            <BaseStatusPill v-if="finalReport" :label="finalReport.status" :tone="statusTones[finalReport.status]" />
          </div>

          <label class="report-field">
            <span>Caracterização da empresa</span>
            <BaseTextarea v-model="finalForm.companyCharacterization" rows="3" auto-resize :disabled="finalReportLocked" />
          </label>

          <label class="report-field">
            <span>Atividades realizadas no estágio</span>
            <BaseTextarea v-model="finalForm.activitiesPerformed" rows="6" auto-resize :disabled="finalReportLocked" />
          </label>

          <label class="report-field">
            <span>Dificuldades sentidas na concretização das atividades</span>
            <BaseTextarea v-model="finalForm.difficulties" rows="4" auto-resize :disabled="finalReportLocked" />
          </label>

          <label class="report-field">
            <span>Novas aprendizagens</span>
            <BaseTextarea v-model="finalForm.newLearnings" rows="4" auto-resize :disabled="finalReportLocked" />
          </label>

          <label class="report-field">
            <span>Ocorrências durante o estágio</span>
            <BaseTextarea v-model="finalForm.occurrences" rows="3" auto-resize :disabled="finalReportLocked" />
          </label>

          <label class="report-field">
            <span>Outros</span>
            <BaseTextarea v-model="finalForm.other" rows="3" auto-resize :disabled="finalReportLocked" />
          </label>

          <div class="inline-actions">
            <BaseButton label="Save draft" :loading="reportsStore.saving" :disabled="finalReportLocked" @click="saveFinal()" />
            <BaseButton label="Submit final report" severity="secondary" :disabled="finalReportLocked" @click="submitFinalConfirmVisible = true" />
          </div>
        </BaseCard>
      </BaseSection>
    </template>

    <BaseConfirmDialog
      :visible="submitMonthlyConfirmVisible"
      title="Submit monthly report"
      message="Once submitted the monthly report can no longer be edited."
      severity="primary"
      @update:visible="submitMonthlyConfirmVisible = $event"
      @confirm="confirmSubmitMonthly"
      @cancel="submitMonthlyConfirmVisible = false"
    />

    <BaseConfirmDialog
      :visible="submitFinalConfirmVisible"
      title="Submit final report"
      message="The final internship report will be locked and sent to your professor orientador."
      severity="primary"
      @update:visible="submitFinalConfirmVisible = $event"
      @confirm="confirmSubmitFinal"
      @cancel="submitFinalConfirmVisible = false"
    />
  </section>
</template>
