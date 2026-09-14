<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { PhCheckCircle, PhCreditCard, PhBriefcase, PhTimer, PhUsersThree } from "@phosphor-icons/vue";

import BaseAvatar from "../../../../components/base/BaseAvatar.vue";
import BaseBadge from "../../../../components/base/BaseBadge.vue";
import BaseButton from "../../../../components/base/BaseButton.vue";
import BaseConfirmDialog from "../../../../components/base/BaseConfirmDialog.vue";
import BaseEmptyState from "../../../../components/base/BaseEmptyState.vue";
import BaseFilterPanel from "../../../../components/base/BaseFilterPanel.vue";
import BaseMenu from "../../../../components/base/BaseMenu.vue";
import BasePageHeader from "../../../../components/base/BasePageHeader.vue";
import BaseSearchBar from "../../../../components/base/BaseSearchBar.vue";
import BaseCard from "../../../../components/base/BaseCard.vue";
import BaseFormDialog from "../../../../components/base/BaseFormDialog.vue";
import BaseSection from "../../../../components/base/BaseSection.vue";
import BaseTextarea from "../../../../components/base/BaseTextarea.vue";
import BaseSelect from "../../../../components/base/BaseSelect.vue";
import BaseStatsCard from "../../../../components/base/BaseStatsCard.vue";
import BaseTable from "../../../../components/base/BaseTable.vue";
import TableColumn from "../../../../components/base/TableColumn.vue";
import InternshipFormDialog from "../../../../components/internships/InternshipFormDialog.vue";
import StudentFormDialog from "../../../../components/students/StudentFormDialog.vue";
import { useCardsStore } from "../../../../stores/cards";
import { useInternshipsStore } from "../../../../stores/internships";
import { useMembersStore } from "../../../../stores/members";
import { useProfileChangeRequestsStore } from "../../../../stores/profileChangeRequests";
import type { ProfileChangeRequest } from "../../../../types/profileChangeRequests";
import {
  memberInternshipStatusLabel,
  memberStatusLabel,
  profileFieldLabel,
} from "../../../../i18n/vocabulary";
import { t } from "../../../../i18n";
import { memberStatusOptions } from "../../../../i18n/vocabulary";
import { formatRelativeTime } from "../../../../shared/utils/date";
import type { InternshipFormValues } from "../../../../types/internships";
import type { MemberDetails, MemberFormValues } from "../../../../types/members";

const router = useRouter();
const membersStore = useMembersStore();
const cardsStore = useCardsStore();
const internshipsStore = useInternshipsStore();
const profileRequestsStore = useProfileChangeRequestsStore();
const actionsMenu = ref();

/*
 * Profile change requests are reviewed here, not on a page of their own.
 *
 * The request is about a member's record, and the reviewer's first question is
 * "who is this and what does their record say" — which is the roster. A separate
 * page would mean holding a name in your head while you walked to it. It renders
 * only when something is waiting, so the roster is not permanently topped by an
 * empty panel.
 */
const reviewDialogVisible = ref(false);
const reviewRequest = ref<ProfileChangeRequest | null>(null);
const reviewDecision = ref<"approved" | "rejected">("approved");
const reviewNote = ref("");

function openReview(request: ProfileChangeRequest, decision: "approved" | "rejected") {
  profileRequestsStore.clearMessages();
  reviewRequest.value = request;
  reviewDecision.value = decision;
  reviewNote.value = "";
  reviewDialogVisible.value = true;
}

async function submitReview() {
  if (!reviewRequest.value) {
    return;
  }

  const resolved = await profileRequestsStore.resolve(
    reviewRequest.value.id,
    reviewDecision.value,
    reviewNote.value,
  );

  if (resolved) {
    reviewDialogVisible.value = false;
    reviewRequest.value = null;
    // Approving rewrites the member record, so the roster has to be re-read.
    await Promise.all([membersStore.loadMembers(), membersStore.loadAllMembers()]);
  }
}
const activeStudentId = ref<string | null>(null);
const isStudentFormVisible = ref(false);
const isDeleteVisible = ref(false);
const searchQuery = ref("");

// The create → internship handoff: after a member is created we ask one question
// and, on yes, hand straight over to the internship dialog the Internships page owns.
const internAskVisible = ref(false);
const internshipDialogVisible = ref(false);
const createdMemberId = ref<string | null>(null);
const createdMemberName = ref("");

const statusOptions = computed(() => [
  { label: t("common.filters.allStatuses"), value: "all" },
  ...memberStatusOptions(),
]);

const originOptions = computed(() => [
  { label: t("common.filters.allSchools"), value: "all" },
  { label: t("common.filters.thisSchool"), value: "internal" },
  { label: t("common.filters.otherSchools"), value: "external" },
]);

// Built from the *unfiltered* roster — deriving these from the filtered rows would
// make every other option disappear as soon as one filter was applied.
const courseOptions = computed(() => [
  { label: t("common.filters.allCourses"), value: "all" },
  ...Array.from(new Set(membersStore.allMembers.map((member) => member.course)))
    .filter((value) => String(value).trim().length > 0)
    .map((value) => ({ label: String(value), value: String(value) })),
]);

const yearOptions = computed(() => [
  { label: t("common.filters.allYears"), value: "all" },
  ...Array.from(new Set(membersStore.allMembers.map((member) => member.academicYear)))
    .filter((value) => String(value).trim().length > 0)
    .map((value) => ({ label: String(value), value: String(value) })),
]);

const hasActiveFilters = computed(
  () =>
    searchQuery.value.trim().length > 0 ||
    membersStore.filters.status !== "all" ||
    membersStore.filters.course !== "all" ||
    membersStore.filters.academicYear !== "all" ||
    membersStore.filters.origin !== "all",
);

const selectedMember = computed<MemberDetails | null>(() => membersStore.selectedMember ?? null);
const availableCardUids = computed(() => cardsStore.items.filter((card) => card.status === "available").map((card) => card.uid));

/** Members that do not already have an internship record. */
const assignableMembers = computed(() =>
  membersStore.allMembers.filter((member) => !internshipsStore.items.some((internship) => internship.studentId === member.id)),
);

const selectedMemberFormValues = computed<Partial<MemberFormValues> | null>(() => {
  if (!selectedMember.value) {
    return null;
  }

  return {
    photoUrl: selectedMember.value.photoUrl ?? "",
    memberNumber: selectedMember.value.memberNumber,
    fullName: selectedMember.value.fullName,
    email: selectedMember.value.email,
    phone: selectedMember.value.phone,
    originSchool: selectedMember.value.originSchool,
    course: selectedMember.value.course,
    className: selectedMember.value.className,
    academicYear: selectedMember.value.academicYear,
    birthDate: selectedMember.value.birthDate,
    emergencyContact: selectedMember.value.emergencyContact,
    assignedCardUid: selectedMember.value.assignedCardUid ?? "",
    status: selectedMember.value.status,
    notes: selectedMember.value.notes,
  };
});

let searchTimer: ReturnType<typeof setTimeout> | undefined;

/** Typing filters the list directly — there is no Apply step any more. */
watch(searchQuery, (value) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    membersStore.filters.query = value;
    void membersStore.loadMembers();
  }, 250);
});

watch(
  () => [membersStore.filters.status, membersStore.filters.course, membersStore.filters.academicYear, membersStore.filters.origin],
  () => {
    void membersStore.loadMembers();
  },
);

function clearFilters() {
  searchQuery.value = "";
  membersStore.resetFilters();
  void membersStore.loadMembers();
}

async function openMemberForm(memberId: string | null = null) {
  activeStudentId.value = memberId;
  if (memberId) {
    await membersStore.loadMember(memberId);
  } else {
    membersStore.selectedMember = null;
  }
  isStudentFormVisible.value = true;
}

function openDeleteConfirm(studentId: string) {
  activeStudentId.value = studentId;
  isDeleteVisible.value = true;
}

async function handleSaveMember(values: MemberFormValues) {
  const isCreate = !activeStudentId.value;
  const saved = await membersStore.persistMember(values, activeStudentId.value ?? undefined);
  isStudentFormVisible.value = false;

  if (isCreate && saved) {
    createdMemberId.value = saved.id;
    createdMemberName.value = saved.fullName;
    internAskVisible.value = true;
  }
}

function confirmInternHandoff() {
  internAskVisible.value = false;
  internshipDialogVisible.value = true;
}

function dismissInternHandoff() {
  internAskVisible.value = false;
  createdMemberId.value = null;
  createdMemberName.value = "";
}

async function handleAssignInternship(values: InternshipFormValues) {
  const succeeded = await internshipsStore.assignStudentInternship(values);

  if (succeeded) {
    internshipDialogVisible.value = false;
    createdMemberId.value = null;
    createdMemberName.value = "";
    await Promise.all([membersStore.loadMembers(), membersStore.loadAllMembers()]);
  }
}

async function handleDeleteMember() {
  if (!activeStudentId.value) {
    return;
  }

  await membersStore.removeMember(activeStudentId.value);
  isDeleteVisible.value = false;
  activeStudentId.value = null;
}

function goToMemberDetails(memberId: string) {
  router.push({ name: "member-details", params: { memberId } });
}

function goToMemberAttendanceHistory(memberId: string) {
  router.push({ name: "member-attendance-history", params: { memberId } });
}

function openMenu(event: Event, memberId: string) {
  activeStudentId.value = memberId;
  actionsMenu.value?.toggle(event);
}

/**
 * The roster's total volunteer hours.
 *
 * Rounded to one decimal on the way out. Summing floats produced
 * `210.70000000000002`, which overflowed the metric card and made a tidy figure
 * look like a system error. The stored hours are quarter-hours, so one decimal
 * loses nothing real.
 */
const totalTeamHours = computed(() =>
  String(
    Math.round(membersStore.allMembers.reduce((total, member) => total + member.teamHours, 0) * 10) / 10,
  ),
);

const memberActions = computed(() => [
  { label: t("admin.members.view"), command: () => activeStudentId.value && goToMemberDetails(activeStudentId.value) },
  { label: t("common.actions.edit"), command: () => activeStudentId.value && openMemberForm(activeStudentId.value) },
  { label: t("common.actions.delete"), command: () => activeStudentId.value && openDeleteConfirm(activeStudentId.value) },
  { label: t("admin.members.assignCard"), command: () => activeStudentId.value && openMemberForm(activeStudentId.value) },
  {
    label: t("admin.members.attendanceHistory"),
    command: () => activeStudentId.value && goToMemberAttendanceHistory(activeStudentId.value),
  },
  { label: t("admin.members.internship"), command: () => activeStudentId.value && goToMemberDetails(activeStudentId.value) },
]);

onMounted(async () => {
  membersStore.filters.query = searchQuery.value;
  await Promise.all([
    membersStore.loadMembers(),
    membersStore.loadAllMembers(),
    cardsStore.loadCards(),
    internshipsStore.loadInternships(),
    profileRequestsStore.loadQueue(),
  ]);
});
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      :title="$t('admin.members.title')"
      :description="$t('admin.members.description')"
    >
      <template #actions>
        <BaseButton :label="$t('admin.members.create')" @click="openMemberForm()" />
      </template>
    </BasePageHeader>

    <section class="metric-grid">
      <BaseStatsCard
        :label="$t('admin.members.metricTotal')"
        :value="String(membersStore.memberCount)"
        :caption="$t('admin.members.metricTotalCaption')"
        :icon="PhUsersThree"
      />
      <BaseStatsCard
        :label="$t('admin.members.metricTeamHours')"
        :value="totalTeamHours"
        :caption="$t('admin.members.metricTeamHoursCaption')"
        :icon="PhTimer"
      />
      <BaseStatsCard
        :label="$t('admin.members.metricInterns')"
        :value="String(membersStore.allMembers.filter((member) => member.internshipStatus !== 'not-assigned').length)"
        :caption="$t('admin.members.metricInternsCaption')"
        :icon="PhBriefcase"
      />
      <BaseStatsCard
        :label="$t('admin.members.metricCards')"
        :value="String(membersStore.allMembers.filter((member) => Boolean(member.assignedCardUid)).length)"
        :caption="$t('admin.members.metricCardsCaption')"
        :icon="PhCreditCard"
      />
    </section>

    <p v-if="profileRequestsStore.successMessage" class="form-success-banner">
      <PhCheckCircle weight="fill" />
      {{ profileRequestsStore.successMessage }}
    </p>
    <p v-if="profileRequestsStore.errorMessage && !reviewDialogVisible" class="form-error-banner">
      {{ profileRequestsStore.errorMessage }}
    </p>

    <!--
      Only when something is waiting. A permanently present empty panel above the
      roster would cost every reader a scroll to discover there was nothing in it.
    -->
    <BaseCard
      v-if="profileRequestsStore.requests.length > 0"
      :title="$t('admin.members.requestsTitle')"
      :description="$t('admin.members.requestsDescription')"
    >
      <ul class="request-queue">
        <li v-for="request in profileRequestsStore.requests" :key="request.id" class="request-queue__row">
          <div class="request-queue__main">
            <span class="request-queue__title">
              {{ request.memberName }} · {{ profileFieldLabel(request.field) }}
            </span>

            <!-- Current and requested side by side: this is the whole decision. -->
            <span class="request-queue__change type-meta">
              <template v-if="request.field !== 'photo'">
                {{ request.currentValue || $t("admin.members.nothingRecordedInline") }} →
                <strong>{{ request.requestedValue }}</strong>
              </template>
              <template v-else>{{ $t("admin.members.newProfilePicture") }}</template>
            </span>

            <span class="type-meta">{{ request.reason }}</span>
            <span class="type-meta">
              {{ $t("student.attendance.sent", { time: formatRelativeTime(request.createdAt) }) }}
            </span>
          </div>

          <img
            v-if="request.field === 'photo' && request.requestedValue"
            :src="request.requestedValue"
            :alt="$t('admin.members.requestedPhotoAlt')"
            class="request-queue__photo"
          />

          <div class="request-queue__actions">
            <BaseButton
              :label="$t('common.actions.approve')"
              text
              size="small"
              :loading="profileRequestsStore.saving"
              @click="openReview(request, 'approved')"
            />
            <BaseButton
              :label="$t('common.actions.reject')"
              text
              size="small"
              severity="danger"
              @click="openReview(request, 'rejected')"
            />
          </div>
        </li>
      </ul>
    </BaseCard>

    <BaseFilterPanel :title="$t('admin.members.filtersTitle')" :description="$t('admin.members.filtersDescription')">
      <div class="student-filter-bar">
        <BaseSearchBar v-model="searchQuery" :placeholder="$t('admin.members.search')" />
        <BaseSelect v-model="membersStore.filters.status" :options="statusOptions" />
        <BaseSelect v-model="membersStore.filters.origin" :options="originOptions" />
        <BaseSelect v-model="membersStore.filters.course" :options="courseOptions" />
        <BaseSelect v-model="membersStore.filters.academicYear" :options="yearOptions" />
        <BaseButton :label="$t('common.actions.clearFilters')" severity="secondary" outlined :disabled="!hasActiveFilters" @click="clearFilters" />
      </div>
    </BaseFilterPanel>

    <BaseSection :title="$t('admin.members.tableTitle')" :description="$t('admin.members.tableDescription')">
      <BaseTable
        :value="membersStore.items"
        dataKey="id"
        :loading="membersStore.loading"
        :rows="10"
        paginator
        scrollHeight="flex"
      >
        <template #empty>
          <BaseEmptyState :title="$t('admin.members.emptyTitle')" :description="$t('admin.members.emptyDescription')" :action-label="$t('admin.members.create')" @action="openMemberForm()" />
        </template>

        <TableColumn :header="$t('admin.members.colPhoto')" width="88px">
          <template #body="slotProps">
            <BaseAvatar :image="slotProps.data.photoUrl" :label="slotProps.data.fullName" />
          </template>
        </TableColumn>

        <TableColumn field="memberNumber" :header="$t('admin.members.colNumber')" sortable />
        <TableColumn :header="$t('admin.members.colName')" field="fullName" sortable>
          <template #body="slotProps">
            <div class="cell-stack">
              <strong>{{ slotProps.data.fullName }}</strong>
              <small>{{ slotProps.data.email }}</small>
            </div>
          </template>
        </TableColumn>
        <TableColumn :header="$t('admin.members.colSchool')" field="originSchool" sortable>
          <template #body="slotProps">
            <BaseBadge
              :label="slotProps.data.isExternal ? slotProps.data.originSchool : $t('common.filters.thisSchool')"
              :tone="slotProps.data.isExternal ? 'warning' : 'neutral'"
            />
          </template>
        </TableColumn>
        <TableColumn :header="$t('admin.members.colCourseClass')">
          <template #body="slotProps">
            <div class="cell-stack">
              <span>{{ slotProps.data.course || '—' }}</span>
              <small>{{ slotProps.data.className || 'no class' }} · {{ slotProps.data.academicYear || '—' }}</small>
            </div>
          </template>
        </TableColumn>
        <TableColumn :header="$t('common.fields.status')">
          <template #body="slotProps">
            <BaseBadge
              :label="memberStatusLabel(slotProps.data.status)"
              :tone="
                slotProps.data.status === 'active'
                  ? 'success'
                  : slotProps.data.status === 'pending'
                    ? 'warning'
                    : 'neutral'
              "
            />
          </template>
        </TableColumn>
        <TableColumn :header="$t('admin.members.colCard')">
          <template #body="slotProps">
            <span>{{ slotProps.data.assignedCardUid ?? $t('admin.members.unassigned') }}</span>
          </template>
        </TableColumn>
        <TableColumn :header="$t('admin.members.colInternship')">
          <template #body="slotProps">
            <BaseBadge
              :label="memberInternshipStatusLabel(slotProps.data.internshipStatus)"
              :tone="
                slotProps.data.internshipStatus === 'in-progress'
                  ? 'info'
                  : slotProps.data.internshipStatus === 'complete'
                    ? 'success'
                    : 'neutral'
              "
            />
          </template>
        </TableColumn>
        <TableColumn field="teamHours" :header="$t('admin.members.colTeamHours')" sortable />
        <TableColumn :header="$t('common.fields.actions')" width="220px">
          <template #body="slotProps">
            <div class="table-actions">
              <BaseButton :label="$t('admin.members.view')" text size="small" @click="goToMemberDetails(slotProps.data.id)" />
              <BaseButton :label="$t('common.actions.edit')" text size="small" @click="openMemberForm(slotProps.data.id)" />
              <BaseButton :label="$t('admin.members.more')" text size="small" @click="openMenu($event, slotProps.data.id)" />
            </div>
          </template>
        </TableColumn>
      </BaseTable>
    </BaseSection>

    <BaseMenu ref="actionsMenu" :model="memberActions" />

    <StudentFormDialog
      :visible="isStudentFormVisible"
      :student="selectedMemberFormValues ?? undefined"
      :busy="membersStore.saving"
      :card-options="availableCardUids"
      @update:visible="isStudentFormVisible = $event"
      @save="handleSaveMember"
      @cancel="isStudentFormVisible = false"
    />

    <BaseConfirmDialog
      :visible="internAskVisible"
      :title="$t('admin.members.internQuestion')"
      :message="$t('admin.members.internQuestionMessage', { name: createdMemberName })"
      :confirm-label="$t('admin.members.internYes')"
      :cancel-label="$t('admin.members.internNo')"
      severity="primary"
      @update:visible="internAskVisible = $event"
      @confirm="confirmInternHandoff"
      @cancel="dismissInternHandoff"
    />

    <InternshipFormDialog
      :visible="internshipDialogVisible"
      :members="assignableMembers"
      :member-id="createdMemberId"
      :busy="internshipsStore.saving"
      :error-message="internshipsStore.errorMessage"
      @update:visible="internshipDialogVisible = $event"
      @save="handleAssignInternship"
      @cancel="internshipDialogVisible = false"
    />

    <BaseFormDialog
      :visible="reviewDialogVisible"
      :title="
        reviewDecision === 'approved'
          ? $t('admin.members.approveChange')
          : $t('admin.members.rejectChange')
      "
      :subtitle="
        reviewDecision === 'approved'
          ? $t('admin.members.approveChangeHint')
          : $t('admin.members.rejectChangeHint')
      "
      :confirm-label="
        reviewDecision === 'approved'
          ? $t('admin.members.approveAndApply')
          : $t('common.actions.reject')
      "
      :cancel-label="$t('common.actions.cancel')"
      :loading="profileRequestsStore.saving"
      @update:visible="reviewDialogVisible = $event"
      @confirm="submitReview"
      @cancel="reviewDialogVisible = false"
    >
      <p v-if="profileRequestsStore.errorMessage" class="form-error-banner">
        {{ profileRequestsStore.errorMessage }}
      </p>

      <p v-if="reviewRequest" class="type-body-secondary">
        {{
          $t("admin.members.reviewSummary", {
            member: reviewRequest.memberName,
            field: profileFieldLabel(reviewRequest.field).toLowerCase(),
          })
        }}
      </p>

      <div v-if="reviewRequest" class="review-compare">
        <div>
          <p class="type-label">{{ $t("admin.members.currentlyRecorded") }}</p>
          <img
            v-if="reviewRequest.field === 'photo' && reviewRequest.currentValue"
            :src="reviewRequest.currentValue"
            :alt="$t('admin.members.currentPhotoAlt')"
            class="request-queue__photo"
          />
          <p v-else class="review-compare__value">{{ reviewRequest.currentValue || $t("admin.members.nothingRecorded") }}</p>
        </div>
        <div>
          <p class="type-label">{{ $t("admin.members.requested") }}</p>
          <img
            v-if="reviewRequest.field === 'photo' && reviewRequest.requestedValue"
            :src="reviewRequest.requestedValue"
            :alt="$t('admin.members.requestedPhotoAlt')"
            class="request-queue__photo"
          />
          <p v-else class="review-compare__value review-compare__value--new">{{ reviewRequest.requestedValue }}</p>
        </div>
      </div>

      <label class="review-field">
        <span>
          {{
            reviewDecision === "rejected"
              ? $t("admin.members.reviewNoteRequired")
              : $t("admin.members.reviewNoteOptional")
          }}
        </span>
        <BaseTextarea v-model="reviewNote" rows="3" auto-resize />
      </label>
    </BaseFormDialog>

    <BaseConfirmDialog
      :visible="isDeleteVisible"
      :title="$t('admin.members.deleteTitle')"
      :message="$t('admin.members.deleteMessage')"
      :confirm-label="$t('common.actions.delete')"
      :cancel-label="$t('common.actions.cancel')"
      :loading="membersStore.saving"
      @update:visible="isDeleteVisible = $event"
      @confirm="handleDeleteMember"
      @cancel="isDeleteVisible = false"
    />
  </section>
</template>

<style scoped>
.request-queue {
  margin: 0;
  padding: 0;
  list-style: none;
}

.request-queue__row {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) 0;
}

.request-queue__row:not(:last-child) {
  border-bottom: var(--border-width) solid var(--border-subtle);
}

.request-queue__main {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  flex: 1;
}

.request-queue__title {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--foreground);
}

.request-queue__change {
  overflow-wrap: anywhere;
}

.request-queue__photo {
  width: 48px;
  height: 48px;
  flex: none;
  border-radius: var(--radius-md);
  object-fit: cover;
  border: var(--border-width) solid var(--border);
}

.request-queue__actions {
  display: inline-flex;
  gap: var(--space-1);
  flex: none;
}

.review-compare {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  border: var(--border-width) solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
}

.review-compare p {
  margin: 0;
}

.review-compare__value {
  font-size: var(--text-sm);
  color: var(--foreground);
  overflow-wrap: anywhere;
}

.review-compare__value--new {
  font-weight: var(--weight-medium);
  color: var(--primary);
}

.review-field {
  display: block;
}

.review-field > span {
  display: block;
  margin-bottom: var(--space-1);
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  color: var(--foreground-secondary);
}
</style>
