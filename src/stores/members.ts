import { computed, ref } from "vue";
import { defineStore } from "pinia";

import type { MemberAttendanceHistoryFilters, MemberAttendanceHistoryItem, MemberDetails, MemberFilters, MemberFormValues, MemberInternshipSummary, MemberSummary } from "../types/members";
import { assignMemberCard, deleteMember, getMemberById, getMemberInternship, listMemberAttendanceHistory, listMembers, saveMember } from "../services/members.service";
import { t } from "../i18n";

export const useMembersStore = defineStore("members", () => {
  const items = ref<MemberSummary[]>([]);
  /**
   * The whole roster, ignoring `filters`. Filter dropdowns must be built from this —
   * building them from `items` makes every other option vanish as soon as one filter
   * is applied, leaving no way back.
   */
  const allMembers = ref<MemberSummary[]>([]);
  const selectedMember = ref<MemberDetails | null>(null);
  const attendanceHistory = ref<MemberAttendanceHistoryItem[]>([]);
  const internship = ref<MemberInternshipSummary | null>(null);
  const filters = ref<MemberFilters>({ query: "", status: "all", course: "all", academicYear: "all", origin: "all" });
  const loading = ref(false);
  const loadingDetails = ref(false);
  const saving = ref(false);
  const error = ref<string | null>(null);

  const memberCount = computed(() => items.value.length);

  /** One member's attendance, optionally narrowed by period and status. */
  async function loadMemberAttendance(memberId: string, filters: MemberAttendanceHistoryFilters = {}) {
    loadingDetails.value = true;
    error.value = null;

    try {
      attendanceHistory.value = await listMemberAttendanceHistory(memberId, filters);
    } catch (loadError) {
      error.value = loadError instanceof Error ? loadError.message : t("common.feedback.loadAttendanceHistory");
    } finally {
      loadingDetails.value = false;
    }
  }

  async function loadMembers() {
    loading.value = true;
    error.value = null;

    try {
      const response = await listMembers(filters.value);
      items.value = response.items;
    } catch (loadError) {
      error.value = loadError instanceof Error ? loadError.message : t("common.feedback.loadMembers");
    } finally {
      loading.value = false;
    }
  }

  /** Refreshes the unfiltered roster that backs the filter dropdowns. */
  async function loadAllMembers() {
    try {
      const response = await listMembers({});
      allMembers.value = response.items;
    } catch (loadError) {
      error.value = loadError instanceof Error ? loadError.message : t("common.feedback.loadMembers");
    }
  }

  function resetFilters() {
    filters.value = { query: "", status: "all", course: "all", academicYear: "all", origin: "all" };
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

  /** Returns the saved member so callers can chain onto the newly created record. */
  async function persistMember(values: MemberFormValues, memberId?: string) {
    saving.value = true;

    try {
      const saved = await saveMember(values, memberId);
      await Promise.all([loadMembers(), loadAllMembers()]);
      return saved;
    } finally {
      saving.value = false;
    }
  }

  async function removeMember(memberId: string) {
    await deleteMember(memberId);
    await Promise.all([loadMembers(), loadAllMembers()]);
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
    allMembers,
    selectedMember,
    attendanceHistory,
    internship,
    filters,
    loading,
    loadingDetails,
    saving,
    error,
    /** Alias so every page reads the same property name. */
    errorMessage: error,
    memberCount,
    loadMembers,
    loadAllMembers,
    resetFilters,
    loadMember,
    loadMemberAttendance,
    persistMember,
    removeMember,
    assignCardToMember,
  };
});
