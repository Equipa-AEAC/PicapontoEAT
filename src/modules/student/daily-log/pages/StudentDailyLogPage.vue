<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute } from "vue-router";

import {
  BaseButton,
  BaseCard,
  BaseConfirmDialog,
  BaseEmptyState,
  BaseFormDialog,
  BaseInputNumber,
  BaseLoading,
  BasePageHeader,
  BaseSearchBar,
  BaseSection,
  BaseSelect,
  BaseStatsCard,
  BaseStatusPill,
  BaseTable,
  BaseTableColumn,
  BaseTextarea,
  BaseTextInput,
  BaseToolbar,
} from "../../../../shared/components/base";
import { useInternshipReportsStore } from "../../../../shared/stores";
import { listProjects } from "../../../../services/internshipReports.service";
import { formatIsoDate, todayIsoDate } from "../../../../shared/utils/date";
import { t } from "../../../../i18n";
import { DAILY_LOG_STATUS_ORDER, dailyLogStatusLabel } from "../../../../i18n/vocabulary";
import type { DailyLogEntry, DailyLogFormValues, DailyLogStatus, Project } from "../../../../types/internshipReports";
import { useAuthStore } from "../../../../modules/authentication";

const route = useRoute();
const authStore = useAuthStore();
const reportsStore = useInternshipReportsStore();

/**
 * The member whose data this page shows, resolved from the session.
 *
 * Falls back to an empty id rather than a hardcoded member: an empty id matches
 * nobody, so a session without a member sees nothing instead of somebody else's
 * records. This is a safe *default*, not authorization — see the note on
 * `authStore.currentMemberId`.
 */
const memberId = computed(() => authStore.currentMemberId ?? "");
const projects = ref<Project[]>([]);

const searchQuery = ref("");
const monthFilter = ref<string | "all">("all");
const statusFilter = ref<DailyLogStatus | "all">("all");
const formDialogVisible = ref(false);
const submitConfirmVisible = ref(false);
const deleteConfirmVisible = ref(false);
const editingEntryId = ref<string | null>(null);
const pendingEntryId = ref<string | null>(null);

const form = reactive<DailyLogFormValues>({
  date: "",
  hours: 0,
  projectId: null,
  activities: "",
  learnings: "",
  difficulties: "",
});

const formErrors = reactive<Partial<Record<keyof DailyLogFormValues, string>>>({});

const statusFilterOptions = [
  { label: t("student.dailyLog.allStatuses"), value: "all" },
  ...DAILY_LOG_STATUS_ORDER.map((status) => ({ label: dailyLogStatusLabel(status), value: status })),
];

const monthFilterOptions = computed(() => [
  { label: t("student.dailyLog.allMonths"), value: "all" },
  ...reportsStore.availableMonths.map((month) => ({ label: month, value: month })),
]);

/** Tagging the day against a project is optional — it is what the admin rolls up by. */
const projectOptions = computed(() => [
  { label: t("student.dailyLog.noProject"), value: "" },
  ...projects.value.map((project) => ({ label: project.name, value: project.id })),
]);

const projectSelection = computed({
  get: () => form.projectId ?? "",
  set: (value: string) => {
    form.projectId = value || null;
  },
});

function projectNameFor(projectId: string | null) {
  return projects.value.find((project) => project.id === projectId)?.name ?? null;
}

const visibleEntries = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();

  return reportsStore.dailyLogs.filter((entry) => {
    const matchesQuery = query.length === 0 || [entry.activities, entry.learnings, entry.difficulties].join(" ").toLowerCase().includes(query);
    const matchesMonth = monthFilter.value === "all" || entry.date.startsWith(monthFilter.value);
    const matchesStatus = statusFilter.value === "all" || entry.status === statusFilter.value;
    return matchesQuery && matchesMonth && matchesStatus;
  });
});

const dialogTitle = computed(() =>
  editingEntryId.value ? t("student.dailyLog.dialogEdit") : t("student.dailyLog.dialogNew"),
);
const summary = computed(() => reportsStore.journalSummary);

function clearErrors() {
  Object.keys(formErrors).forEach((key) => delete formErrors[key as keyof DailyLogFormValues]);
}

function openCreateDialog() {
  editingEntryId.value = null;
  form.date = todayIsoDate();
  form.hours = 0;
  form.projectId = null;
  form.activities = "";
  form.learnings = "";
  form.difficulties = "";
  clearErrors();
  formDialogVisible.value = true;
}

function openEditDialog(entry: DailyLogEntry) {
  editingEntryId.value = entry.id;
  form.date = entry.date;
  form.hours = entry.hours;
  form.projectId = entry.projectId;
  form.activities = entry.activities;
  form.learnings = entry.learnings;
  form.difficulties = entry.difficulties;
  clearErrors();
  formDialogVisible.value = true;
}

function validateForm() {
  let valid = true;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) {
    formErrors.date = t("errors.useIsoDate");
    valid = false;
  } else {
    delete formErrors.date;
  }

  if (form.hours <= 0) {
    formErrors.hours = t("errors.registerHours");
    valid = false;
  } else {
    delete formErrors.hours;
  }

  if (!form.activities.trim()) {
    formErrors.activities = t("errors.describeWork");
    valid = false;
  } else {
    delete formErrors.activities;
  }

  return valid;
}

async function submitForm() {
  if (!validateForm()) {
    return;
  }

  const succeeded = editingEntryId.value
    ? await reportsStore.editDailyLog(memberId.value, editingEntryId.value, { ...form })
    : await reportsStore.addDailyLog(memberId.value, { ...form });

  if (succeeded) {
    formDialogVisible.value = false;
  }
}

function requestSubmitEntry(entryId: string) {
  pendingEntryId.value = entryId;
  submitConfirmVisible.value = true;
}

async function confirmSubmitEntry() {
  if (pendingEntryId.value) {
    await reportsStore.submitEntry(memberId.value, pendingEntryId.value);
  }

  pendingEntryId.value = null;
  submitConfirmVisible.value = false;
}

function requestDelete(entryId: string) {
  pendingEntryId.value = entryId;
  deleteConfirmVisible.value = true;
}

async function confirmDelete() {
  if (pendingEntryId.value) {
    await reportsStore.removeEntry(memberId.value, pendingEntryId.value);
  }

  pendingEntryId.value = null;
  deleteConfirmVisible.value = false;
}

/**
 * Open on a specific day when the calendar sent us here.
 *
 * The calendar's "write this day's entry" action has to land on that day, not on
 * today — a member reviewing last Thursday who is handed a blank form dated
 * today will either write the wrong date or give up. If an entry already exists
 * for the day, it opens for editing instead of offering a duplicate the service
 * would refuse.
 */
function openRequestedDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return;
  }

  const existing = reportsStore.dailyLogs.find((entry) => entry.date === date);

  if (existing) {
    if (existing.status === "draft") {
      openEditDialog(existing);
    }

    // A submitted entry is not editable, so the list is where it can be read.
    monthFilter.value = date.slice(0, 7);
    return;
  }

  openCreateDialog();
  form.date = date;
}

onMounted(async () => {
  const [, loadedProjects] = await Promise.all([reportsStore.loadJournal(memberId.value), listProjects()]);
  projects.value = loadedProjects;

  const requestedDate = route.query.date;

  if (typeof requestedDate === "string") {
    openRequestedDate(requestedDate);
  }
});
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      :title="$t('student.dailyLog.title')"
      :description="$t('student.dailyLog.description')"
    >
      <template #actions>
        <BaseButton
          :label="$t('common.actions.refresh')"
          severity="secondary"
          outlined
          :loading="reportsStore.loading"
          @click="reportsStore.loadJournal(memberId)"
        />
        <BaseButton :label="$t('student.dailyLog.newEntry')" @click="openCreateDialog()" />
      </template>
    </BasePageHeader>

    <section class="metric-grid">
      <BaseStatsCard
        :label="$t('student.dailyLog.metricEntries')"
        :value="String(summary?.totalEntries ?? 0)"
        :caption="$t('student.dailyLog.metricEntriesCaption')"
      />
      <BaseStatsCard
        :label="$t('student.dailyLog.metricSubmitted')"
        :value="String(summary?.submittedEntries ?? 0)"
        :caption="$t('student.dailyLog.metricSubmittedCaption')"
      />
      <BaseStatsCard
        :label="$t('student.dailyLog.metricHours')"
        :value="String(summary?.totalHours ?? 0)"
        :caption="$t('student.dailyLog.metricHoursCaption')"
      />
      <BaseStatsCard
        :label="$t('student.dailyLog.metricLast')"
        :value="summary?.lastEntryDate ? formatIsoDate(summary.lastEntryDate) : '—'"
        :caption="$t('student.dailyLog.metricLastCaption')"
      />
    </section>

    <BaseToolbar>
      <template #left>
        <div class="filter-strip">
          <BaseSearchBar v-model="searchQuery" :placeholder="$t('student.dailyLog.search')" />
          <BaseSelect v-model="monthFilter" :options="monthFilterOptions" />
          <BaseSelect v-model="statusFilter" :options="statusFilterOptions" />
        </div>
      </template>
      <template #right>
        <BaseStatusPill :label="
            $t('student.dailyLog.draftCount', { count: reportsStore.draftEntries.length }, reportsStore.draftEntries.length)
          " tone="warning" />
      </template>
    </BaseToolbar>

    <p v-if="reportsStore.errorMessage" class="form-error-banner">{{ reportsStore.errorMessage }}</p>

    <BaseLoading v-if="reportsStore.loading" />

    <BaseSection
      v-else
      :title="$t('student.dailyLog.journalTitle')"
      :description="$t('student.dailyLog.journalDescription')"
    >
      <BaseCard>
        <BaseTable :value="visibleEntries" dataKey="id" paginator :rows="10">
          <template #empty>
            <BaseEmptyState
              :title="$t('student.dailyLog.emptyTitle')"
              :description="$t('student.dailyLog.emptyDescription')"
              :action-label="$t('student.dailyLog.newEntry')"
              @action="openCreateDialog()"
            />
          </template>

          <BaseTableColumn field="date" :header="$t('common.time.date')" sortable />
          <BaseTableColumn field="hours" :header="$t('common.fields.hours')" sortable />
          <BaseTableColumn :header="$t('student.dailyLog.colProject')">
            <template #body="slotProps">
              <BaseStatusPill v-if="projectNameFor(slotProps.data.projectId)" :label="projectNameFor(slotProps.data.projectId) ?? ''" tone="info" />
              <span v-else>—</span>
            </template>
          </BaseTableColumn>
          <BaseTableColumn field="activities" :header="$t('student.dailyLog.colActivities')" />
          <BaseTableColumn field="difficulties" :header="$t('student.dailyLog.colDifficulties')">
            <template #body="slotProps">{{ slotProps.data.difficulties || "—" }}</template>
          </BaseTableColumn>
          <BaseTableColumn :header="$t('common.fields.status')">
            <template #body="slotProps">
              <BaseStatusPill :label="dailyLogStatusLabel(slotProps.data.status)"
                :tone="slotProps.data.status === 'submitted' ? 'success' : 'warning'" />
            </template>
          </BaseTableColumn>
          <BaseTableColumn :header="$t('common.fields.actions')">
            <template #body="slotProps">
              <div class="inline-actions">
                <BaseButton
                  :label="$t('common.actions.edit')"
                  text
                  size="small"
                  :disabled="slotProps.data.status === 'submitted'"
                  @click="openEditDialog(slotProps.data)"
                />
                <BaseButton
                  :label="$t('common.actions.submit')"
                  text
                  size="small"
                  :disabled="slotProps.data.status === 'submitted'"
                  @click="requestSubmitEntry(slotProps.data.id)"
                />
                <BaseButton
                  :label="$t('common.actions.delete')"
                  text
                  size="small"
                  severity="danger"
                  :disabled="slotProps.data.status === 'submitted'"
                  @click="requestDelete(slotProps.data.id)"
                />
              </div>
            </template>
          </BaseTableColumn>
        </BaseTable>
      </BaseCard>
    </BaseSection>

    <BaseFormDialog
      :visible="formDialogVisible"
      :title="dialogTitle"
      :subtitle="$t('student.dailyLog.dialogSubtitle')"
      :confirm-label="$t('student.dailyLog.dialogConfirm')"
      :cancel-label="$t('common.actions.cancel')"
      :loading="reportsStore.saving"
      @update:visible="formDialogVisible = $event"
      @confirm="submitForm"
      @cancel="formDialogVisible = false"
    >
      <div class="settings-grid">
        <label>
          <span>{{ $t("student.dailyLog.fieldDate") }}</span>
          <BaseTextInput v-model="form.date" placeholder="YYYY-MM-DD" />
          <small v-if="formErrors.date" class="student-form__error">{{ formErrors.date }}</small>
        </label>
        <label>
          <span>{{ $t("student.dailyLog.fieldHours") }}</span>
          <BaseInputNumber v-model="form.hours" :min="0" :max-fraction-digits="1" />
          <small v-if="formErrors.hours" class="student-form__error">{{ formErrors.hours }}</small>
        </label>
        <label class="settings-grid__wide">
          <span>{{ $t("student.dailyLog.fieldProject") }}</span>
          <BaseSelect v-model="projectSelection" :options="projectOptions" />
          <small class="student-form__hint">{{ $t("student.dailyLog.projectHint") }}</small>
        </label>
        <label class="settings-grid__wide">
          <span>{{ $t("student.dailyLog.fieldActivities") }}</span>
          <BaseTextarea v-model="form.activities" rows="3" auto-resize />
          <small v-if="formErrors.activities" class="student-form__error">{{ formErrors.activities }}</small>
        </label>
        <label class="settings-grid__wide">
          <span>{{ $t("student.dailyLog.fieldLearnings") }}</span>
          <BaseTextarea v-model="form.learnings" rows="2" auto-resize />
        </label>
        <label class="settings-grid__wide">
          <span>{{ $t("student.dailyLog.fieldDifficulties") }}</span>
          <BaseTextarea v-model="form.difficulties" rows="2" auto-resize />
        </label>
      </div>
    </BaseFormDialog>

    <BaseConfirmDialog
      :visible="submitConfirmVisible"
      :title="$t('student.dailyLog.submitTitle')"
      :message="$t('student.dailyLog.submitMessage')"
      :confirm-label="$t('common.actions.submit')"
      :cancel-label="$t('common.actions.cancel')"
      severity="primary"
      @update:visible="submitConfirmVisible = $event"
      @confirm="confirmSubmitEntry"
      @cancel="submitConfirmVisible = false"
    />

    <BaseConfirmDialog
      :visible="deleteConfirmVisible"
      :title="$t('student.dailyLog.deleteTitle')"
      :message="$t('student.dailyLog.deleteMessage')"
      :confirm-label="$t('common.actions.delete')"
      :cancel-label="$t('common.actions.cancel')"
      severity="danger"
      @update:visible="deleteConfirmVisible = $event"
      @confirm="confirmDelete"
      @cancel="deleteConfirmVisible = false"
    />
  </section>
</template>
