import { computed, ref } from "vue";
import { defineStore } from "pinia";

import type {
  CertificateKind,
  CertificateRequest,
  CertificateRequestStatus,
  CertificateTemplate,
  IssuedCertificate,
  SchoolCertificateProfile,
  SchoolCertificateProfileFormValues,
} from "../types/certificates";
import type { UploadedFile } from "../services/uploads.service";
import {
  attachSignedCertificate,
  countPendingCertificateRequests,
  deleteSchoolCertificateProfile,
  listCertificateRequests,
  listCertificateTemplates,
  listIssuedCertificates,
  listMemberCertificateRequests,
  listMemberCertificates,
  listSchoolCertificateProfiles,
  regenerateCertificate,
  removeCertificateTemplate,
  removeSignedCertificate,
  requestCertificate,
  resolveCertificateRequest,
  saveCertificateTemplate,
  saveSchoolCertificateProfile,
  saveSchoolProfileTemplate,
  type CertificateReviewer,
} from "../services/certificates.service";
import { useAuthStore } from "../modules/authentication/stores/auth";
import { describeError } from "../utils/errors";
import { t } from "../i18n";

export const useCertificatesStore = defineStore("certificates", () => {
  const authStore = useAuthStore();

  const templates = ref<CertificateTemplate[]>([]);
  const schoolProfiles = ref<SchoolCertificateProfile[]>([]);
  const issued = ref<IssuedCertificate[]>([]);
  /** The reviewer's queue. */
  const requests = ref<CertificateRequest[]>([]);
  /** What the signed-in member has asked for, and what came of it. */
  const myRequests = ref<CertificateRequest[]>([]);
  const myCertificates = ref<IssuedCertificate[]>([]);
  const pendingCount = ref(0);
  const requestStatusFilter = ref<CertificateRequestStatus | "all">("requested");

  const loading = ref(false);
  const saving = ref(false);
  const errorMessage = ref<string | null>(null);
  const successMessage = ref<string | null>(null);

  const surplusTemplate = computed(() => templates.value.find((template) => template.kind === "surplus") ?? null);
  const fctTemplate = computed(() => templates.value.find((template) => template.kind === "fct") ?? null);
  const signedCount = computed(() => issued.value.filter((certificate) => certificate.signedFile).length);
  const openRequests = computed(() => myRequests.value.filter((request) => request.status === "requested"));

  const reviewer = computed<CertificateReviewer>(() => ({
    id: authStore.currentUser?.id ?? "unknown",
    name: authStore.currentUser?.fullName ?? "Administrator",
  }));

  function templateFor(kind: CertificateKind) {
    return templates.value.find((template) => template.kind === kind) ?? null;
  }

  function certificateFor(memberId: string, kind: CertificateKind) {
    return issued.value.find((certificate) => certificate.memberId === memberId && certificate.kind === kind) ?? null;
  }

  /** True while the member already has an unanswered request for that kind. */
  function hasOpenRequestFor(kind: CertificateKind): boolean {
    return openRequests.value.some((request) => request.kind === kind);
  }

  function myCertificateFor(kind: CertificateKind) {
    return myCertificates.value.find((certificate) => certificate.kind === kind) ?? null;
  }

  function clearMessages() {
    errorMessage.value = null;
    successMessage.value = null;
  }

  /** Everything the admin workspace needs: templates, school profiles, requests, output. */
  async function load() {
    loading.value = true;
    errorMessage.value = null;

    try {
      const [loadedTemplates, loadedProfiles, loadedIssued, loadedRequests, pending] = await Promise.all([
        listCertificateTemplates(),
        listSchoolCertificateProfiles(),
        listIssuedCertificates(),
        listCertificateRequests(requestStatusFilter.value),
        countPendingCertificateRequests(),
      ]);

      templates.value = loadedTemplates;
      schoolProfiles.value = loadedProfiles;
      issued.value = loadedIssued;
      requests.value = loadedRequests;
      pendingCount.value = pending;
    } catch (error) {
      errorMessage.value = describeError(error, t("errors.loadCertificates"));
    } finally {
      loading.value = false;
    }
  }

  /** The member's own view: what they asked for and what they can download. */
  async function loadForMember(memberId: string) {
    loading.value = true;
    errorMessage.value = null;

    try {
      const [loadedRequests, loadedCertificates] = await Promise.all([
        listMemberCertificateRequests(memberId),
        listMemberCertificates(memberId),
      ]);

      myRequests.value = loadedRequests;
      myCertificates.value = loadedCertificates;
    } catch (error) {
      errorMessage.value = describeError(error, t("errors.loadMyCertificates"));
    } finally {
      loading.value = false;
    }
  }

  /** Cheap enough to call on every admin navigation; drives the sidebar badge. */
  async function refreshPendingCount() {
    try {
      pendingCount.value = await countPendingCertificateRequests();
    } catch {
      // A badge that cannot load is not worth surfacing an error for.
      pendingCount.value = 0;
    }
  }

  async function runMutation<T>(mutation: () => Promise<T>, refresh: () => Promise<void>): Promise<T | null> {
    saving.value = true;
    clearMessages();

    try {
      const result = await mutation();
      await refresh();
      return result;
    } catch (error) {
      errorMessage.value = describeError(error, "Unexpected error.");
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function uploadTemplate(kind: CertificateKind, file: UploadedFile) {
    return runMutation(() => saveCertificateTemplate(kind, file), load);
  }

  async function clearTemplate(kind: CertificateKind) {
    return runMutation(() => removeCertificateTemplate(kind), load);
  }

  async function saveProfile(values: SchoolCertificateProfileFormValues, profileId?: string) {
    return runMutation(() => saveSchoolCertificateProfile(values, profileId), load);
  }

  async function setProfileTemplate(profileId: string, file: UploadedFile | null) {
    return runMutation(() => saveSchoolProfileTemplate(profileId, file), load);
  }

  async function removeProfile(profileId: string) {
    return runMutation(() => deleteSchoolCertificateProfile(profileId), load);
  }

  async function attachSigned(certificateId: string, file: UploadedFile) {
    return runMutation(() => attachSignedCertificate(certificateId, file), load);
  }

  async function clearSigned(certificateId: string) {
    return runMutation(() => removeSignedCertificate(certificateId), load);
  }

  async function regenerate(certificateId: string) {
    const result = await runMutation(() => regenerateCertificate(certificateId, reviewer.value), load);

    if (result) {
      successMessage.value = t("common.feedback.certificateRegenerated");
    }

    return result;
  }

  /** Member-side: ask for a certificate. */
  async function request(memberId: string, kind: CertificateKind, note: string) {
    const result = await runMutation(
      () => requestCertificate(memberId, kind, note),
      () => loadForMember(memberId),
    );

    if (result) {
      successMessage.value = t("common.feedback.requestSentToTeam");
    }

    return result;
  }

  /** Reviewer-side: approve (which generates) or reject. */
  async function resolve(requestId: string, decision: "approved" | "rejected", note: string) {
    const result = await runMutation(
      () => resolveCertificateRequest(requestId, decision, note, reviewer.value),
      load,
    );

    if (result) {
      successMessage.value =
        decision === "approved" ? t("common.feedback.certificateApproved") : "Request rejected.";
    }

    return result;
  }

  return {
    templates,
    schoolProfiles,
    issued,
    requests,
    myRequests,
    myCertificates,
    pendingCount,
    requestStatusFilter,
    loading,
    saving,
    errorMessage,
    successMessage,
    surplusTemplate,
    fctTemplate,
    signedCount,
    openRequests,
    templateFor,
    certificateFor,
    hasOpenRequestFor,
    myCertificateFor,
    clearMessages,
    refreshPendingCount,
    load,
    loadForMember,
    uploadTemplate,
    clearTemplate,
    saveProfile,
    setProfileTemplate,
    removeProfile,
    attachSigned,
    clearSigned,
    regenerate,
    request,
    resolve,
  };
});
