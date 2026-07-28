import { computed, ref } from "vue";
import { defineStore } from "pinia";

import type { InternshipDetails, InternshipFormValues, InternshipProgressUpdateValues, InternshipSummary } from "../types/internships";
import { assignInternship, generateCertificatePreview, getInternshipByStudentId, listInternships, updateInternshipProgress } from "../services/internships.service";

export const useInternshipsStore = defineStore("internships", () => {
  const items = ref<InternshipSummary[]>([]);
  const selectedInternship = ref<InternshipDetails | null>(null);
  const loading = ref(false);
  const loadingDetails = ref(false);
  const saving = ref(false);
  const certificatePreview = ref<{ fileName: string; issuedAt: string; summary: string } | null>(null);

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
    try {
      await assignInternship(values);
      await loadInternships();
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

  async function previewCertificate(studentId: string) {
    certificatePreview.value = await generateCertificatePreview(studentId);
  }

  return {
    items,
    selectedInternship,
    loading,
    loadingDetails,
    saving,
    certificatePreview,
    totalCompletedHours,
    loadInternships,
    loadInternship,
    assignStudentInternship,
    updateProgress,
    previewCertificate,
  };
});
