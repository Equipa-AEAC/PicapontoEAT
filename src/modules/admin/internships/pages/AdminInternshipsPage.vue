<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { PhBriefcase, PhSealCheck, PhTimer, PhUsersThree } from "@phosphor-icons/vue";

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
  BaseStatusPill,
  BaseStatsCard,
  BaseTable,
  BaseTableColumn,
  BaseTextInput,
  BaseToolbar,
} from "../../../../shared/components/base";
import InternshipFormDialog from "../../../../components/internships/InternshipFormDialog.vue";
import { INTERNSHIP_HOST_ENTITY } from "../../../../shared/constants";
import { useInternshipsStore, useMembersStore } from "../../../../shared/stores";
import type { InternshipFormValues, InternshipProgressUpdateValues, InternshipSummary } from "../../../../types/internships";

const internshipsStore = useInternshipsStore();
const membersStore = useMembersStore();

const searchQuery = ref("");
const statusFilter = ref<"all" | InternshipSummary["status"]>("all");
const assignDialogVisible = ref(false);
const assignMemberId = ref<string | null>(null);
const progressDialogVisible = ref(false);
const discardConfirmVisible = ref(false);
const activeProgressStudentId = ref<string | null>(null);

const progressForm = reactive<InternshipProgressUpdateValues>({
  completedHours: 0,
  notes: "",
});

const progressErrors = reactive<Partial<Record<keyof InternshipProgressUpdateValues, string>>>({});

const statusOptions = [
  { label: "All statuses", value: "all" },
  { label: "Planned", value: "planned" },
  { label: "Active", value: "active" },
  { label: "Paused", value: "paused" },
  { label: "Complete", value: "complete" },
];

/** Only members who are not already interns can be assigned an internship. */
const assignableMembers = computed(() =>
  membersStore.allMembers.filter((member) => !internshipsStore.items.some((internship) => internship.studentId === member.id)),
);

const visibleInternships = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  return internshipsStore.items.filter((internship) => {
    const matchesQuery =
      query.length === 0 ||
      [internship.studentName, internship.orientador, internship.monitor, internship.notes].join(" ").toLowerCase().includes(query);
    const matchesStatus = statusFilter.value === "all" || internship.status === statusFilter.value;
    return matchesQuery && matchesStatus;
  });
});

const activeCount = computed(() => internshipsStore.items.filter((item) => item.status === "active").length);
const completeCount = computed(() => internshipsStore.items.filter((item) => item.status === "complete").length);
const fctHoursLogged = computed(() => internshipsStore.totalCompletedHours);
const externalCount = computed(
  () =>
    internshipsStore.items.filter((internship) => membersStore.allMembers.find((member) => member.id === internship.studentId)?.isExternal)
      .length,
);

function statusTone(status: InternshipSummary["status"]) {
  if (status === "complete") return "success";
  if (status === "active") return "info";
  if (status === "paused") return "danger";
  return "warning";
}

function memberFor(studentId: string) {
  return membersStore.allMembers.find((member) => member.id === studentId) ?? null;
}

function clearProgressErrors() {
  Object.keys(progressErrors).forEach((key) => delete progressErrors[key as keyof InternshipProgressUpdateValues]);
}

function openAssignDialog(memberId?: string) {
  assignMemberId.value = memberId ?? null;
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
  void internshipsStore.loadInternship(studentId);
}

async function submitAssignForm(values: InternshipFormValues) {
  const succeeded = await internshipsStore.assignStudentInternship(values);

  if (succeeded) {
    await Promise.all([membersStore.loadMembers(), membersStore.loadAllMembers()]);
    assignDialogVisible.value = false;
    assignMemberId.value = null;
  }
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
  await membersStore.loadMembers();
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
  await Promise.all([membersStore.loadMembers(), membersStore.loadAllMembers(), internshipsStore.loadInternships()]);
});
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      title="Internships"
      description="FCT internships hosted by Equipa Técnica. Interns may be enrolled at another school; these hours are tracked separately from the volunteer team hours every member accumulates."
    >
      <template #actions>
        <BaseButton label="Refresh" severity="secondary" outlined :loading="internshipsStore.loading" @click="internshipsStore.loadInternships()" />
        <BaseButton label="Assign internship" :disabled="assignableMembers.length === 0" @click="openAssignDialog()" />
      </template>
    </BasePageHeader>

    <section class="metric-grid">
      <BaseStatsCard label="Active internships" :value="String(activeCount)" caption="Currently running FCT placements" :icon="PhBriefcase" />
      <BaseStatsCard label="Completed" :value="String(completeCount)" caption="Ready for the FCT certificate" :icon="PhSealCheck" />
      <BaseStatsCard label="FCT hours logged" :value="String(fctHoursLogged)" caption="Internship hours only" :icon="PhTimer" />
      <BaseStatsCard label="From other schools" :value="String(externalCount)" caption="Interns enrolled outside this school" :icon="PhUsersThree" />
    </section>

    <BaseToolbar>
      <template #left>
        <div class="filter-strip">
          <BaseSearchBar v-model="searchQuery" placeholder="Search by member, orientador or monitor" />
          <BaseSelect v-model="statusFilter" :options="statusOptions" />
        </div>
      </template>
      <template #right>
        <BaseStatusPill :label="`Host: ${INTERNSHIP_HOST_ENTITY}`" tone="info" />
      </template>
    </BaseToolbar>

    <p v-if="internshipsStore.errorMessage" class="form-error-banner">{{ internshipsStore.errorMessage }}</p>

    <BaseLoading v-if="internshipsStore.loading || membersStore.loading" />

    <template v-else>
      <BaseSection title="FCT internships" description="Only members carrying out an internship appear here.">
        <BaseCard>
          <BaseTable :value="visibleInternships" dataKey="id" paginator :rows="8">
            <template #empty>
              <BaseEmptyState title="No internships found" description="No member is carrying out an FCT internship yet." action-label="Assign internship" @action="openAssignDialog()" />
            </template>

            <BaseTableColumn header="Member" sortable field="studentName">
              <template #body="slotProps">
                <div class="cell-stack">
                  <strong>{{ slotProps.data.studentName }}</strong>
                  <small>{{ memberFor(slotProps.data.studentId)?.originSchool ?? INTERNSHIP_HOST_ENTITY }}</small>
                </div>
              </template>
            </BaseTableColumn>
            <BaseTableColumn field="orientador" header="Orientador de Estágio" sortable />
            <BaseTableColumn field="monitor" header="Monitor de Estágio" />
            <BaseTableColumn header="Hours" sortable field="completedHours">
              <template #body="slotProps">
                <span>{{ slotProps.data.completedHours }} / {{ slotProps.data.requiredHours }}h</span>
              </template>
            </BaseTableColumn>
            <BaseTableColumn field="remainingHours" header="Remaining" sortable />
            <BaseTableColumn field="status" header="Status">
              <template #body="slotProps">
                <BaseStatusPill :label="slotProps.data.status" :tone="statusTone(slotProps.data.status)" />
              </template>
            </BaseTableColumn>
            <BaseTableColumn header="Actions">
              <template #body="slotProps">
                <div class="inline-actions">
                  <BaseButton label="Open" text size="small" @click="openInternshipDetails(slotProps.data.studentId)" />
                  <BaseButton label="Progress" text size="small" @click="openProgressDialog(slotProps.data.studentId)" />
                  <BaseButton label="Certificate" text size="small" :disabled="slotProps.data.status !== 'complete'" @click="previewCertificate(slotProps.data.studentId)" />
                </div>
              </template>
            </BaseTableColumn>
          </BaseTable>
        </BaseCard>
      </BaseSection>

      <BaseSection title="Team members without an internship" description="Volunteers who help around and have projects assigned. They accrue team hours towards the surplus-hours certificate.">
        <BaseCard>
          <BaseEmptyState v-if="assignableMembers.length === 0" title="Everyone has an internship" description="Every member on the roster is currently carrying out an FCT internship." />
          <article v-for="member in assignableMembers" :key="member.id" class="list-row">
            <div>
              <strong>{{ member.fullName }}</strong>
              <p>{{ member.originSchool }} • {{ member.className || 'no class' }} • {{ member.teamHours }}h of team hours</p>
            </div>
            <div class="inline-actions">
              <BaseStatusPill v-if="member.isExternal" label="External" tone="warning" />
              <BaseStatusPill v-else label="Team member" tone="success" />
              <BaseButton label="Assign internship" severity="secondary" text @click="openAssignDialog(member.id)" />
            </div>
          </article>
        </BaseCard>
      </BaseSection>

      <BaseSection v-if="internshipsStore.selectedInternship || internshipsStore.certificatePreview" title="Details">
        <div class="dashboard-grid">
          <BaseCard v-if="internshipsStore.selectedInternship" title="Selected internship" description="Latest state loaded from the service layer.">
            <div class="module-summary">
              <BaseStatusPill :label="internshipsStore.selectedInternship.status" :tone="statusTone(internshipsStore.selectedInternship.status)" />
              <p><strong>Member:</strong> {{ internshipsStore.selectedInternship.studentName }}</p>
              <p><strong>Enrolled at:</strong> {{ memberFor(internshipsStore.selectedInternship.studentId)?.originSchool ?? INTERNSHIP_HOST_ENTITY }}</p>
              <p><strong>Host:</strong> {{ internshipsStore.selectedInternship.hostEntity }}</p>
              <p><strong>Orientador de Estágio:</strong> {{ internshipsStore.selectedInternship.orientador }}</p>
              <p><strong>Monitor de Estágio:</strong> {{ internshipsStore.selectedInternship.monitor }}</p>
              <p><strong>FCT hours:</strong> {{ internshipsStore.selectedInternship.completedHours }}/{{ internshipsStore.selectedInternship.requiredHours }}</p>
              <p><strong>Notes:</strong> {{ internshipsStore.selectedInternship.notes }}</p>
            </div>
          </BaseCard>

          <BaseCard v-if="internshipsStore.certificatePreview" title="Certificate preview" description="Mock output returned by the certificate generator.">
            <div class="module-summary">
              <p>{{ internshipsStore.certificatePreview.fileName }}</p>
              <p>{{ internshipsStore.certificatePreview.issuedAt }}</p>
              <p>{{ internshipsStore.certificatePreview.summary }}</p>
            </div>
          </BaseCard>
        </div>
      </BaseSection>
    </template>

    <InternshipFormDialog
      :visible="assignDialogVisible"
      :members="assignableMembers"
      :member-id="assignMemberId"
      :busy="internshipsStore.saving"
      :error-message="internshipsStore.errorMessage"
      @update:visible="assignDialogVisible = $event"
      @save="submitAssignForm"
      @cancel="requestCloseDialog"
    />

    <BaseFormDialog
      :visible="progressDialogVisible"
      title="Update internship progress"
      subtitle="Adds FCT internship hours only — volunteer team hours are counted separately."
      confirm-label="Update"
      :loading="internshipsStore.saving"
      @update:visible="progressDialogVisible = $event"
      @confirm="submitProgressForm"
      @cancel="requestCloseDialog"
    >
      <div class="settings-grid">
        <label>
          <span>Hours to add *</span>
          <BaseInputNumber v-model="progressForm.completedHours" :min="1" />
          <small v-if="progressErrors.completedHours" class="student-form__error">{{ progressErrors.completedHours }}</small>
        </label>
        <label class="settings-grid__wide">
          <span>Notes</span>
          <BaseTextInput v-model="progressForm.notes" />
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
