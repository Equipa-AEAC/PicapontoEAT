<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import Button from "primevue/button";
import Column from "primevue/column";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import Select from "primevue/select";

import {
  BaseCard,
  BaseConfirmDialog,
  BaseEmptyState,
  BaseFormDialog,
  BaseLoading,
  BasePageHeader,
  BaseSearchBar,
  BaseSection,
  BaseStatusPill,
  BaseStatsCard,
  BaseTable,
  BaseToolbar,
} from "../../../../shared/components/base";
import { useInternshipsStore, useMembersStore } from "../../../../shared/stores";
import type { InternshipFormValues, InternshipProgressUpdateValues, InternshipSummary } from "../../../../types/internships";

const internshipsStore = useInternshipsStore();
const membersStore = useMembersStore();
const searchQuery = ref("");
const statusFilter = ref<"all" | InternshipSummary["status"]>("all");
const selectedInternships = ref<InternshipSummary[]>([]);
const selectedInternshipId = ref<string | null>(null);
const assignDialogVisible = ref(false);
const progressDialogVisible = ref(false);
const discardConfirmVisible = ref(false);
const activeProgressStudentId = ref<string | null>(null);

const assignForm = reactive<InternshipFormValues>({
  studentId: "",
  requiredHours: 0,
  supervisor: "",
  startDate: "",
  endDate: "",
  status: "planned",
  notes: "",
});

const progressForm = reactive<InternshipProgressUpdateValues>({
  completedHours: 0,
  notes: "",
});

const assignErrors = reactive<Partial<Record<keyof InternshipFormValues, string>>>({});
const progressErrors = reactive<Partial<Record<keyof InternshipProgressUpdateValues, string>>>({});

const statusOptions = [
  { label: "All statuses", value: "all" },
  { label: "Planned", value: "planned" },
  { label: "Active", value: "active" },
  { label: "Paused", value: "paused" },
  { label: "Complete", value: "complete" },
];

const memberOptions = computed(() => membersStore.items.map((member) => ({ label: `${member.fullName} • ${member.memberNumber}`, value: member.id })));

const visibleInternships = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  return internshipsStore.items.filter((internship) => {
    const matchesQuery = query.length === 0 || [internship.studentName, internship.supervisor, internship.notes].join(" ").toLowerCase().includes(query);
    const matchesStatus = statusFilter.value === "all" || internship.status === statusFilter.value;
    return matchesQuery && matchesStatus;
  });
});

const activeCount = computed(() => internshipsStore.items.filter((item) => item.status === "active").length);
const completeCount = computed(() => internshipsStore.items.filter((item) => item.status === "complete").length);

function clearAssignErrors() {
  Object.keys(assignErrors).forEach((key) => delete assignErrors[key as keyof InternshipFormValues]);
}

function clearProgressErrors() {
  Object.keys(progressErrors).forEach((key) => delete progressErrors[key as keyof InternshipProgressUpdateValues]);
}

function openAssignDialog() {
  assignForm.studentId = memberOptions.value[0]?.value ?? "";
  assignForm.requiredHours = 240;
  assignForm.supervisor = "";
  assignForm.startDate = "";
  assignForm.endDate = "";
  assignForm.status = "planned";
  assignForm.notes = "";
  clearAssignErrors();
  assignDialogVisible.value = true;
}

function openProgressDialog(studentId: string) {
  activeProgressStudentId.value = studentId;
  progressForm.completedHours = 0;
  progressForm.notes = "";
  clearProgressErrors();
  progressDialogVisible.value = true;
}

function openInternshipDetails(studentId: string) {
  selectedInternshipId.value = studentId;
  void internshipsStore.loadInternship(studentId);
}

function validateAssignForm() {
  let valid = true;

  if (!assignForm.studentId) {
    assignErrors.studentId = "Select a member.";
    valid = false;
  } else {
    delete assignErrors.studentId;
  }

  if (!assignForm.supervisor.trim()) {
    assignErrors.supervisor = "Supervisor is required.";
    valid = false;
  } else {
    delete assignErrors.supervisor;
  }

  if (!assignForm.startDate) {
    assignErrors.startDate = "Start date is required.";
    valid = false;
  } else {
    delete assignErrors.startDate;
  }

  if (!assignForm.endDate) {
    assignErrors.endDate = "End date is required.";
    valid = false;
  } else {
    delete assignErrors.endDate;
  }

  if (assignForm.requiredHours <= 0) {
    assignErrors.requiredHours = "Required hours must be greater than zero.";
    valid = false;
  } else {
    delete assignErrors.requiredHours;
  }

  return valid;
}

async function submitAssignForm() {
  if (!validateAssignForm()) {
    return;
  }

  await internshipsStore.assignStudentInternship({ ...assignForm });
  assignDialogVisible.value = false;
}

function validateProgressForm() {
  if (progressForm.completedHours <= 0) {
    progressErrors.completedHours = "Enter a progress increment.";
    return false;
  }

  delete progressErrors.completedHours;
  return true;
}

async function submitProgressForm() {
  if (!activeProgressStudentId.value || !validateProgressForm()) {
    return;
  }

  await internshipsStore.updateProgress(activeProgressStudentId.value, { ...progressForm });
  progressDialogVisible.value = false;
}

function requestCloseDialog() {
  discardConfirmVisible.value = true;
}

function confirmDiscard() {
  discardConfirmVisible.value = false;
  assignDialogVisible.value = false;
  progressDialogVisible.value = false;
}

async function previewCertificate(studentId: string) {
  await internshipsStore.previewCertificate(studentId);
}

onMounted(async () => {
  await Promise.all([membersStore.loadMembers(), internshipsStore.loadInternships()]);
});
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      eyebrow="Admin workspace"
      title="Internships"
      description="Manage internship assignments, progress updates and certificate previews."
    >
      <template #actions>
        <Button label="Refresh" severity="secondary" outlined :loading="internshipsStore.loading" @click="internshipsStore.loadInternships()" />
        <Button label="Assign internship" @click="openAssignDialog()" />
      </template>
    </BasePageHeader>

    <section class="metric-grid">
      <BaseStatsCard label="Total internships" :value="String(internshipsStore.items.length)" caption="Loaded from the mock service" />
      <BaseStatsCard label="Active" :value="String(activeCount)" caption="Currently in progress" />
      <BaseStatsCard label="Complete" :value="String(completeCount)" caption="Finished internships" />
      <BaseStatsCard label="Completed hours" :value="String(internshipsStore.totalCompletedHours)" caption="Across all placements" />
    </section>

    <BaseToolbar>
      <template #left>
        <div class="filter-strip">
          <BaseSearchBar v-model="searchQuery" placeholder="Search internships" />
          <Select v-model="statusFilter" :options="statusOptions" optionLabel="label" optionValue="value" />
        </div>
      </template>
      <template #right>
        <Button label="Preview certificates" severity="secondary" outlined :disabled="selectedInternships.length === 0" @click="previewCertificate(selectedInternships[0].studentId)" />
      </template>
    </BaseToolbar>

    <BaseLoading v-if="internshipsStore.loading || membersStore.loading" />

    <BaseSection v-else title="Internship table" description="Search, inspect and update internship records.">
      <BaseCard>
        <BaseTable v-model:selection="selectedInternships" selectionMode="multiple" :value="visibleInternships" dataKey="id" paginator :rows="8">
          <template #empty>
            <BaseEmptyState title="No internships found" description="Adjust the filters or assign a new internship." action-label="Assign internship" @action="openAssignDialog()" />
          </template>

          <Column selectionMode="multiple" headerStyle="width: 3rem" />
          <Column field="studentName" header="Member" sortable />
          <Column field="supervisor" header="Supervisor" sortable />
          <Column field="requiredHours" header="Required" sortable />
          <Column field="completedHours" header="Completed" sortable />
          <Column field="remainingHours" header="Remaining" sortable />
          <Column field="status" header="Status">
            <template #body="slotProps">
              <BaseStatusPill :label="slotProps.data.status" :tone="slotProps.data.status === 'complete' ? 'success' : slotProps.data.status === 'active' ? 'info' : 'warning'" />
            </template>
          </Column>
          <Column header="Actions">
            <template #body="slotProps">
              <div class="inline-actions">
                <Button label="Open" text size="small" @click="openInternshipDetails(slotProps.data.studentId)" />
                <Button label="Progress" text size="small" @click="openProgressDialog(slotProps.data.studentId)" />
                <Button label="Certificate" text size="small" :disabled="slotProps.data.status !== 'complete'" @click="previewCertificate(slotProps.data.studentId)" />
              </div>
            </template>
          </Column>
        </BaseTable>
      </BaseCard>

      <BaseCard v-if="internshipsStore.selectedInternship" title="Selected internship" description="Latest state loaded from the mock service.">
        <div class="module-summary">
          <BaseStatusPill :label="internshipsStore.selectedInternship.status" :tone="internshipsStore.selectedInternship.status === 'complete' ? 'success' : internshipsStore.selectedInternship.status === 'active' ? 'info' : 'warning'" />
          <p><strong>Member:</strong> {{ internshipsStore.selectedInternship.studentName }}</p>
          <p><strong>Supervisor:</strong> {{ internshipsStore.selectedInternship.supervisor }}</p>
          <p><strong>Hours:</strong> {{ internshipsStore.selectedInternship.completedHours }}/{{ internshipsStore.selectedInternship.requiredHours }}</p>
          <p><strong>Notes:</strong> {{ internshipsStore.selectedInternship.notes }}</p>
        </div>
      </BaseCard>

      <BaseCard v-if="internshipsStore.certificatePreview" title="Certificate preview" description="Mock output returned by the preview generator.">
        <p>{{ internshipsStore.certificatePreview.fileName }}</p>
        <p>{{ internshipsStore.certificatePreview.issuedAt }}</p>
        <p>{{ internshipsStore.certificatePreview.summary }}</p>
      </BaseCard>
    </BaseSection>

    <BaseFormDialog
      :visible="assignDialogVisible"
      title="Assign internship"
      subtitle="Create a new internship assignment for a member."
      confirm-label="Assign"
      :loading="internshipsStore.saving"
      @update:visible="assignDialogVisible = $event"
      @confirm="submitAssignForm"
      @cancel="requestCloseDialog"
    >
      <div class="settings-grid">
        <label>
          <span>Member *</span>
          <Select v-model="assignForm.studentId" :options="memberOptions" optionLabel="label" optionValue="value" />
          <small v-if="assignErrors.studentId" class="student-form__error">{{ assignErrors.studentId }}</small>
        </label>
        <label>
          <span>Required hours *</span>
          <InputNumber v-model="assignForm.requiredHours" :min="1" />
          <small v-if="assignErrors.requiredHours" class="student-form__error">{{ assignErrors.requiredHours }}</small>
        </label>
        <label>
          <span>Supervisor *</span>
          <InputText v-model="assignForm.supervisor" />
          <small v-if="assignErrors.supervisor" class="student-form__error">{{ assignErrors.supervisor }}</small>
        </label>
        <label>
          <span>Status *</span>
          <Select v-model="assignForm.status" :options="statusOptions.slice(1)" optionLabel="label" optionValue="value" />
        </label>
        <label>
          <span>Start date *</span>
          <InputText v-model="assignForm.startDate" placeholder="YYYY-MM-DD" />
          <small v-if="assignErrors.startDate" class="student-form__error">{{ assignErrors.startDate }}</small>
        </label>
        <label>
          <span>End date *</span>
          <InputText v-model="assignForm.endDate" placeholder="YYYY-MM-DD" />
          <small v-if="assignErrors.endDate" class="student-form__error">{{ assignErrors.endDate }}</small>
        </label>
        <label class="settings-grid__wide">
          <span>Notes</span>
          <InputText v-model="assignForm.notes" />
        </label>
      </div>
    </BaseFormDialog>

    <BaseFormDialog
      :visible="progressDialogVisible"
      title="Update progress"
      subtitle="Add hours to the selected internship record."
      confirm-label="Update"
      :loading="internshipsStore.saving"
      @update:visible="progressDialogVisible = $event"
      @confirm="submitProgressForm"
      @cancel="requestCloseDialog"
    >
      <div class="settings-grid">
        <label>
          <span>Completed hours *</span>
          <InputNumber v-model="progressForm.completedHours" :min="1" />
          <small v-if="progressErrors.completedHours" class="student-form__error">{{ progressErrors.completedHours }}</small>
        </label>
        <label class="settings-grid__wide">
          <span>Notes</span>
          <InputText v-model="progressForm.notes" />
        </label>
      </div>
    </BaseFormDialog>

    <BaseConfirmDialog
      :visible="discardConfirmVisible"
      title="Discard changes"
      message="Any unsaved internship form changes will be lost."
      severity="primary"
      @update:visible="discardConfirmVisible = $event"
      @confirm="confirmDiscard"
      @cancel="discardConfirmVisible = false"
    />
  </section>
</template>