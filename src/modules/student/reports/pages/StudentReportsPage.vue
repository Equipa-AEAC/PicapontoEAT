<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { PhCalendarCheck, PhCheckCircle, PhLockSimple, PhPencilSimple, PhSealCheck } from "@phosphor-icons/vue";

import {
  BaseButton,
  BaseCard,
  BaseConfirmDialog,
  BaseDatePicker,
  BaseEmptyState,
  BaseLoading,
  BasePageHeader,
  BaseStatsCard,
  BaseStatusPill,
  BaseTable,
  BaseTableColumn,
  BaseTabs,
  BaseTextarea,
} from "../../../../shared/components/base";
import type { BaseTabItem } from "../../../../shared/components/base";
import ReportCreationDialog from "../../../../components/reports/ReportCreationDialog.vue";
import type {
  FinalReportRequest,
  MonthlyReportRequest,
} from "../../../../components/reports/ReportCreationDialog.vue";
import { useInternshipReportsStore, useInternshipsStore } from "../../../../shared/stores";
import type { FinalReportFormValues, MonthlyReport, MonthlyReportDraft } from "../../../../types/internshipReports";
import { REPORT_STATUS_TONES, reportIsEditable } from "../../../../types/internshipReports";
import { INTERNSHIP_HOST_ENTITY } from "../../../../shared/constants";
import { formatIsoDate, formatTimestamp } from "../../../../shared/utils/date";
import { useAuthStore } from "../../../../modules/authentication";
import { t } from "../../../../i18n";
import { reportStatusLabel } from "../../../../i18n/vocabulary";

/**
 * The student's internship reports.
 *
 * Three defects shaped this rewrite, and each rule below exists because of one:
 *
 * 1. **Creation had no beginning.** A month select and a "Generate from journal"
 *    button sat next to an always-open final-report form, with nothing saying
 *    the two were different documents. Creating one now starts from a dialog
 *    that asks which, then over what period.
 *
 * 2. **Generated content was silently editable.** The balance is assembled from
 *    what the student already wrote; presenting it in editable boxes invites
 *    rewriting the record of what happened without noticing. It now renders as a
 *    read-only preview, and editing is a deliberate act with its own button.
 *
 * 3. **A draft could not be reopened.** The history table's only action was
 *    "Submit", so a saved draft was as locked as an approved report — which made
 *    "Draft" a label rather than a state. A draft is editable here, and that is
 *    the one rule the whole lifecycle turns on.
 */
const authStore = useAuthStore();
const reportsStore = useInternshipReportsStore();
const internshipsStore = useInternshipsStore();

/**
 * The member whose data this page shows, resolved from the session.
 *
 * Falls back to an empty id rather than a hardcoded member: an empty id matches
 * nobody, so a session without a member sees nothing instead of somebody else's
 * records. This is a safe *default*, not authorization — see the note on
 * `authStore.currentMemberId`.
 */
const memberId = computed(() => authStore.currentMemberId ?? "");

const activeTab = ref("monthly");
const creationVisible = ref(false);
const submitMonthlyConfirmVisible = ref(false);
const submitFinalConfirmVisible = ref(false);
const pendingMonthlyReportId = ref<string | null>(null);

/* --------------------------------------------------------- Monthly draft */

/**
 * The balance being worked on, and whether its generated content is unlocked.
 *
 * `editing` starts false for a freshly generated preview and true when an
 * existing draft is reopened — the first is content the system produced and the
 * second is content the student already chose to write.
 */
const workingDraft = ref<MonthlyReportDraft | null>(null);
const workingReportId = ref<string | null>(null);
const editing = ref(false);
const plannedText = ref("");
const difficultiesText = ref("");
const activitiesText = ref("");

const finalForm = reactive<FinalReportFormValues>({
  periodStart: "",
  periodEnd: "",
  companyCharacterization: "",
  activitiesPerformed: "",
  difficulties: "",
  newLearnings: "",
  occurrences: "",
  other: "",
});

const finalReport = computed(() => reportsStore.finalReport);
const finalEditable = computed(() => (finalReport.value ? reportIsEditable(finalReport.value.status) : false));
const finalReturned = computed(() => finalReport.value?.status === "rejected");

const internship = computed(() => internshipsStore.selectedInternship);

const tabs = computed<BaseTabItem[]>(() => [
  {
    value: "monthly",
    label: t("student.reports.tabMonthly"),
    icon: PhCalendarCheck,
    badge: reportsStore.monthlyReports.length,
  },
  {
    value: "final",
    label: t("student.reports.tabFinal"),
    icon: PhSealCheck,
    badge: finalReport.value ? reportStatusLabel(finalReport.value.status) : undefined,
  },
]);

const draftCount = computed(() => reportsStore.monthlyReports.filter((report) => report.status === "draft").length);
const returnedCount = computed(
  () =>
    reportsStore.monthlyReports.filter((report) => report.status === "rejected").length +
    (finalReturned.value ? 1 : 0),
);

/** Bullet points, from the newline-separated text the editor works in. */
function toLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function loadDraftIntoEditor(draft: MonthlyReportDraft, reportId: string | null, startEditable: boolean) {
  workingDraft.value = draft;
  workingReportId.value = reportId;
  editing.value = startEditable;
  activitiesText.value = draft.activitiesCompleted.join("\n");
  plannedText.value = draft.activitiesPlanned.join("\n");
  difficultiesText.value = draft.mainDifficulties;
}

function closeEditor() {
  workingDraft.value = null;
  workingReportId.value = null;
  editing.value = false;
  reportsStore.clearMonthlyDraft();
}

/** Create: generate a fresh balance, shown read-only until the student unlocks it. */
async function createFromRequest(request: MonthlyReportRequest | FinalReportRequest) {
  if (request.kind === "monthly") {
    const draft = await reportsStore.prepareMonthlyDraft(memberId.value, request.month, {
      periodStart: request.periodStart,
      periodEnd: request.periodEnd,
    });

    if (draft) {
      loadDraftIntoEditor(draft, null, false);
      activeTab.value = "monthly";
      creationVisible.value = false;
    }

    return;
  }

  finalForm.periodStart = request.periodStart;
  finalForm.periodEnd = request.periodEnd;

  const suggestion = await reportsStore.suggestFinalReport(memberId.value, INTERNSHIP_HOST_ENTITY, {
    periodStart: request.periodStart,
    periodEnd: request.periodEnd,
  });

  Object.assign(finalForm, suggestion);
  activeTab.value = "final";
  creationVisible.value = false;
}

/** Continue a saved draft. Its content is the student's own, so it opens editable. */
function continueDraft(report: MonthlyReport) {
  loadDraftIntoEditor(
    {
      month: report.month,
      periodStart: report.periodStart,
      periodEnd: report.periodEnd,
      totalHours: report.totalHours,
      entriesCount: report.entriesCount,
      activitiesCompleted: report.activitiesCompleted,
      activitiesPlanned: report.activitiesPlanned,
      mainDifficulties: report.mainDifficulties,
    },
    report.id,
    true,
  );

  activeTab.value = "monthly";
}

/** Regenerate the balance for the open draft's period, from the journal as it stands now. */
async function regenerate() {
  if (!workingDraft.value) {
    return;
  }

  const draft = await reportsStore.prepareMonthlyDraft(memberId.value, workingDraft.value.month, {
    periodStart: workingDraft.value.periodStart,
    periodEnd: workingDraft.value.periodEnd,
  });

  if (draft) {
    loadDraftIntoEditor(draft, workingReportId.value, false);
  }
}

async function saveDraft() {
  if (!workingDraft.value) {
    return;
  }

  const saved = await reportsStore.persistMonthlyReport(memberId.value, {
    ...workingDraft.value,
    activitiesCompleted: toLines(activitiesText.value),
    activitiesPlanned: toLines(plannedText.value),
    mainDifficulties: difficultiesText.value,
  });

  if (saved) {
    closeEditor();
  }
}

function requestSubmitMonthly(reportId: string) {
  pendingMonthlyReportId.value = reportId;
  submitMonthlyConfirmVisible.value = true;
}

async function confirmSubmitMonthly() {
  if (pendingMonthlyReportId.value) {
    await reportsStore.submitMonthly(memberId.value, pendingMonthlyReportId.value);
  }

  pendingMonthlyReportId.value = null;
  submitMonthlyConfirmVisible.value = false;
}

async function reopenMonthly(reportId: string) {
  await reportsStore.reopenMonthly(memberId.value, reportId);
}

/* ----------------------------------------------------------- Final report */

function applyFinalReport() {
  const report = finalReport.value;

  if (!report) {
    return;
  }

  finalForm.periodStart = report.periodStart;
  finalForm.periodEnd = report.periodEnd;
  finalForm.companyCharacterization = report.companyCharacterization;
  finalForm.activitiesPerformed = report.activitiesPerformed;
  finalForm.difficulties = report.difficulties;
  finalForm.newLearnings = report.newLearnings;
  finalForm.occurrences = report.occurrences;
  finalForm.other = report.other;
}

async function prefillFinalFromJournal() {
  const suggestion = await reportsStore.suggestFinalReport(memberId.value, INTERNSHIP_HOST_ENTITY, {
    periodStart: finalForm.periodStart,
    periodEnd: finalForm.periodEnd,
  });

  Object.assign(finalForm, suggestion);
}

async function saveFinal() {
  await reportsStore.persistFinalReport(memberId.value, { ...finalForm });
}

async function confirmSubmitFinal() {
  await reportsStore.submitFinal(memberId.value);
  submitFinalConfirmVisible.value = false;
}

async function reopenFinal() {
  await reportsStore.reopenFinal(memberId.value);
}

watch(finalReport, applyFinalReport);

onMounted(async () => {
  await Promise.all([
    reportsStore.loadStudentReports(memberId.value),
    internshipsStore.loadInternship(memberId.value),
  ]);

  applyFinalReport();
});
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      :title="$t('student.reports.title')"
      :description="$t('student.reports.description')"
    >
      <template #actions>
        <BaseButton
:label="$t('common.actions.refresh')"
          severity="secondary"
          outlined
          :loading="reportsStore.loading"
          @click="reportsStore.loadStudentReports(memberId)"
        />
        <BaseButton :label="$t('student.reports.newReport')" @click="creationVisible = true" />
      </template>
    </BasePageHeader>

    <section class="metric-grid">
      <BaseStatsCard
        :label="$t('student.reports.metricEntries')"
        :value="String(reportsStore.journalSummary?.totalEntries ?? 0)"
        :caption="$t('student.reports.metricEntriesCaption')"
      />
      <BaseStatsCard
        :label="$t('student.reports.metricHours')"
        :value="String(reportsStore.journalSummary?.totalHours ?? 0)"
        :caption="$t('student.reports.metricHoursCaption')"
      />
      <BaseStatsCard
        :label="$t('student.reports.metricDrafts')"
        :value="String(draftCount)"
        :caption="
          draftCount ? $t('student.reports.metricDraftsCaption') : $t('student.reports.metricNoDrafts')
        "
      />
      <BaseStatsCard
        :label="$t('student.reports.metricReturned')"
        :value="String(returnedCount)"
        :caption="
          returnedCount
            ? $t('student.reports.metricReturnedCaption')
            : $t('student.reports.metricNothingReturned')
        "
      />
    </section>

    <p v-if="reportsStore.successMessage" class="form-success-banner">
      <PhCheckCircle weight="fill" />
      {{ reportsStore.successMessage }}
    </p>
    <p v-if="reportsStore.errorMessage" class="form-error-banner">{{ reportsStore.errorMessage }}</p>

    <BaseLoading v-if="reportsStore.loading && reportsStore.monthlyReports.length === 0" />

    <BaseTabs v-else v-model="activeTab" :tabs="tabs">
      <!-- ------------------------------------------------------ Monthly -->
      <template #monthly>
        <!--
          The editor only exists while something is being worked on. A permanent
          empty form is what made the old page read as one continuous document.
        -->
        <BaseCard
          v-if="workingDraft"
          :title="$t('student.reports.balanceTitle', { month: workingDraft.month })"
          :description="
            $t('student.reports.balanceDescription', {
              from: formatIsoDate(workingDraft.periodStart),
              to: formatIsoDate(workingDraft.periodEnd),
              entries: workingDraft.entriesCount,
              hours: $t('common.time.hoursShort', { count: workingDraft.totalHours }),
            })
          "
        >
          <template #header>
            <BaseStatusPill
              :label="editing ? $t('student.reports.editing') : $t('student.reports.generatedPreview')"
              :tone="editing ? 'warning' : 'info'"
            />
          </template>

          <p v-if="!editing" class="editor-note type-meta">
            <PhLockSimple weight="fill" />
            <i18n-t keypath="student.reports.generatedNote" tag="span">
              <template #edit>
                <strong>{{ $t("common.actions.edit") }}</strong>
              </template>
            </i18n-t>
          </p>

          <section class="editor-block">
            <p class="type-eyebrow editor-block__title">{{ $t("student.reports.activitiesDone") }}</p>

            <ul v-if="!editing && workingDraft.activitiesCompleted.length" class="bullet-list">
              <li v-for="(activity, index) in workingDraft.activitiesCompleted" :key="index">{{ activity }}</li>
            </ul>
            <BaseEmptyState
              v-else-if="!editing"
              :title="$t('student.reports.activitiesEmptyTitle')"
              :description="$t('student.reports.activitiesEmptyDescription')"
            />

            <BaseTextarea
              v-else
              v-model="activitiesText"
              rows="6"
              auto-resize
              :placeholder="$t('student.reports.onePerLine')"
            />
          </section>

          <section class="editor-block">
            <p class="type-eyebrow editor-block__title">{{ $t("student.reports.activitiesPlanned") }}</p>

            <ul v-if="!editing && toLines(plannedText).length" class="bullet-list">
              <li v-for="(activity, index) in toLines(plannedText)" :key="index">{{ activity }}</li>
            </ul>
            <p v-else-if="!editing" class="type-meta">{{ $t("student.reports.nothingPlanned") }}</p>

            <BaseTextarea
              v-else
              v-model="plannedText"
              rows="4"
              auto-resize
              :placeholder="$t('student.reports.onePerLine')"
            />
          </section>

          <section class="editor-block">
            <p class="type-eyebrow editor-block__title">{{ $t("student.reports.difficulties") }}</p>

            <p v-if="!editing" class="editor-text">{{ difficultiesText || "Nothing recorded." }}</p>
            <BaseTextarea v-else v-model="difficultiesText" rows="3" auto-resize />
          </section>

          <template #footer>
            <BaseButton :label="$t('student.reports.discard')" severity="secondary" text @click="closeEditor" />
            <BaseButton
              v-if="!editing"
              severity="secondary"
              outlined
              @click="editing = true"
            >
              <PhPencilSimple weight="bold" />
              {{ $t("common.actions.edit") }}
            </BaseButton>
            <BaseButton
              v-else
:label="$t('student.reports.regenerate')"
              severity="secondary"
              outlined
              :loading="reportsStore.loading"
              @click="regenerate"
            />
            <BaseButton :label="$t('student.reports.saveDraft')" :loading="reportsStore.saving" @click="saveDraft" />
          </template>
        </BaseCard>

        <BaseCard
          :title="$t('student.reports.listTitle')"
          :description="$t('student.reports.listDescription')"
        >
          <BaseTable :value="reportsStore.monthlyReports" dataKey="id" paginator :rows="8">
            <template #empty>
              <BaseEmptyState
                :title="$t('student.reports.listEmptyTitle')"
                :description="$t('student.reports.listEmptyDescription')"
                :action-label="$t('student.reports.newReport')"
                @action="creationVisible = true"
              />
            </template>

            <BaseTableColumn field="month" :header="$t('common.time.month')" sortable />
            <BaseTableColumn :header="$t('student.reports.colPeriod')">
              <template #body="slotProps">
                <span class="type-meta">
                  {{ formatIsoDate(slotProps.data.periodStart) }} – {{ formatIsoDate(slotProps.data.periodEnd) }}
                </span>
              </template>
            </BaseTableColumn>
            <BaseTableColumn field="entriesCount" :header="$t('student.reports.colEntries')" sortable />
            <BaseTableColumn :header="$t('common.fields.hours')" field="totalHours" sortable>
              <template #body="slotProps">
                {{ $t("common.time.hoursShort", { count: slotProps.data.totalHours }) }}
              </template>
            </BaseTableColumn>
            <BaseTableColumn :header="$t('common.fields.status')">
              <template #body="slotProps">
                <div class="cell-stack">
                  <BaseStatusPill
                    :label="reportStatusLabel((slotProps.data as MonthlyReport).status)"
                    :tone="REPORT_STATUS_TONES[(slotProps.data as MonthlyReport).status]"
                  />
                  <small v-if="slotProps.data.reviewNote">{{ slotProps.data.reviewNote }}</small>
                </div>
              </template>
            </BaseTableColumn>
            <BaseTableColumn field="submittedAt" :header="$t('student.reports.colSubmitted')">
              <template #body="slotProps">{{ formatTimestamp(slotProps.data.submittedAt) }}</template>
            </BaseTableColumn>
            <BaseTableColumn :header="$t('common.fields.actions')">
              <template #body="slotProps">
                <div class="inline-actions">
                  <!-- A draft is editable. That is the whole rule. -->
                  <BaseButton
                    v-if="slotProps.data.status === 'draft'"
:label="$t('student.reports.continueEditing')"
                    text
                    size="small"
                    @click="continueDraft(slotProps.data)"
                  />
                  <BaseButton
                    v-if="slotProps.data.status === 'draft'"
:label="$t('common.actions.submit')"
                    text
                    size="small"
                    @click="requestSubmitMonthly(slotProps.data.id)"
                  />
                  <BaseButton
                    v-if="slotProps.data.status === 'rejected'"
:label="$t('student.reports.reopenAndRevise')"
                    text
                    size="small"
                    :loading="reportsStore.saving"
                    @click="reopenMonthly(slotProps.data.id)"
                  />
                  <span v-if="slotProps.data.status === 'submitted'" class="type-meta">
                    {{ $t("student.reports.withReviewer") }}
                  </span>
                  <span v-if="slotProps.data.status === 'approved'" class="type-meta">
                    {{
                      $t("student.reports.approvedBy", {
                        name: slotProps.data.reviewedBy ?? $t("student.reports.theCoordinationTeam"),
                      })
                    }}
                  </span>
                </div>
              </template>
            </BaseTableColumn>
          </BaseTable>
        </BaseCard>
      </template>

      <!-- -------------------------------------------------------- Final -->
      <template #final>
        <BaseCard
          :title="$t('student.reports.finalTitle')"
          :description="$t('student.reports.finalDescription')"
        >
          <template #header>
            <BaseStatusPill
              v-if="finalReport"
              :label="reportStatusLabel(finalReport.status)"
              :tone="REPORT_STATUS_TONES[finalReport.status]"
            />
          </template>

          <p v-if="finalReturned" class="form-error-banner">
            {{
              $t("student.reports.finalReturned", {
                name: finalReport?.reviewedBy ?? $t("student.reports.theCoordinationTeam"),
                note: finalReport?.reviewNote || $t("student.reports.finalNoNote"),
              })
            }}
          </p>

          <p v-else-if="finalReport && !finalEditable" class="editor-note type-meta">
            <PhLockSimple weight="fill" />
            {{
              finalReport.status === "approved"
                ? $t("student.reports.finalApproved")
                : $t("student.reports.finalLocked")
            }}
          </p>

          <div class="settings-grid">
            <label>
              <span>{{ $t("student.reports.periodStarts") }}</span>
              <BaseDatePicker v-model="finalForm.periodStart" :disabled="!finalEditable" />
            </label>
            <label>
              <span>{{ $t("student.reports.periodEnds") }}</span>
              <BaseDatePicker v-model="finalForm.periodEnd" :disabled="!finalEditable" />
            </label>
            <p v-if="internship" class="settings-grid__wide type-meta">
              {{
                $t("student.reports.placementRuns", {
                  from: formatIsoDate(internship.startDate),
                  to: formatIsoDate(internship.endDate),
                  host: internship.hostEntity,
                })
              }}
            </p>
          </div>

          <label class="report-field">
            <span>{{ $t("student.reports.sectionCompany") }}</span>
            <BaseTextarea v-model="finalForm.companyCharacterization" rows="3" auto-resize :disabled="!finalEditable" />
          </label>

          <label class="report-field">
            <span>{{ $t("student.reports.sectionActivities") }}</span>
            <BaseTextarea v-model="finalForm.activitiesPerformed" rows="6" auto-resize :disabled="!finalEditable" />
          </label>

          <label class="report-field">
            <span>{{ $t("student.reports.sectionDifficulties") }}</span>
            <BaseTextarea v-model="finalForm.difficulties" rows="4" auto-resize :disabled="!finalEditable" />
          </label>

          <label class="report-field">
            <span>{{ $t("student.reports.sectionLearnings") }}</span>
            <BaseTextarea v-model="finalForm.newLearnings" rows="4" auto-resize :disabled="!finalEditable" />
          </label>

          <label class="report-field">
            <span>{{ $t("student.reports.sectionIncidents") }}</span>
            <BaseTextarea v-model="finalForm.occurrences" rows="3" auto-resize :disabled="!finalEditable" />
          </label>

          <label class="report-field">
            <span>{{ $t("student.reports.sectionOther") }}</span>
            <BaseTextarea v-model="finalForm.other" rows="3" auto-resize :disabled="!finalEditable" />
          </label>

          <template #footer>
            <BaseButton
              v-if="finalReturned"
:label="$t('student.reports.reopenAndRevise')"
              severity="secondary"
              outlined
              :loading="reportsStore.saving"
              @click="reopenFinal"
            />
            <template v-if="finalEditable">
              <BaseButton
:label="$t('student.reports.fillFromJournal')"
                severity="secondary"
                outlined
                :loading="reportsStore.loading"
                @click="prefillFinalFromJournal"
              />
              <BaseButton
                :label="$t('student.reports.saveDraft')"
                :loading="reportsStore.saving"
                @click="saveFinal"
              />
              <BaseButton
                :label="$t('student.reports.submitFinal')"
                severity="secondary"
                @click="submitFinalConfirmVisible = true"
              />
            </template>
          </template>
        </BaseCard>
      </template>
    </BaseTabs>

    <ReportCreationDialog
      :visible="creationVisible"
      :available-months="reportsStore.availableMonths"
      :months-with-report="reportsStore.monthlyReports.map((report) => report.month)"
      :internship-start="internship?.startDate ?? ''"
      :internship-end="internship?.endDate ?? ''"
      :final-report-locked="Boolean(finalReport && finalReport.status !== 'draft')"
      :busy="reportsStore.loading"
      @update:visible="creationVisible = $event"
      @create="createFromRequest"
    />

    <BaseConfirmDialog
      :visible="submitMonthlyConfirmVisible"
      :title="$t('student.reports.submitMonthlyTitle')"
      :message="$t('student.reports.submitMessage')"
      :confirm-label="$t('common.actions.submit')"
      :cancel-label="$t('common.actions.cancel')"
      severity="primary"
      @update:visible="submitMonthlyConfirmVisible = $event"
      @confirm="confirmSubmitMonthly"
      @cancel="submitMonthlyConfirmVisible = false"
    />

    <BaseConfirmDialog
      :visible="submitFinalConfirmVisible"
      :title="$t('student.reports.submitFinalTitle')"
      :message="$t('student.reports.submitMessage')"
      :confirm-label="$t('common.actions.submit')"
      :cancel-label="$t('common.actions.cancel')"
      severity="primary"
      @update:visible="submitFinalConfirmVisible = $event"
      @confirm="confirmSubmitFinal"
      @cancel="submitFinalConfirmVisible = false"
    />
  </section>
</template>

<style scoped>
.editor-note {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0 0 var(--space-4);
  padding: var(--space-2) var(--space-3);
  border: var(--border-width) solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
}

.editor-note svg {
  width: 14px;
  height: 14px;
  flex: none;
}

.editor-block:not(:first-of-type) {
  margin-top: var(--space-5);
  padding-top: var(--space-4);
  border-top: var(--border-width) solid var(--border-subtle);
}

.editor-block__title {
  margin: 0 0 var(--space-2);
  color: var(--foreground-secondary);
}

/*
 * Generated content reads as a list of what happened, which is what a bullet is
 * for. Rendering it in a textarea was the visual cue that made it look editable.
 */
.bullet-list {
  margin: 0;
  padding-left: var(--space-5);
  display: grid;
  gap: var(--space-1);
  font-size: var(--text-sm);
  color: var(--foreground);
}

.editor-text {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--foreground);
  white-space: pre-wrap;
}

.report-field {
  display: block;
  margin-top: var(--space-4);
}

.report-field > span {
  display: block;
  margin-bottom: var(--space-1);
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  color: var(--foreground-secondary);
}
</style>
