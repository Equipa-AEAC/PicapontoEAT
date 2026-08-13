<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { PhCreditCard, PhBriefcase, PhTimer, PhUsersThree } from "@phosphor-icons/vue";

import BaseAvatar from "../../../../components/base/BaseAvatar.vue";
import BaseBadge from "../../../../components/base/BaseBadge.vue";
import BaseButton from "../../../../components/base/BaseButton.vue";
import BaseConfirmDialog from "../../../../components/base/BaseConfirmDialog.vue";
import BaseEmptyState from "../../../../components/base/BaseEmptyState.vue";
import BaseFilterPanel from "../../../../components/base/BaseFilterPanel.vue";
import BaseMenu from "../../../../components/base/BaseMenu.vue";
import BasePageHeader from "../../../../components/base/BasePageHeader.vue";
import BaseSearchBar from "../../../../components/base/BaseSearchBar.vue";
import BaseSection from "../../../../components/base/BaseSection.vue";
import BaseSelect from "../../../../components/base/BaseSelect.vue";
import BaseStatsCard from "../../../../components/base/BaseStatsCard.vue";
import BaseTable from "../../../../components/base/BaseTable.vue";
import TableColumn from "../../../../components/base/TableColumn.vue";
import InternshipFormDialog from "../../../../components/internships/InternshipFormDialog.vue";
import StudentFormDialog from "../../../../components/students/StudentFormDialog.vue";
import { useCardsStore } from "../../../../stores/cards";
import { useInternshipsStore } from "../../../../stores/internships";
import { useMembersStore } from "../../../../stores/members";
import type { InternshipFormValues } from "../../../../types/internships";
import type { MemberDetails, MemberFormValues } from "../../../../types/members";

const router = useRouter();
const membersStore = useMembersStore();
const cardsStore = useCardsStore();
const internshipsStore = useInternshipsStore();
const actionsMenu = ref();
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

const statusOptions = [
  { label: "All statuses", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Pending", value: "pending" },
  { label: "Graduated", value: "graduated" },
];

const originOptions = [
  { label: "All schools", value: "all" },
  { label: "This school", value: "internal" },
  { label: "Other schools", value: "external" },
];

// Built from the *unfiltered* roster — deriving these from the filtered rows would
// make every other option disappear as soon as one filter was applied.
const courseOptions = computed(() => [
  { label: "All courses", value: "all" },
  ...Array.from(new Set(membersStore.allMembers.map((member) => member.course)))
    .filter((value) => String(value).trim().length > 0)
    .map((value) => ({ label: String(value), value: String(value) })),
]);

const yearOptions = computed(() => [
  { label: "All years", value: "all" },
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

const memberActions = [
  { label: "View", command: () => activeStudentId.value && goToMemberDetails(activeStudentId.value) },
  { label: "Edit", command: () => activeStudentId.value && openMemberForm(activeStudentId.value) },
  { label: "Delete", command: () => activeStudentId.value && openDeleteConfirm(activeStudentId.value) },
  { label: "Assign Card", command: () => activeStudentId.value && openMemberForm(activeStudentId.value) },
  { label: "Attendance History", command: () => activeStudentId.value && goToMemberAttendanceHistory(activeStudentId.value) },
  { label: "Internship", command: () => activeStudentId.value && goToMemberDetails(activeStudentId.value) },
];

onMounted(async () => {
  membersStore.filters.query = searchQuery.value;
  await Promise.all([
    membersStore.loadMembers(),
    membersStore.loadAllMembers(),
    cardsStore.loadCards(),
    internshipsStore.loadInternships(),
  ]);
});
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      title="Members"
      description="Everyone on the Equipa Técnica roster. Members accumulate volunteer team hours; those who also carry out an FCT internship track those hours separately."
    >
      <template #actions>
        <BaseButton label="Import members" severity="secondary" outlined />
        <BaseButton label="Create member" @click="openMemberForm()" />
      </template>
    </BasePageHeader>

    <section class="metric-grid">
      <BaseStatsCard
        label="Total members"
        :value="String(membersStore.memberCount)"
        caption="Visible in the current filter set"
        :icon="PhUsersThree"
      />
      <BaseStatsCard
        label="Team hours"
        :value="String(membersStore.allMembers.reduce((total, member) => total + member.teamHours, 0))"
        caption="Volunteer hours towards surplus certificates"
        :icon="PhTimer"
      />
      <BaseStatsCard
        label="Also interns"
        :value="String(membersStore.allMembers.filter((member) => member.internshipStatus !== 'not-assigned').length)"
        caption="Members additionally doing an FCT internship"
        :icon="PhBriefcase"
      />
      <BaseStatsCard
        label="With card assigned"
        :value="String(membersStore.allMembers.filter((member) => Boolean(member.assignedCardUid)).length)"
        caption="Members linked to an RFID card"
        :icon="PhCreditCard"
      />
    </section>

    <BaseFilterPanel title="Search and filters" description="Filters apply as you type — no Apply step.">
      <div class="student-filter-bar">
        <BaseSearchBar v-model="searchQuery" placeholder="Search by name, number, course, class or school" />
        <BaseSelect v-model="membersStore.filters.status" :options="statusOptions" />
        <BaseSelect v-model="membersStore.filters.origin" :options="originOptions" />
        <BaseSelect v-model="membersStore.filters.course" :options="courseOptions" />
        <BaseSelect v-model="membersStore.filters.academicYear" :options="yearOptions" />
        <BaseButton label="Clear filters" severity="secondary" outlined :disabled="!hasActiveFilters" @click="clearFilters" />
      </div>
    </BaseFilterPanel>

    <BaseSection title="Member table" description="Every action is ready to map to REST endpoints later.">
      <BaseTable
        :value="membersStore.items"
        dataKey="id"
        :loading="membersStore.loading"
        :rows="10"
        paginator
        scrollHeight="flex"
      >
        <template #empty>
          <BaseEmptyState title="No members found" description="Adjust the filters or create a new member record." action-label="Create member" @action="openMemberForm()" />
        </template>

        <TableColumn header="Photo" width="88px">
          <template #body="slotProps">
            <BaseAvatar :image="slotProps.data.photoUrl" :label="slotProps.data.fullName" />
          </template>
        </TableColumn>

        <TableColumn field="memberNumber" header="Member Number" sortable />
        <TableColumn header="Full Name" field="fullName" sortable>
          <template #body="slotProps">
            <div class="cell-stack">
              <strong>{{ slotProps.data.fullName }}</strong>
              <small>{{ slotProps.data.email }}</small>
            </div>
          </template>
        </TableColumn>
        <TableColumn header="School" field="originSchool" sortable>
          <template #body="slotProps">
            <BaseBadge
              :label="slotProps.data.isExternal ? slotProps.data.originSchool : 'This school'"
              :tone="slotProps.data.isExternal ? 'warning' : 'neutral'"
            />
          </template>
        </TableColumn>
        <TableColumn header="Course / Class">
          <template #body="slotProps">
            <div class="cell-stack">
              <span>{{ slotProps.data.course || '—' }}</span>
              <small>{{ slotProps.data.className || 'no class' }} · {{ slotProps.data.academicYear || '—' }}</small>
            </div>
          </template>
        </TableColumn>
        <TableColumn header="Status">
          <template #body="slotProps">
            <BaseBadge :label="slotProps.data.status" :tone="slotProps.data.status === 'active' ? 'success' : slotProps.data.status === 'pending' ? 'warning' : 'neutral'" />
          </template>
        </TableColumn>
        <TableColumn header="Assigned RFID Card">
          <template #body="slotProps">
            <span>{{ slotProps.data.assignedCardUid ?? 'Unassigned' }}</span>
          </template>
        </TableColumn>
        <TableColumn header="Internship Status">
          <template #body="slotProps">
            <BaseBadge :label="slotProps.data.internshipStatus" :tone="slotProps.data.internshipStatus === 'in-progress' ? 'info' : slotProps.data.internshipStatus === 'complete' ? 'success' : 'neutral'" />
          </template>
        </TableColumn>
        <TableColumn field="teamHours" header="Team Hours" sortable />
        <TableColumn header="Actions" width="220px">
          <template #body="slotProps">
            <div class="table-actions">
              <BaseButton label="View" text size="small" @click="goToMemberDetails(slotProps.data.id)" />
              <BaseButton label="Edit" text size="small" @click="openMemberForm(slotProps.data.id)" />
              <BaseButton label="More" text size="small" @click="openMenu($event, slotProps.data.id)" />
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
      title="Is this member also an FCT intern?"
      :message="`${createdMemberName} was added to the roster and will start accruing volunteer team hours. If they are also carrying out an FCT internship here, we can set that up now — otherwise you can always assign one later from the Internships page.`"
      confirm-label="Yes, set up the internship"
      cancel-label="No, team member only"
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

    <BaseConfirmDialog
      :visible="isDeleteVisible"
      title="Delete member"
      message="This will remove the member record from the local mock dataset. The same action will map to a DELETE endpoint later."
      :loading="membersStore.saving"
      @update:visible="isDeleteVisible = $event"
      @confirm="handleDeleteMember"
      @cancel="isDeleteVisible = false"
    />
  </section>
</template>
