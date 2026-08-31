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
  /**
   * A failed load has to be distinguishable from an empty result. Without this
   * the page renders "no attendance records" when the request simply failed.
   */
  const errorMessage = ref<string | null>(null);

  function describe(error: unknown, fallback: string) {
    return error instanceof Error && error.message ? error.message : fallback;
  }

  const correctionCount = computed(() => items.value.filter((item) => item.corrections > 0).length);

  async function loadAttendance() {
    loading.value = true;
    errorMessage.value = null;
    try {
      items.value = await listAttendance(filters.value);
    } catch (error) {
      errorMessage.value = describe(error, "Attendance could not be loaded.");
    } finally {
      loading.value = false;
    }
  }

  async function loadAttendanceDetails(attendanceId: string) {
    loadingDetails.value = true;
    errorMessage.value = null;
    try {
      selectedAttendance.value = await getAttendanceDetails(attendanceId);
    } catch (error) {
      errorMessage.value = describe(error, "That attendance record could not be loaded.");
    } finally {
      loadingDetails.value = false;
    }
  }

  async function addManualAttendance(values: ManualAttendanceFormValues) {
    saving.value = true;
    try {
      await createManualAttendance(values);
      await loadAttendance();
    } catch (error) {
      errorMessage.value = describe(error, "The attendance record could not be saved.");
      throw error;
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
    } catch (error) {
      errorMessage.value = describe(error, "The correction could not be applied.");
      throw error;
    } finally {
      saving.value = false;
    }
  }

  async function removeAttendance(attendanceId: string) {
    errorMessage.value = null;
    try {
      await deleteAttendance(attendanceId);
      await loadAttendance();
    } catch (error) {
      errorMessage.value = describe(error, "The attendance record could not be removed.");
    }
  }

  return {
    items,
    selectedAttendance,
    filters,
    loading,
    loadingDetails,
    saving,
    errorMessage,
    correctionCount,
    loadAttendance,
    loadAttendanceDetails,
    addManualAttendance,
    correctAttendance,
    removeAttendance,
  };
});
