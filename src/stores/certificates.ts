import { computed, ref } from "vue";
import { defineStore } from "pinia";

import type { CertificateKind, CertificateTemplate, IssuedCertificate } from "../types/certificates";
import type { UploadedFile } from "../services/uploads.service";
import {
  attachSignedCertificate,
  generateCertificate,
  listCertificateTemplates,
  listIssuedCertificates,
  removeCertificateTemplate,
  removeSignedCertificate,
  saveCertificateTemplate,
} from "../services/certificates.service";

export const useCertificatesStore = defineStore("certificates", () => {
  const templates = ref<CertificateTemplate[]>([]);
  const issued = ref<IssuedCertificate[]>([]);
  const lastGenerated = ref<IssuedCertificate | null>(null);
  const loading = ref(false);
  const saving = ref(false);
  const errorMessage = ref<string | null>(null);

  const surplusTemplate = computed(() => templates.value.find((template) => template.kind === "surplus") ?? null);
  const fctTemplate = computed(() => templates.value.find((template) => template.kind === "fct") ?? null);
  const signedCount = computed(() => issued.value.filter((certificate) => certificate.signedFile).length);

  function templateFor(kind: CertificateKind) {
    return templates.value.find((template) => template.kind === kind) ?? null;
  }

  function certificateFor(memberId: string, kind: CertificateKind) {
    return issued.value.find((certificate) => certificate.memberId === memberId && certificate.kind === kind) ?? null;
  }

  async function load() {
    loading.value = true;
    errorMessage.value = null;

    try {
      const [loadedTemplates, loadedIssued] = await Promise.all([listCertificateTemplates(), listIssuedCertificates()]);
      templates.value = loadedTemplates;
      issued.value = loadedIssued;
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : "Unable to load certificates.";
    } finally {
      loading.value = false;
    }
  }

  async function runMutation<T>(mutation: () => Promise<T>): Promise<T | null> {
    saving.value = true;
    errorMessage.value = null;

    try {
      const result = await mutation();
      await load();
      return result;
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : "Unexpected error.";
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function uploadTemplate(kind: CertificateKind, file: UploadedFile) {
    return runMutation(() => saveCertificateTemplate(kind, file));
  }

  async function clearTemplate(kind: CertificateKind) {
    return runMutation(() => removeCertificateTemplate(kind));
  }

  async function generate(kind: CertificateKind, memberId: string) {
    const result = await runMutation(() => generateCertificate(kind, memberId));
    lastGenerated.value = result;
    return result;
  }

  async function attachSigned(certificateId: string, file: UploadedFile) {
    return runMutation(() => attachSignedCertificate(certificateId, file));
  }

  async function clearSigned(certificateId: string) {
    return runMutation(() => removeSignedCertificate(certificateId));
  }

  return {
    templates,
    issued,
    lastGenerated,
    loading,
    saving,
    errorMessage,
    surplusTemplate,
    fctTemplate,
    signedCount,
    templateFor,
    certificateFor,
    load,
    uploadTemplate,
    clearTemplate,
    generate,
    attachSigned,
    clearSigned,
  };
});
