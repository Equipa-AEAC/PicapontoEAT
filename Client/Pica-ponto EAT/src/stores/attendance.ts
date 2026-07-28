import { computed, ref } from "vue";
import { defineStore } from "pinia";

import type { AttendanceCorrectionFormValues, AttendanceDetails, AttendanceFilters, AttendanceSummary, ManualAttendanceFormValues } from "../types/attendance";
import { applyAttendanceCorrection, createManualAttendance, deleteAttendance, getAttendanceDetails, listAttendance } from "../services/attendance.service";

export const useAttendanceStore = defineStore("attendance", () => {
  const items = ref<AttendanceSummary[]>([]);
  const selectedAttendance = ref<AttendanceDetails | null>(null);
  const filters = ref<AttendanceFilters>({ query: "", course: "all", studentId: "all", deviceId: "all", status: "all", dateRange: [null, null] });
  const loading = ref(false);
  const loadingDetails = ref(false);
  const saving = ref(false);

  const correctionCount = computed(() => items.value.filter((item) => item.corrections > 0).length);

  async function loadAttendance() {
    loading.value = true;
    try {
      items.value = await listAttendance(filters.value);
    } finally {
      loading.value = false;
    }
  }

  async function loadAttendanceDetails(attendanceId: string) {
    loadingDetails.value = true;
    try {
      selectedAttendance.value = await getAttendanceDetails(attendanceId);
    } finally {
      loadingDetails.value = false;
    }
  }

  async function addManualAttendance(values: ManualAttendanceFormValues) {
    saving.value = true;
    try {
      await createManualAttendance(values);
      await loadAttendance();
    } finally {
      saving.value = false;
    }
  }

  async function correctAttendance(attendanceId: string, values: AttendanceCorrectionFormValues) {
    saving.value = true;
    try {
      await applyAttendanceCorrection(attendanceId, values);
      await loadAttendance();
      await loadAttendanceDetails(attendanceId);
    } finally {
      saving.value = false;
    }
  }

  async function removeAttendance(attendanceId: string) {
    await deleteAttendance(attendanceId);
    await loadAttendance();
  }

  return {
    items,
    selectedAttendance,
    filters,
    loading,
    loadingDetails,
    saving,
    correctionCount,
    loadAttendance,
    loadAttendanceDetails,
    addManualAttendance,
    correctAttendance,
    removeAttendance,
  };
});
