<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import Button from "primevue/button";
import Column from "primevue/column";
import Menu from "primevue/menu";
import Select from "primevue/select";

import BaseAvatar from "../components/base/BaseAvatar.vue";
import BaseBadge from "../components/base/BaseBadge.vue";
import BaseConfirmDialog from "../components/base/BaseConfirmDialog.vue";
import BaseEmptyState from "../components/base/BaseEmptyState.vue";
import BaseFilterPanel from "../components/base/BaseFilterPanel.vue";
import BasePageHeader from "../components/base/BasePageHeader.vue";
import BaseSearchBar from "../components/base/BaseSearchBar.vue";
import BaseSection from "../components/base/BaseSection.vue";
import BaseStatsCard from "../components/base/BaseStatsCard.vue";
import BaseTable from "../components/base/BaseTable.vue";
import StudentFormDialog from "../components/students/StudentFormDialog.vue";
import { useCardsStore } from "../stores/cards";
import { useMembersStore } from "../stores/members";
import type { MemberDetails, MemberFormValues } from "../types/members";

const router = useRouter();
const membersStore = useMembersStore();
const cardsStore = useCardsStore();
const actionsMenu = ref();
const activeStudentId = ref<string | null>(null);
const isStudentFormVisible = ref(false);
const isDeleteVisible = ref(false);
const searchQuery = ref("");

const statusOptions = [
  { label: "All statuses", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Pending", value: "pending" },
  { label: "Graduated", value: "graduated" },
];

const courseOptions = computed(() => [
  { label: "All courses", value: "all" },
  ...new Set(membersStore.items.map((member) => member.course)).values(),
].map((value) => ({ label: String(value), value: String(value) })));

const yearOptions = computed(() => [
  { label: "All years", value: "all" },
  ...new Set(membersStore.items.map((member) => member.academicYear)).values(),
].map((value) => ({ label: String(value), value: String(value) })));

const selectedMember = computed<MemberDetails | null>(() => membersStore.selectedMember ?? null);
const availableCardUids = computed(() => cardsStore.items.filter((card) => card.status === "available").map((card) => card.uid));
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

async function openMemberForm(memberId: string | null = null) {
  activeStudentId.value = memberId;
  if (memberId) {
    await membersStore.loadMember(memberId);
  }
  isStudentFormVisible.value = true;
}

function openDeleteConfirm(studentId: string) {
  activeStudentId.value = studentId;
  isDeleteVisible.value = true;
}

async function handleSaveMember(values: MemberFormValues) {
  await membersStore.persistMember(values, activeStudentId.value ?? undefined);
  isStudentFormVisible.value = false;
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
  await Promise.all([membersStore.loadMembers(), cardsStore.loadCards()]);
});
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      eyebrow="Member registry"
      title="Members"
      description="Manage member records, RFID card assignments, attendance history and internship progress from a single workspace."
    >
      <template #actions>
        <Button label="Import members" severity="secondary" outlined />
        <Button label="Create member" @click="openMemberForm()" />
      </template>
    </BasePageHeader>

    <section class="metric-grid">
      <BaseStatsCard label="Total members" :value="String(membersStore.memberCount)" caption="Visible in the current filter set" />
      <BaseStatsCard label="Available cards" :value="String(cardsStore.availableCount)" caption="Ready for assignment" />
      <BaseStatsCard label="Active internships" :value="String(membersStore.items.filter((member) => member.internshipStatus === 'in-progress').length)" caption="Members in internship flow" />
      <BaseStatsCard label="With card assigned" :value="String(membersStore.items.filter((member) => Boolean(member.assignedCardUid)).length)" caption="Members linked to an RFID card" />
    </section>

    <BaseFilterPanel title="Search and filters" description="Narrow the member registry by query, course, class year and status.">
      <div class="student-filter-bar">
        <BaseSearchBar v-model="searchQuery" placeholder="Search members by name, number, course or class" />
        <Select v-model="membersStore.filters.status" :options="statusOptions" optionLabel="label" optionValue="value" />
        <Select v-model="membersStore.filters.course" :options="courseOptions" optionLabel="label" optionValue="value" />
        <Select v-model="membersStore.filters.academicYear" :options="yearOptions" optionLabel="label" optionValue="value" />
        <Button label="Apply filters" severity="secondary" outlined @click="membersStore.filters.query = searchQuery; membersStore.loadMembers()" />
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

        <Column header="Photo" style="width: 88px">
          <template #body="slotProps">
            <BaseAvatar :image="slotProps.data.photoUrl" :label="slotProps.data.fullName" />
          </template>
        </Column>

        <Column field="memberNumber" header="Member Number" sortable />
        <Column field="fullName" header="Full Name" sortable />
        <Column field="course" header="Course" sortable />
        <Column field="className" header="Class" sortable />
        <Column field="academicYear" header="Academic Year" sortable />
        <Column header="Status">
          <template #body="slotProps">
            <BaseBadge :label="slotProps.data.status" :tone="slotProps.data.status === 'active' ? 'success' : slotProps.data.status === 'pending' ? 'warning' : 'neutral'" />
          </template>
        </Column>
        <Column header="Assigned RFID Card">
          <template #body="slotProps">
            <span>{{ slotProps.data.assignedCardUid ?? 'Unassigned' }}</span>
          </template>
        </Column>
        <Column header="Internship Status">
          <template #body="slotProps">
            <BaseBadge :label="slotProps.data.internshipStatus" :tone="slotProps.data.internshipStatus === 'in-progress' ? 'info' : slotProps.data.internshipStatus === 'complete' ? 'success' : 'warning'" />
          </template>
        </Column>
        <Column field="accumulatedHours" header="Accumulated Hours" sortable />
        <Column header="Actions" style="width: 220px">
          <template #body="slotProps">
            <div class="table-actions">
              <Button label="View" text size="small" @click="goToMemberDetails(slotProps.data.id)" />
              <Button label="Edit" text size="small" @click="openMemberForm(slotProps.data.id)" />
              <Button label="More" text size="small" @click="openMenu($event, slotProps.data.id)" />
            </div>
          </template>
        </Column>
      </BaseTable>
    </BaseSection>

    <Menu ref="actionsMenu" :model="memberActions" popup />

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
      :visible="isDeleteVisible"
      title="Delete student"
      message="This will remove the student record from the local mock dataset. The same action will map to a DELETE endpoint later."
      :loading="membersStore.saving"
      @update:visible="isDeleteVisible = $event"
      @confirm="handleDeleteMember"
      @cancel="isDeleteVisible = false"
    />
  </section>
</template>