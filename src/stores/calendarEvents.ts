import { computed, ref } from "vue";
import { t } from "../i18n";
import { defineStore } from "pinia";

import type {
  CalendarEvent,
  CalendarEventFilters,
  CalendarEventFormValues,
} from "../types/calendarEvents";
import {
  deleteCalendarEvent,
  listAllEvents,
  listEventsForMember,
  saveCalendarEvent,
  type CalendarAuthor,
} from "../services/calendarEvents.service";
import { describeError } from "../utils/errors";

const EMPTY_FILTERS: CalendarEventFilters = {
  visibility: "all",
  category: "all",
  projectId: "all",
  authorId: "all",
};

export const useCalendarEventsStore = defineStore("calendarEvents", () => {
  const items = ref<CalendarEvent[]>([]);
  const filters = ref<CalendarEventFilters>({ ...EMPTY_FILTERS });
  const loading = ref(false);
  const saving = ref(false);
  /** A failed request must never be shown as an empty calendar. */
  const errorMessage = ref<string | null>(null);

  const hasActiveFilters = computed(
    () =>
      filters.value.visibility !== "all" ||
      filters.value.category !== "all" ||
      filters.value.projectId !== "all" ||
      filters.value.authorId !== "all",
  );

  /** Events keyed by `YYYY-MM-DD`, so a calendar cell is one lookup. */
  const byDate = computed(() => {
    const map = new Map<string, CalendarEvent[]>();

    for (const event of items.value) {
      const bucket = map.get(event.date) ?? [];
      bucket.push(event);
      map.set(event.date, bucket);
    }

    return map;
  });

  function eventsOn(date: string): CalendarEvent[] {
    return byDate.value.get(date) ?? [];
  }

  async function loadForMember(memberId: string) {
    loading.value = true;
    errorMessage.value = null;

    try {
      items.value = memberId ? await listEventsForMember(memberId) : [];
    } catch (error) {
      errorMessage.value = describeError(error, t("errors.loadMyCalendar"));
    } finally {
      loading.value = false;
    }
  }

  async function loadAll() {
    loading.value = true;
    errorMessage.value = null;

    try {
      items.value = await listAllEvents(filters.value);
    } catch (error) {
      errorMessage.value = describeError(error, t("errors.loadCalendar"));
    } finally {
      loading.value = false;
    }
  }

  function resetFilters() {
    filters.value = { ...EMPTY_FILTERS };
  }

  async function save(
    values: CalendarEventFormValues,
    author: CalendarAuthor,
    reload: () => Promise<void>,
    eventId?: string,
  ) {
    saving.value = true;
    errorMessage.value = null;

    try {
      await saveCalendarEvent(values, author, eventId);
      await reload();
      return true;
    } catch (error) {
      errorMessage.value = describeError(error, t("errors.saveEvent"));
      return false;
    } finally {
      saving.value = false;
    }
  }

  async function remove(eventId: string, author: CalendarAuthor, reload: () => Promise<void>) {
    saving.value = true;
    errorMessage.value = null;

    try {
      await deleteCalendarEvent(eventId, author);
      await reload();
      return true;
    } catch (error) {
      errorMessage.value = describeError(error, t("errors.removeEvent"));
      return false;
    } finally {
      saving.value = false;
    }
  }

  return {
    items,
    filters,
    loading,
    saving,
    errorMessage,
    hasActiveFilters,
    byDate,
    eventsOn,
    loadForMember,
    loadAll,
    resetFilters,
    save,
    remove,
  };
});
