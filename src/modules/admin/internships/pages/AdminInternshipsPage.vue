<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { PhBriefcase, PhSealCheck, PhTimer, PhUsersThree } from "@phosphor-icons/vue";

import {
  BaseButton,
  BaseCard,
  BaseConfirmDialog,
  BaseEmptyState,
  BaseFormDialog,
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
import InternshipDetailsDialog from "../../../../components/internships/InternshipDetailsDialog.vue";
import { INTERNSHIP_HOST_ENTITY } from "../../../../shared/constants";
import {
  useInternshipReportsStore,
  useInternshipsStore,
  useMembersStore,
  useParticipationStore,
} from "../../../../shared/stores";
import type { InternshipFormValues, InternshipProgressUpdateValues, InternshipSummary } from "../../../../types/internships";
import { t } from "../../../../i18n";
import {
  internshipStatusLabel,
  internshipStatusOptions,
} from "../../../../i18n/vocabulary";

const router = useRouter();
const internshipsStore = useInternshipsStore();
const membersStore = useMembersStore();
const participationStore = useParticipationStore();
const reportsStore = useInternshipReportsStore();

const searchQuery = ref("");
const statusFilter = ref<"all" | InternshipSummary["status"]>("all");
const assignDialogVisible = ref(false);
const assignMemberId = ref<string | null>(null);
const progressDialogVisible = ref(false);
const detailsDialogVisible = ref(false);
const detailsStudentId = ref<string | null>(null);
const discardConfirmVisible = ref(false);
const activeProgressStudentId = ref<string | null>(null);

/**
 * Hours are not editable here any more.
 *
 * They are summed from the attendance inside the member's internship
 * participation periods, so a box asking an administrator to type hours would be
 * asking for a number the system would ignore. What a reviewer still decides is
 * the state of the placement and the note explaining it.
 */
const progressForm = reactive<InternshipProgressUpdateValues>({
  status: "active",
  notes: "",
});

const progressErrors = reactive<Partial<Record<keyof InternshipProgressUpdateValues, string>>>({});

const statusOptions = computed(() => [
  { label: t("common.filters.allStatuses"), value: "all" },
  ...internshipStatusOptions(),
]);

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
  const internship = internshipsStore.items.find((item) => item.studentId === studentId);

  activeProgressStudentId.value = studentId;
  progressForm.status = internship?.status ?? "active";
  progressForm.notes = internship?.notes ?? "";
  clearProgressErrors();
  progressDialogVisible.value = true;
}

/** The derived hours, shown so the reviewer can see what they are signing off. */
const progressInternship = computed(() =>
  internshipsStore.items.find((item) => item.studentId === activeProgressStudentId.value) ?? null,
);

/**
 * Open one placement in full, over the row it belongs to.
 *
 * "Open" used to load the internship into a card appended below the assignable-
 * members list at the bottom of the page — a button that, from where the reader
 * was looking, did nothing. Everything a reviewer needs now arrives in a modal:
 * the derived hours, the participation history behind them, the reports, and the
 * two actions worth taking from there.
 */
async function openInternshipDetails(studentId: string) {
  detailsStudentId.value = studentId;
  detailsDialogVisible.value = true;

  await Promise.all([
    internshipsStore.loadInternship(studentId),
    participationStore.load(studentId),
    reportsStore.loadStudentReports(studentId),
  ]);
}

const detailsOriginSchool = computed(
  () => (detailsStudentId.value ? memberFor(detailsStudentId.value)?.originSchool ?? "" : ""),
);

function openMemberRecord(studentId: string) {
  detailsDialogVisible.value = false;
  void router.push({ name: "member-details", params: { memberId: studentId } });
}

function openProgressFromDetails(studentId: string) {
  detailsDialogVisible.value = false;
  openProgressDialog(studentId);
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

/**
 * Certificates are requested by the member and approved on the Certificates page.
 *
 * This button used to produce a "preview" object — a filename and a sentence,
 * rendered in a card at the bottom of the page — that was neither a document nor
 * a record of anything. Generation now only happens as the consequence of an
 * approved request, so the honest action here is to go to the queue.
 */
function openCertificates() {
  void router.push({ name: "certificates" });
}

onMounted(async () => {
  await Promise.all([membersStore.loadMembers(), membersStore.loadAllMembers(), internshipsStore.loadInternships()]);
});
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      :title="$t('admin.internships.title')"
      :description="$t('admin.internships.pageDescription')"
    >
      <template #actions>
        <BaseButton :label="$t('common.actions.refresh')" severity="secondary" outlined :loading="internshipsStore.loading" @click="internshipsStore.loadInternships()" />
        <BaseButton :label="$t('admin.internships.assign')" :disabled="assignableMembers.length === 0" @click="openAssignDialog()" />
      </template>
    </BasePageHeader>

    <section class="metric-grid">
      <BaseStatsCard :label="$t('admin.internships.metricActive')" :value="String(activeCount)" :caption="$t('admin.internships.metricActiveCaption')" :icon="PhBriefcase" />
      <BaseStatsCard :label="$t('admin.internships.metricCompleted')" :value="String(completeCount)" :caption="$t('admin.internships.metricCompletedCaption')" :icon="PhSealCheck" />
      <BaseStatsCard :label="$t('admin.internships.metricHours')" :value="String(fctHoursLogged)" :caption="$t('admin.internships.metricHoursCaption')" :icon="PhTimer" />
      <BaseStatsCard :label="$t('admin.internships.metricExternal')" :value="String(externalCount)" :caption="$t('admin.internships.metricExternalCaption')" :icon="PhUsersThree" />
    </section>

    <BaseToolbar>
      <template #left>
        <div class="filter-strip">
          <BaseSearchBar v-model="searchQuery" :placeholder="$t('admin.internships.search')" />
          <BaseSelect v-model="statusFilter" :options="statusOptions" />
        </div>
      </template>
      <template #right>
        <BaseStatusPill :label="$t('admin.internships.hostLabel', { host: INTERNSHIP_HOST_ENTITY })" tone="info" />
      </template>
    </BaseToolbar>

    <p v-if="internshipsStore.errorMessage" class="form-error-banner">{{ internshipsStore.errorMessage }}</p>

    <BaseLoading v-if="internshipsStore.loading || membersStore.loading" />

    <template v-else>
      <BaseSection :title="$t('admin.internships.tableTitle')" :description="$t('admin.internships.tableDescription')">
        <BaseCard>
          <BaseTable :value="visibleInternships" dataKey="id" paginator :rows="8">
            <template #empty>
              <BaseEmptyState :title="$t('admin.internships.emptyTitle')" :description="$t('admin.internships.emptyDescription')" :action-label="$t('admin.internships.assign')" @action="openAssignDialog()" />
            </template>

            <BaseTableColumn :header="$t('admin.internships.colMember')" sortable field="studentName">
              <template #body="slotProps">
                <div class="cell-stack">
                  <strong>{{ slotProps.data.studentName }}</strong>
                  <small>{{ memberFor(slotProps.data.studentId)?.originSchool ?? INTERNSHIP_HOST_ENTITY }}</small>
                </div>
              </template>
            </BaseTableColumn>
            <BaseTableColumn field="orientador" :header="$t('admin.internships.colOrientador')" sortable />
            <BaseTableColumn field="monitor" :header="$t('admin.internships.colMonitor')" />
            <BaseTableColumn :header="$t('common.fields.hours')" sortable field="completedHours">
              <template #body="slotProps">
                <span>{{ slotProps.data.completedHours }} / {{ slotProps.data.requiredHours }}h</span>
              </template>
            </BaseTableColumn>
            <BaseTableColumn field="remainingHours" :header="$t('admin.internships.colRemaining')" sortable />
            <BaseTableColumn field="status" :header="$t('common.fields.status')">
              <template #body="slotProps">
                <BaseStatusPill
                  :label="internshipStatusLabel(slotProps.data.status)"
                  :tone="statusTone(slotProps.data.status)"
                />
              </template>
            </BaseTableColumn>
            <BaseTableColumn :header="$t('common.fields.actions')">
              <template #body="slotProps">
                <div class="inline-actions">
                  <BaseButton :label="$t('admin.internships.open')" text size="small" @click="openInternshipDetails(slotProps.data.studentId)" />
                  <BaseButton :label="$t('admin.internships.progress')" text size="small" @click="openProgressDialog(slotProps.data.studentId)" />
                  <BaseButton
                    :label="$t('admin.internships.certificates')"
                    text
                    size="small"
                    :disabled="slotProps.data.status !== 'complete'"
                    :title="$t('admin.internships.certificatesHint')"
                    @click="openCertificates()"
                  />
                </div>
              </template>
            </BaseTableColumn>
          </BaseTable>
        </BaseCard>
      </BaseSection>

      <BaseSection :title="$t('admin.internships.volunteersTitle')" :description="$t('admin.internships.volunteersDescription')">
        <BaseCard>
          <BaseEmptyState v-if="assignableMembers.length === 0" :title="$t('admin.internships.volunteersEmptyTitle')" :description="$t('admin.internships.volunteersEmptyDescription')" />
          <article v-for="member in assignableMembers" :key="member.id" class="list-row">
            <div>
              <strong>{{ member.fullName }}</strong>
              <p>
                {{
                  $t("admin.internships.volunteerLine", {
                    school: member.originSchool,
                    className: member.className || $t("admin.internships.noClass"),
                    hours: member.teamHours,
                  })
                }}
              </p>
            </div>
            <div class="inline-actions">
              <BaseStatusPill v-if="member.isExternal" :label="$t('admin.internships.external')" tone="warning" />
              <BaseStatusPill v-else :label="$t('admin.internships.teamMember')" tone="success" />
              <BaseButton :label="$t('admin.internships.assign')" severity="secondary" text @click="openAssignDialog(member.id)" />
            </div>
          </article>
        </BaseCard>
      </BaseSection>

    </template>

    <InternshipDetailsDialog
      :visible="detailsDialogVisible"
      :internship="internshipsStore.selectedInternship"
      :origin-school="detailsOriginSchool"
      :hours="participationStore.hours"
      :timeline="participationStore.timeline"
      :monthly-reports="reportsStore.monthlyReports"
      :final-report="reportsStore.finalReport"
      :loading="internshipsStore.loadingDetails"
      @update:visible="detailsDialogVisible = $event"
      @open-member="openMemberRecord"
      @update-progress="openProgressFromDetails"
    />

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
      :title="$t('admin.internships.updateTitle')"
      :subtitle="$t('admin.internships.updateSubtitle')"
      :confirm-label="$t('admin.internships.update')"
      :cancel-label="$t('common.actions.cancel')"
      :loading="internshipsStore.saving"
      @update:visible="progressDialogVisible = $event"
      @confirm="submitProgressForm"
      @cancel="requestCloseDialog"
    >
      <div class="settings-grid">
        <p v-if="progressInternship" class="settings-grid__wide type-meta">
          {{
            $t("admin.internships.progressNote", {
              done: progressInternship.completedHours,
              required: progressInternship.requiredHours,
            })
          }}
        </p>
        <label>
          <span>{{ $t("admin.internships.placementState") }}</span>
          <BaseSelect v-model="progressForm.status" :options="statusOptions.filter((option) => option.value !== 'all')" />
        </label>
        <label class="settings-grid__wide">
          <span>{{ $t("common.fields.notes") }}</span>
          <BaseTextInput v-model="progressForm.notes" />
        </label>
      </div>
    </BaseFormDialog>

    <BaseConfirmDialog
      :visible="discardConfirmVisible"
      :title="$t('admin.internships.discardTitle')"
      :message="$t('admin.internships.discardMessage')"
      severity="primary"
      @update:visible="discardConfirmVisible = $event"
      @confirm="confirmDiscard"
      @cancel="discardConfirmVisible = false"
    />
  </section>
</template>
