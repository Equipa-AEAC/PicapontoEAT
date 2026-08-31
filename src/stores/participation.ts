import { computed, ref } from "vue";
import { defineStore } from "pinia";

import type {
  MemberParticipationHours,
  ParticipationPeriod,
  ParticipationPeriodFormValues,
} from "../types/participation";
import {
  deleteParticipationPeriod,
  getParticipationHours,
  listParticipationPeriods,
  saveParticipationPeriod,
} from "../services/participation.service";
import { describeError } from "../utils/errors";

/**
 * One member's participation history, and the hours it splits their attendance into.
 *
 * Periods and hours load together because they are never useful apart: a period
 * without its hours does not answer the question staff open the page to ask, and
 * an hour total without the period it belongs to is the ambiguous number this
 * whole change exists to remove.
 */
export const useParticipationStore = defineStore("participation", () => {
  const periods = ref<ParticipationPeriod[]>([]);
  const hours = ref<MemberParticipationHours | null>(null);
  const loading = ref(false);
  const saving = ref(false);
  const errorMessage = ref<string | null>(null);

  /** Newest first — a timeline reads top-down from what is true now. */
  const timeline = computed(() => (hours.value ? hours.value.periods.slice().reverse() : []));

  /** The period still running, if any. */
  const currentPeriod = computed(() => periods.value.find((period) => period.endDate === null) ?? null);

  /** Attendance nobody can account for. Worth surfacing rather than hiding. */
  const hasUnclassified = computed(() => (hours.value?.unclassifiedDays ?? 0) > 0);

  async function load(memberId: string) {
    if (!memberId) {
      periods.value = [];
      hours.value = null;
      return;
    }

    loading.value = true;
    errorMessage.value = null;

    try {
      const [loadedPeriods, loadedHours] = await Promise.all([
        listParticipationPeriods(memberId),
        getParticipationHours(memberId),
      ]);

      periods.value = loadedPeriods;
      hours.value = loadedHours;
    } catch (error) {
      errorMessage.value = describeError(error, "This member's participation history could not be loaded.");
    } finally {
      loading.value = false;
    }
  }

  /** Returns true when the write succeeded, so the caller can close its dialog. */
  async function save(memberId: string, values: ParticipationPeriodFormValues, periodId?: string) {
    saving.value = true;
    errorMessage.value = null;

    try {
      await saveParticipationPeriod(memberId, values, periodId);
      await load(memberId);
      return true;
    } catch (error) {
      errorMessage.value = describeError(error, "That participation period could not be saved.");
      return false;
    } finally {
      saving.value = false;
    }
  }

  async function remove(memberId: string, periodId: string) {
    saving.value = true;
    errorMessage.value = null;

    try {
      await deleteParticipationPeriod(periodId);
      await load(memberId);
      return true;
    } catch (error) {
      errorMessage.value = describeError(error, "That participation period could not be removed.");
      return false;
    } finally {
      saving.value = false;
    }
  }

  return {
    periods,
    hours,
    loading,
    saving,
    errorMessage,
    timeline,
    currentPeriod,
    hasUnclassified,
    load,
    save,
    remove,
  };
});
