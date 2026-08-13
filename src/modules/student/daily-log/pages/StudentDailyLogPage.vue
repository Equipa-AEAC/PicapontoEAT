<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";

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
import { CURRENT_MEMBER_ID } from "../../../../shared/constants";
import { useInternshipReportsStore } from "../../../../shared/stores";
import { listProjects } from "../../../../services/internshipReports.service";
import { todayIsoDate } from "../../../../shared/utils/date";
import type { DailyLogEntry, DailyLogFormValues, DailyLogStatus, Project } from "../../../../types/internshipReports";

const reportsStore = useInternshipReportsStore();
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
  { label: "All statuses", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Submitted", value: "submitted" },
];

const monthFilterOptions = computed(() => [
  { label: "All months", value: "all" },
  ...reportsStore.availableMonths.map((month) => ({ label: month, value: month })),
]);

/** Tagging the day against a project is optional — it is what the admin rolls up by. */
const projectOptions = computed(() => [
  { label: "No project", value: "" },
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

const dialogTitle = computed(() => (editingEntryId.value ? "Edit daily entry" : "New daily entry"));
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
    formErrors.date = "Use the YYYY-MM-DD format.";
    valid = false;
  } else {
    delete formErrors.date;
  }

  if (form.hours <= 0) {
    formErrors.hours = "Register the hours worked.";
    valid = false;
  } else {
    delete formErrors.hours;
  }

  if (!form.activities.trim()) {
    formErrors.activities = "Describe what you did.";
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
    ? await reportsStore.editDailyLog(CURRENT_MEMBER_ID, editingEntryId.value, { ...form })
    : await reportsStore.addDailyLog(CURRENT_MEMBER_ID, { ...form });

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
    await reportsStore.submitEntry(CURRENT_MEMBER_ID, pendingEntryId.value);
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
    await reportsStore.removeEntry(CURRENT_MEMBER_ID, pendingEntryId.value);
  }

  pendingEntryId.value = null;
  deleteConfirmVisible.value = false;
}

onMounted(async () => {
  const [, loadedProjects] = await Promise.all([reportsStore.loadJournal(CURRENT_MEMBER_ID), listProjects()]);
  projects.value = loadedProjects;
});
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      title="Daily Report"
      description="Register what you did each day. These entries feed your monthly reports and the final internship report."
    >
      <template #actions>
        <BaseButton label="Refresh" severity="secondary" outlined :loading="reportsStore.loading" @click="reportsStore.loadJournal(CURRENT_MEMBER_ID)" />
        <BaseButton label="New entry" @click="openCreateDialog()" />
      </template>
    </BasePageHeader>

    <section class="metric-grid">
      <BaseStatsCard label="Entries" :value="String(summary?.totalEntries ?? 0)" caption="Days registered in the journal" />
      <BaseStatsCard label="Submitted" :value="String(summary?.submittedEntries ?? 0)" caption="No longer editable" />
      <BaseStatsCard label="Registered hours" :value="String(summary?.totalHours ?? 0)" caption="Sum of every daily entry" />
      <BaseStatsCard label="Last entry" :value="summary?.lastEntryDate ?? '—'" caption="Most recent day written" />
    </section>

    <BaseToolbar>
      <template #left>
        <div class="filter-strip">
          <BaseSearchBar v-model="searchQuery" placeholder="Search your entries" />
          <BaseSelect v-model="monthFilter" :options="monthFilterOptions" />
          <BaseSelect v-model="statusFilter" :options="statusFilterOptions" />
        </div>
      </template>
      <template #right>
        <BaseStatusPill :label="`${reportsStore.draftEntries.length} drafts`" tone="warning" />
      </template>
    </BaseToolbar>

    <p v-if="reportsStore.errorMessage" class="form-error-banner">{{ reportsStore.errorMessage }}</p>

    <BaseLoading v-if="reportsStore.loading" />

    <BaseSection v-else title="Daily journal" description="Drafts can still be edited. Submitting an entry locks it for the orientador.">
      <BaseCard>
        <BaseTable :value="visibleEntries" dataKey="id" paginator :rows="10">
          <template #empty>
            <BaseEmptyState title="No entries yet" description="Register your first day to start building the journal." action-label="New entry" @action="openCreateDialog()" />
          </template>

          <BaseTableColumn field="date" header="Date" sortable />
          <BaseTableColumn field="hours" header="Hours" sortable />
          <BaseTableColumn header="Project">
            <template #body="slotProps">
              <BaseStatusPill v-if="projectNameFor(slotProps.data.projectId)" :label="projectNameFor(slotProps.data.projectId) ?? ''" tone="info" />
              <span v-else>—</span>
            </template>
          </BaseTableColumn>
          <BaseTableColumn field="activities" header="Activities" />
          <BaseTableColumn field="difficulties" header="Difficulties">
            <template #body="slotProps">{{ slotProps.data.difficulties || "—" }}</template>
          </BaseTableColumn>
          <BaseTableColumn header="Status">
            <template #body="slotProps">
              <BaseStatusPill :label="slotProps.data.status" :tone="slotProps.data.status === 'submitted' ? 'success' : 'warning'" />
            </template>
          </BaseTableColumn>
          <BaseTableColumn header="Actions">
            <template #body="slotProps">
              <div class="inline-actions">
                <BaseButton label="Edit" text size="small" :disabled="slotProps.data.status === 'submitted'" @click="openEditDialog(slotProps.data)" />
                <BaseButton label="Submit" text size="small" :disabled="slotProps.data.status === 'submitted'" @click="requestSubmitEntry(slotProps.data.id)" />
                <BaseButton label="Delete" text size="small" severity="danger" :disabled="slotProps.data.status === 'submitted'" @click="requestDelete(slotProps.data.id)" />
              </div>
            </template>
          </BaseTableColumn>
        </BaseTable>
      </BaseCard>
    </BaseSection>

    <BaseFormDialog
      :visible="formDialogVisible"
      :title="dialogTitle"
      subtitle="Describe the day the same way you would in the internship dossier."
      confirm-label="Save entry"
      :loading="reportsStore.saving"
      @update:visible="formDialogVisible = $event"
      @confirm="submitForm"
      @cancel="formDialogVisible = false"
    >
      <div class="settings-grid">
        <label>
          <span>Date *</span>
          <BaseTextInput v-model="form.date" placeholder="YYYY-MM-DD" />
          <small v-if="formErrors.date" class="student-form__error">{{ formErrors.date }}</small>
        </label>
        <label>
          <span>Hours worked *</span>
          <BaseInputNumber v-model="form.hours" :min="0" :max-fraction-digits="1" />
          <small v-if="formErrors.hours" class="student-form__error">{{ formErrors.hours }}</small>
        </label>
        <label class="settings-grid__wide">
          <span>Project</span>
          <BaseSelect v-model="projectSelection" :options="projectOptions" />
          <small class="student-form__hint">Optional, but it lets the club see how much time each project actually took.</small>
        </label>
        <label class="settings-grid__wide">
          <span>Activities carried out *</span>
          <BaseTextarea v-model="form.activities" rows="3" auto-resize />
          <small v-if="formErrors.activities" class="student-form__error">{{ formErrors.activities }}</small>
        </label>
        <label class="settings-grid__wide">
          <span>New learnings</span>
          <BaseTextarea v-model="form.learnings" rows="2" auto-resize />
        </label>
        <label class="settings-grid__wide">
          <span>Difficulties felt</span>
          <BaseTextarea v-model="form.difficulties" rows="2" auto-resize />
        </label>
      </div>
    </BaseFormDialog>

    <BaseConfirmDialog
      :visible="submitConfirmVisible"
      title="Submit entry"
      message="Once submitted the entry can no longer be edited."
      severity="primary"
      @update:visible="submitConfirmVisible = $event"
      @confirm="confirmSubmitEntry"
      @cancel="submitConfirmVisible = false"
    />

    <BaseConfirmDialog
      :visible="deleteConfirmVisible"
      title="Delete entry"
      message="This daily entry will be removed from your journal."
      severity="danger"
      @update:visible="deleteConfirmVisible = $event"
      @confirm="confirmDelete"
      @cancel="deleteConfirmVisible = false"
    />
  </section>
</template>
