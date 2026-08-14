import { computed, ref } from "vue";
import { defineStore } from "pinia";

import type { InternshipDetails, InternshipFormValues, InternshipProgressUpdateValues, InternshipSummary } from "../types/internships";
import type { CertificatePreview } from "../services/internships.service";
import {
  assignInternship,
  generateCertificatePreview,
  generateSurplusCertificatePreview,
  getInternshipByStudentId,
  listInternships,
  updateInternshipProgress,
} from "../services/internships.service";

export const useInternshipsStore = defineStore("internships", () => {
  const items = ref<InternshipSummary[]>([]);
  const selectedInternship = ref<InternshipDetails | null>(null);
  const loading = ref(false);
  const loadingDetails = ref(false);
  const saving = ref(false);
  const errorMessage = ref<string | null>(null);
  const certificatePreview = ref<CertificatePreview | null>(null);

  const totalCompletedHours = computed(() => items.value.reduce((total, internship) => total + internship.completedHours, 0));

  async function loadInternships() {
    loading.value = true;
    try {
      items.value = await listInternships();
    } finally {
      loading.value = false;
    }
  }

  async function loadInternship(studentId: string) {
    loadingDetails.value = true;
    try {
      selectedInternship.value = await getInternshipByStudentId(studentId);
    } finally {
      loadingDetails.value = false;
    }
  }

  async function assignStudentInternship(values: InternshipFormValues) {
    saving.value = true;
    errorMessage.value = null;
    try {
      await assignInternship(values);
      await loadInternships();
      return true;
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : "Unable to assign the internship.";
      return false;
    } finally {
      saving.value = false;
    }
  }

  async function updateProgress(studentId: string, values: InternshipProgressUpdateValues) {
    saving.value = true;
    try {
      await updateInternshipProgress(studentId, values);
      await loadInternship(studentId);
      await loadInternships();
    } finally {
      saving.value = false;
    }
  }

  /** FCT internship completion certificate. */
  async function previewCertificate(studentId: string) {
    certificatePreview.value = await generateCertificatePreview(studentId);
  }

  /** Volunteer surplus-hours certificate, available to any team member. */
  async function previewSurplusCertificate(memberId: string) {
    certificatePreview.value = await generateSurplusCertificatePreview(memberId);
  }

  return {
    items,
    selectedInternship,
    loading,
    loadingDetails,
    saving,
    errorMessage,
    certificatePreview,
    totalCompletedHours,
    loadInternships,
    loadInternship,
    assignStudentInternship,
    updateProgress,
    previewCertificate,
    previewSurplusCertificate,
  };
});
