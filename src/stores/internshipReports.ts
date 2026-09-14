import { computed, ref } from "vue";
import { t } from "../i18n";
import { defineStore } from "pinia";

import type {
  DailyLogEntry,
  DailyLogFormValues,
  FinalReport,
  FinalReportFormValues,
  FinalReportSummary,
  InternshipJournalSummary,
  MonthlyReport,
  MonthlyReportDraft,
  MonthlyReportSummary,
  ReportReviewFilters,
  ReportReviewValues,
} from "../types/internshipReports";
import {
  buildFinalReportSuggestion,
  buildMonthlyReportDraft,
  countReportsAwaitingReview,
  createDailyLog,
  deleteDailyLog,
  getFinalReport,
  getJournalSummary,
  listAllFinalReports,
  listAllMonthlyReports,
  listDailyLogs,
  listMonthlyReports,
  reopenFinalReport,
  reopenMonthlyReport,
  reviewFinalReport,
  reviewMonthlyReport,
  saveFinalReport,
  saveMonthlyReport,
  submitDailyLog,
  submitFinalReport,
  submitMonthlyReport,
  updateDailyLog,
  type ReportReviewer,
} from "../services/internshipReports.service";
import { useAuthStore } from "../modules/authentication/stores/auth";
import { describeError } from "../utils/errors";

export const useInternshipReportsStore = defineStore("internshipReports", () => {
  const authStore = useAuthStore();

  const dailyLogs = ref<DailyLogEntry[]>([]);
  const journalSummary = ref<InternshipJournalSummary | null>(null);
  const monthlyReports = ref<MonthlyReport[]>([]);
  const monthlyDraft = ref<MonthlyReportDraft | null>(null);
  const finalReport = ref<FinalReport | null>(null);

  /** The reviewer's queues. Same records, seen from the other end. */
  const allMonthlyReports = ref<MonthlyReportSummary[]>([]);
  const allFinalReports = ref<FinalReportSummary[]>([]);
  const awaitingReviewCount = ref(0);
  const reviewFilters = ref<ReportReviewFilters>({ status: "all", memberId: "all" });

  const loading = ref(false);
  const saving = ref(false);
  const errorMessage = ref<string | null>(null);
  const successMessage = ref<string | null>(null);

  const draftEntries = computed(() => dailyLogs.value.filter((entry) => entry.status === "draft"));
  const availableMonths = computed(() => journalSummary.value?.monthsCovered ?? []);

  /** Months the student has journal entries for but no monthly report yet. */
  const monthsWithoutReport = computed(() =>
    availableMonths.value.filter((month) => !monthlyReports.value.some((report) => report.month === month)),
  );

  const reviewer = computed<ReportReviewer>(() => ({
    id: authStore.currentUser?.id ?? "unknown",
    name: authStore.currentUser?.fullName ?? "Administrator",
  }));

  const monthlyAwaitingReview = computed(() =>
    allMonthlyReports.value.filter((report) => report.status === "submitted"),
  );
  const finalAwaitingReview = computed(() =>
    allFinalReports.value.filter((report) => report.status === "submitted"),
  );

  function clearMessages() {
    errorMessage.value = null;
    successMessage.value = null;
  }

  function monthlyReportFor(month: string): MonthlyReport | null {
    return monthlyReports.value.find((report) => report.month === month) ?? null;
  }

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

  /** Everything one student's Internship Reports page needs, in one pass. */
  async function loadStudentReports(studentId: string) {
    loading.value = true;
    errorMessage.value = null;

    try {
      const [entries, summary, monthly, final] = await Promise.all([
        listDailyLogs(studentId),
        getJournalSummary(studentId),
        listMonthlyReports(studentId),
        getFinalReport(studentId),
      ]);

      dailyLogs.value = entries;
      journalSummary.value = summary;
      monthlyReports.value = monthly;
      finalReport.value = final;
    } catch (error) {
      errorMessage.value = describeError(error, t("errors.loadMyReports"));
    } finally {
      loading.value = false;
    }
  }

  /** The reviewer's side: both queues plus the badge count. */
  async function loadReviewQueues() {
    loading.value = true;
    errorMessage.value = null;

    try {
      const [monthly, final, waiting] = await Promise.all([
        listAllMonthlyReports(reviewFilters.value),
        listAllFinalReports(reviewFilters.value),
        countReportsAwaitingReview(),
      ]);

      allMonthlyReports.value = monthly;
      allFinalReports.value = final;
      awaitingReviewCount.value = waiting;
    } catch (error) {
      errorMessage.value = describeError(error, t("errors.loadInternshipReports"));
    } finally {
      loading.value = false;
    }
  }

  async function refreshAwaitingReviewCount() {
    try {
      awaitingReviewCount.value = await countReportsAwaitingReview();
    } catch {
      awaitingReviewCount.value = 0;
    }
  }

  async function runMutation(mutation: () => Promise<unknown>, refresh: () => Promise<void>, success?: string) {
    saving.value = true;
    clearMessages();

    try {
      await mutation();
      await refresh();

      if (success) {
        successMessage.value = success;
      }

      return true;
    } catch (error) {
      errorMessage.value = describeError(error, "Unexpected error.");
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

  async function prepareMonthlyDraft(
    studentId: string,
    month: string,
    range: { periodStart?: string; periodEnd?: string } = {},
  ) {
    loading.value = true;
    clearMessages();

    try {
      monthlyDraft.value = await buildMonthlyReportDraft(studentId, month, range);
      return monthlyDraft.value;
    } catch (error) {
      errorMessage.value = describeError(error, t("errors.generateMonthlyBalance"));
      return null;
    } finally {
      loading.value = false;
    }
  }

  function clearMonthlyDraft() {
    monthlyDraft.value = null;
  }

  async function persistMonthlyReport(studentId: string, draft: MonthlyReportDraft) {
    return runMutation(
      () => saveMonthlyReport(studentId, draft),
      () => loadMonthlyReports(studentId),
      t("common.feedback.monthlySavedDraft"),
    );
  }

  async function submitMonthly(studentId: string, reportId: string) {
    return runMutation(
      () => submitMonthlyReport(reportId),
      () => loadMonthlyReports(studentId),
      t("common.feedback.monthlySubmitted"),
    );
  }

  async function reopenMonthly(studentId: string, reportId: string) {
    return runMutation(
      () => reopenMonthlyReport(reportId, studentId),
      () => loadMonthlyReports(studentId),
      t("common.feedback.reportReopened"),
    );
  }

  async function persistFinalReport(studentId: string, values: FinalReportFormValues) {
    return runMutation(
      () => saveFinalReport(studentId, values),
      () => loadFinalReport(studentId),
      t("common.feedback.finalSavedDraft"),
    );
  }

  async function submitFinal(studentId: string) {
    return runMutation(
      () => submitFinalReport(studentId),
      () => loadFinalReport(studentId),
      t("common.feedback.finalSubmitted"),
    );
  }

  async function reopenFinal(studentId: string) {
    return runMutation(
      () => reopenFinalReport(studentId),
      () => loadFinalReport(studentId),
      t("common.feedback.finalReopened"),
    );
  }

  async function suggestFinalReport(
    studentId: string,
    hostEntity: string,
    range: { periodStart?: string; periodEnd?: string } = {},
  ) {
    return buildFinalReportSuggestion(studentId, hostEntity, range);
  }

  async function reviewMonthly(reportId: string, values: ReportReviewValues) {
    return runMutation(
      () => reviewMonthlyReport(reportId, values, reviewer.value),
      loadReviewQueues,
      values.decision === "approved" ? "Monthly report approved." : t("common.feedback.monthlyReturned"),
    );
  }

  async function reviewFinal(studentId: string, values: ReportReviewValues) {
    return runMutation(
      () => reviewFinalReport(studentId, values, reviewer.value),
      loadReviewQueues,
      values.decision === "approved" ? "Final report approved." : t("common.feedback.finalReturned"),
    );
  }

  return {
    dailyLogs,
    journalSummary,
    monthlyReports,
    monthlyDraft,
    finalReport,
    allMonthlyReports,
    allFinalReports,
    awaitingReviewCount,
    reviewFilters,
    loading,
    saving,
    errorMessage,
    successMessage,
    draftEntries,
    availableMonths,
    monthsWithoutReport,
    monthlyAwaitingReview,
    finalAwaitingReview,
    clearMessages,
    monthlyReportFor,
    loadJournal,
    loadMonthlyReports,
    loadFinalReport,
    loadStudentReports,
    loadReviewQueues,
    refreshAwaitingReviewCount,
    addDailyLog,
    editDailyLog,
    submitEntry,
    removeEntry,
    prepareMonthlyDraft,
    clearMonthlyDraft,
    persistMonthlyReport,
    submitMonthly,
    reopenMonthly,
    persistFinalReport,
    submitFinal,
    reopenFinal,
    suggestFinalReport,
    reviewMonthly,
    reviewFinal,
  };
});
