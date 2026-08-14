import { computed, ref } from "vue";
import { defineStore } from "pinia";

import type {
  DailyLogEntry,
  DailyLogFormValues,
  FinalReport,
  FinalReportFormValues,
  InternshipJournalSummary,
  MonthlyReport,
  MonthlyReportDraft,
} from "../types/internshipReports";
import {
  buildFinalReportSuggestion,
  buildMonthlyReportDraft,
  createDailyLog,
  deleteDailyLog,
  getFinalReport,
  getJournalSummary,
  listDailyLogs,
  listMonthlyReports,
  saveFinalReport,
  saveMonthlyReport,
  submitDailyLog,
  submitFinalReport,
  submitMonthlyReport,
  updateDailyLog,
} from "../services/internshipReports.service";

export const useInternshipReportsStore = defineStore("internshipReports", () => {
  const dailyLogs = ref<DailyLogEntry[]>([]);
  const journalSummary = ref<InternshipJournalSummary | null>(null);
  const monthlyReports = ref<MonthlyReport[]>([]);
  const monthlyDraft = ref<MonthlyReportDraft | null>(null);
  const finalReport = ref<FinalReport | null>(null);
  const loading = ref(false);
  const saving = ref(false);
  const errorMessage = ref<string | null>(null);

  const draftEntries = computed(() => dailyLogs.value.filter((entry) => entry.status === "draft"));
  const availableMonths = computed(() => journalSummary.value?.monthsCovered ?? []);

  async function loadJournal(studentId: string) {
    loading.value = true;
    try {
      const [entries, summary] = await Promise.all([listDailyLogs(studentId), getJournalSummary(studentId)]);
      dailyLogs.value = entries;
      journalSummary.value = summary;
    } finally {
      loading.value = false;
    }
  }

  async function loadMonthlyReports(studentId: string) {
    loading.value = true;
    try {
      monthlyReports.value = await listMonthlyReports(studentId);
    } finally {
      loading.value = false;
    }
  }

  async function loadFinalReport(studentId: string) {
    loading.value = true;
    try {
      finalReport.value = await getFinalReport(studentId);
    } finally {
      loading.value = false;
    }
  }

  async function runMutation(mutation: () => Promise<unknown>, refresh: () => Promise<void>) {
    saving.value = true;
    errorMessage.value = null;
    try {
      await mutation();
      await refresh();
      return true;
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : "Unexpected error.";
      return false;
    } finally {
      saving.value = false;
    }
  }

  async function addDailyLog(studentId: string, values: DailyLogFormValues) {
    return runMutation(() => createDailyLog(studentId, values), () => loadJournal(studentId));
  }

  async function editDailyLog(studentId: string, entryId: string, values: DailyLogFormValues) {
    return runMutation(() => updateDailyLog(entryId, values), () => loadJournal(studentId));
  }

  async function submitEntry(studentId: string, entryId: string) {
    return runMutation(() => submitDailyLog(entryId), () => loadJournal(studentId));
  }

  async function removeEntry(studentId: string, entryId: string) {
    return runMutation(() => deleteDailyLog(entryId), () => loadJournal(studentId));
  }

  async function prepareMonthlyDraft(studentId: string, month: string) {
    loading.value = true;
    try {
      monthlyDraft.value = await buildMonthlyReportDraft(studentId, month);
    } finally {
      loading.value = false;
    }
  }

  async function persistMonthlyReport(studentId: string, draft: MonthlyReportDraft) {
    return runMutation(() => saveMonthlyReport(studentId, draft), () => loadMonthlyReports(studentId));
  }

  async function submitMonthly(studentId: string, reportId: string) {
    return runMutation(() => submitMonthlyReport(reportId), () => loadMonthlyReports(studentId));
  }

  async function persistFinalReport(studentId: string, values: FinalReportFormValues) {
    return runMutation(() => saveFinalReport(studentId, values), () => loadFinalReport(studentId));
  }

  async function submitFinal(studentId: string) {
    return runMutation(() => submitFinalReport(studentId), () => loadFinalReport(studentId));
  }

  async function suggestFinalReport(studentId: string, hostEntity: string) {
    return buildFinalReportSuggestion(studentId, hostEntity);
  }

  return {
    dailyLogs,
    journalSummary,
    monthlyReports,
    monthlyDraft,
    finalReport,
    loading,
    saving,
    errorMessage,
    draftEntries,
    availableMonths,
    loadJournal,
    loadMonthlyReports,
    loadFinalReport,
    addDailyLog,
    editDailyLog,
    submitEntry,
    removeEntry,
    prepareMonthlyDraft,
    persistMonthlyReport,
    submitMonthly,
    persistFinalReport,
    submitFinal,
    suggestFinalReport,
  };
});
