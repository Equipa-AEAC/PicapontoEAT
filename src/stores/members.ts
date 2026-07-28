import { computed, ref } from "vue";
import { defineStore } from "pinia";

import type { MemberAttendanceHistoryItem, MemberDetails, MemberFilters, MemberFormValues, MemberInternshipSummary, MemberSummary } from "../types/members";
import { assignMemberCard, deleteMember, getMemberById, getMemberInternship, listMemberAttendanceHistory, listMembers, saveMember } from "../services/members.service";

export const useMembersStore = defineStore("members", () => {
  const items = ref<MemberSummary[]>([]);
  const selectedMember = ref<MemberDetails | null>(null);
  const attendanceHistory = ref<MemberAttendanceHistoryItem[]>([]);
  const internship = ref<MemberInternshipSummary | null>(null);
  const filters = ref<MemberFilters>({ query: "", status: "all", course: "all", academicYear: "all" });
  const loading = ref(false);
  const loadingDetails = ref(false);
  const saving = ref(false);
  const error = ref<string | null>(null);

  const memberCount = computed(() => items.value.length);

  async function loadMembers() {
    loading.value = true;
    error.value = null;

    try {
      const response = await listMembers(filters.value);
      items.value = response.items;
    } catch (loadError) {
      error.value = loadError instanceof Error ? loadError.message : "Unable to load members.";
    } finally {
      loading.value = false;
    }
  }

  async function loadMember(memberId: string) {
    loadingDetails.value = true;

    try {
      selectedMember.value = await getMemberById(memberId);
      attendanceHistory.value = await listMemberAttendanceHistory(memberId);
      internship.value = await getMemberInternship(memberId);
    } finally {
      loadingDetails.value = false;
    }
  }

  async function persistMember(values: MemberFormValues, memberId?: string) {
    saving.value = true;

    try {
      await saveMember(values, memberId);
      await loadMembers();
    } finally {
      saving.value = false;
    }
  }

  async function removeMember(memberId: string) {
    await deleteMember(memberId);
    await loadMembers();
  }

  async function assignCardToMember(memberId: string, cardUid: string) {
    const currentMember = await assignMemberCard(memberId, cardUid);
    if (selectedMember.value?.id === memberId) {
      selectedMember.value = currentMember;
    }
    await loadMembers();
  }

  return {
    items,
    selectedMember,
    attendanceHistory,
    internship,
    filters,
    loading,
    loadingDetails,
    saving,
    error,
    memberCount,
    loadMembers,
    loadMember,
    persistMember,
    removeMember,
    assignCardToMember,
  };
});
