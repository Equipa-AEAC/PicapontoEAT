import { computed, ref } from "vue";
import { defineStore } from "pinia";

import {
  countPendingCorrectionRequests,
  listCorrectionRequests,
  listMemberCorrectionRequests,
  resolveCorrectionRequest,
  submitCorrectionRequest,
  withdrawCorrectionRequest,
  type CorrectionActor,
} from "../services/attendanceCorrections.service";
import { useAuthStore } from "../modules/authentication/stores/auth";
import type {
  AttendanceCorrectionRequestSummary,
  CorrectionRequestFilters,
  CorrectionRequestFormValues,
  CorrectionResolutionValues,
} from "../types/attendanceCorrections";
import { hasOpenRequest } from "../types/attendanceCorrections";

/**
 * Both sides of the correction workflow.
 *
 * One store rather than two because the member's list and the reviewer's queue
 * are the same records seen from different ends — splitting them would mean
 * keeping two caches of the same rows in step after every resolution.
 */
export const useAttendanceCorrectionsStore = defineStore("attendanceCorrections", () => {
  const authStore = useAuthStore();

  /** The reviewer's queue. */
  const requests = ref<AttendanceCorrectionRequestSummary[]>([]);
  /** What the signed-in member has raised. */
  const myRequests = ref<AttendanceCorrectionRequestSummary[]>([]);
  const pendingCount = ref(0);

  const loading = ref(false);
  const saving = ref(false);
  const errorMessage = ref<string | null>(null);
  /** Cleared by the next action; the UI shows it as a transient confirmation. */
  const successMessage = ref<string | null>(null);

  const filters = ref<CorrectionRequestFilters>({ status: "pending", memberId: "all" });

  /**
   * The member acting in the student workspace, resolved from the session.
   *
   * An empty id matches no member, so a staff session cannot accidentally raise
   * a request as somebody else — the service rejects it because the attendance
   * record will not belong to them.
   */
  const memberActor = computed<CorrectionActor>(() => ({
    id: authStore.currentMemberId ?? "",
    name: authStore.currentUser?.fullName ?? "Member",
  }));

  /** The staff account acting in the admin workspace. */
  const reviewerActor = computed<CorrectionActor>(() => ({
    id: authStore.currentUser?.id ?? "unknown",
    name: authStore.currentUser?.fullName ?? "Administrator",
  }));

  const openRequests = computed(() => requests.value.filter((request) => request.status === "pending"));

  /** Attendance ids the member already has an unresolved request against. */
  const blockedRecordIds = computed(
    () => new Set(myRequests.value.filter((request) => request.status === "pending").map((r) => r.attendanceId)),
  );

  function canRequestFor(attendanceId: string): boolean {
    return !hasOpenRequest(myRequests.value, attendanceId);
  }

  function requestFor(attendanceId: string): AttendanceCorrectionRequestSummary | null {
    return myRequests.value.find((request) => request.attendanceId === attendanceId) ?? null;
  }

  async function withErrorHandling<T>(operation: () => Promise<T>, flag = saving): Promise<T | null> {
    flag.value = true;
    errorMessage.value = null;

    try {
      return await operation();
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : "Something went wrong. Please try again.";
      return null;
    } finally {
      flag.value = false;
    }
  }

  /* -------------------------------------------------------------- reading */

  async function loadQueue() {
    await withErrorHandling(async () => {
      requests.value = await listCorrectionRequests(filters.value);
      pendingCount.value = await countPendingCorrectionRequests();
    }, loading);
  }

  async function loadMyRequests() {
    await withErrorHandling(async () => {
      myRequests.value = await listMemberCorrectionRequests(memberActor.value.id);
    }, loading);
  }

  /** Cheap enough to call on every admin navigation; drives the sidebar badge. */
  async function refreshPendingCount() {
    try {
      pendingCount.value = await countPendingCorrectionRequests();
    } catch {
      // A badge that cannot load is not worth surfacing an error for.
      pendingCount.value = 0;
    }
  }

  /* -------------------------------------------------------------- writing */

  async function submit(values: CorrectionRequestFormValues) {
    successMessage.value = null;

    const created = await withErrorHandling(() => submitCorrectionRequest(memberActor.value, values));

    if (created) {
      await loadMyRequests();
      successMessage.value = "Your request was sent. You will see the outcome on this page.";
    }

    return created;
  }

  async function withdraw(requestId: string) {
    successMessage.value = null;

    const updated = await withErrorHandling(() => withdrawCorrectionRequest(memberActor.value, requestId));

    if (updated) {
      await loadMyRequests();
      successMessage.value = "Request withdrawn.";
    }

    return updated;
  }

  async function resolve(requestId: string, approve: boolean, values: CorrectionResolutionValues) {
    successMessage.value = null;

    const updated = await withErrorHandling(() =>
      resolveCorrectionRequest(reviewerActor.value, requestId, approve, values),
    );

    if (updated) {
      await loadQueue();
      successMessage.value = updated.appliedToRecord
        ? "Approved and the attendance record was corrected."
        : approve
          ? "Approved. The record was left as it is."
          : "Request closed without changing the record.";
    }

    return updated;
  }

  function clearMessages() {
    errorMessage.value = null;
    successMessage.value = null;
  }

  return {
    requests,
    myRequests,
    pendingCount,
    openRequests,
    blockedRecordIds,
    loading,
    saving,
    errorMessage,
    successMessage,
    filters,
    canRequestFor,
    requestFor,
    loadQueue,
    loadMyRequests,
    refreshPendingCount,
    submit,
    withdraw,
    resolve,
    clearMessages,
  };
});
