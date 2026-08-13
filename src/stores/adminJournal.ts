import { computed, ref } from "vue";
import { defineStore } from "pinia";

import type { Project, TeamJournalEntry, TeamJournalFilters, TeamJournalSummary } from "../types/internshipReports";
import { getTeamJournalSummary, listAllDailyLogs, listProjects } from "../services/internshipReports.service";

/**
 * The admin-side view of the daily work journal. `useInternshipReportsStore` is
 * scoped to one member writing their own entries; this one reads across everyone.
 */
export const useAdminJournalStore = defineStore("adminJournal", () => {
  const entries = ref<TeamJournalEntry[]>([]);
  const projects = ref<Project[]>([]);
  const summary = ref<TeamJournalSummary | null>(null);
  const filters = ref<TeamJournalFilters>({ query: "", memberId: "all", projectId: "all", month: "all", status: "all" });
  const loading = ref(false);
  const errorMessage = ref<string | null>(null);

  /** Months that actually have entries, newest first — drives the month filter. */
  const availableMonths = computed(() =>
    [...new Set(entries.value.map((entry) => entry.date.slice(0, 7)))].sort((first, second) => second.localeCompare(first)),
  );

  /** Members who have not written anything for more than two weeks. */
  const staleContributors = computed(
    () => summary.value?.coverage.filter((row) => row.daysSinceLastEntry === null || row.daysSinceLastEntry > 14) ?? [],
  );

  const draftEntries = computed(() => entries.value.filter((entry) => entry.status === "draft"));

  async function loadJournal() {
    loading.value = true;
    errorMessage.value = null;

    try {
      const [loadedEntries, loadedSummary, loadedProjects] = await Promise.all([
        listAllDailyLogs(filters.value),
        getTeamJournalSummary(),
        listProjects(),
      ]);
      entries.value = loadedEntries;
      summary.value = loadedSummary;
      projects.value = loadedProjects;
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : "Unable to load the work journal.";
    } finally {
      loading.value = false;
    }
  }

  function resetFilters() {
    filters.value = { query: "", memberId: "all", projectId: "all", month: "all", status: "all" };
  }

  return {
    entries,
    projects,
    summary,
    filters,
    loading,
    errorMessage,
    availableMonths,
    staleContributors,
    draftEntries,
    loadJournal,
    resetFilters,
  };
});
