import { computed, ref } from "vue";
import { defineStore } from "pinia";

import type {
  ProfileChangeField,
  ProfileChangeFormValues,
  ProfileChangeRequest,
  ProfileChangeStatus,
} from "../types/profileChangeRequests";
import {
  countPendingProfileChangeRequests,
  listMemberProfileChangeRequests,
  listProfileChangeRequests,
  resolveProfileChangeRequest,
  submitProfileChangeRequest,
  withdrawProfileChangeRequest,
  type ProfileChangeActor,
} from "../services/profileChangeRequests.service";
import { useAuthStore } from "../modules/authentication/stores/auth";
import { describeError } from "../utils/errors";
import { t } from "../i18n";

/**
 * Both sides of the profile-change workflow, in one store.
 *
 * Same reasoning as `useAttendanceCorrectionsStore`: the member's list and the
 * reviewer's queue are the same records seen from two ends, and two caches of
 * the same rows drift the moment one side resolves something.
 */
export const useProfileChangeRequestsStore = defineStore("profileChangeRequests", () => {
  const authStore = useAuthStore();

  /** The reviewer's queue. */
  const requests = ref<ProfileChangeRequest[]>([]);
  /** What the signed-in member has raised. */
  const myRequests = ref<ProfileChangeRequest[]>([]);
  const pendingCount = ref(0);
  const statusFilter = ref<ProfileChangeStatus | "all">("pending");

  const loading = ref(false);
  const saving = ref(false);
  const errorMessage = ref<string | null>(null);
  const successMessage = ref<string | null>(null);

  const openRequests = computed(() => myRequests.value.filter((request) => request.status === "pending"));
  const answeredRequests = computed(() => myRequests.value.filter((request) => request.status !== "pending"));

  const reviewer = computed<ProfileChangeActor>(() => ({
    id: authStore.currentUser?.id ?? "unknown",
    name: authStore.currentUser?.fullName ?? "Administrator",
  }));

  /** True while this member already has a request waiting on that field. */
  function hasOpenRequestFor(field: ProfileChangeField): boolean {
    return openRequests.value.some((request) => request.field === field);
  }

  function clearMessages() {
    errorMessage.value = null;
    successMessage.value = null;
  }

  async function loadMyRequests(memberId: string) {
    loading.value = true;
    errorMessage.value = null;

    try {
      myRequests.value = memberId ? await listMemberProfileChangeRequests(memberId) : [];
    } catch (error) {
      errorMessage.value = describeError(error, t("errors.loadMyProfileRequests"));
    } finally {
      loading.value = false;
    }
  }

  async function loadQueue() {
    loading.value = true;
    errorMessage.value = null;

    try {
      requests.value = await listProfileChangeRequests(statusFilter.value);
      pendingCount.value = await countPendingProfileChangeRequests();
    } catch (error) {
      errorMessage.value = describeError(error, t("errors.loadProfileRequests"));
    } finally {
      loading.value = false;
    }
  }

  async function refreshPendingCount() {
    try {
      pendingCount.value = await countPendingProfileChangeRequests();
    } catch {
      pendingCount.value = 0;
    }
  }

  async function submit(memberId: string, values: ProfileChangeFormValues) {
    saving.value = true;
    clearMessages();

    try {
      await submitProfileChangeRequest(memberId, values);
      await loadMyRequests(memberId);
      successMessage.value = t("common.feedback.requestSentToTeam");
      return true;
    } catch (error) {
      errorMessage.value = describeError(error, t("errors.sendRequest"));
      return false;
    } finally {
      saving.value = false;
    }
  }

  async function withdraw(requestId: string, memberId: string) {
    saving.value = true;
    clearMessages();

    try {
      await withdrawProfileChangeRequest(requestId, memberId);
      await loadMyRequests(memberId);
      successMessage.value = t("common.feedback.requestWithdrawn");
      return true;
    } catch (error) {
      errorMessage.value = describeError(error, t("errors.withdrawRequest"));
      return false;
    } finally {
      saving.value = false;
    }
  }

  async function resolve(requestId: string, decision: "approved" | "rejected", note: string) {
    saving.value = true;
    clearMessages();

    try {
      await resolveProfileChangeRequest(requestId, decision, note, reviewer.value);
      await loadQueue();
      successMessage.value = decision === "approved" ? t("common.feedback.changeApplied") : "Request rejected.";
      return true;
    } catch (error) {
      errorMessage.value = describeError(error, t("errors.resolveRequest"));
      return false;
    } finally {
      saving.value = false;
    }
  }

  return {
    requests,
    myRequests,
    pendingCount,
    statusFilter,
    loading,
    saving,
    errorMessage,
    successMessage,
    openRequests,
    answeredRequests,
    hasOpenRequestFor,
    clearMessages,
    loadMyRequests,
    loadQueue,
    refreshPendingCount,
    submit,
    withdraw,
    resolve,
  };
});
