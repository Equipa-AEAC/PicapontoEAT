import { computed, ref } from "vue";
import { defineStore } from "pinia";

import type { StudentAlertCategory, StudentPreferences } from "../types/studentPreferences";
import { defaultStudentPreferences } from "../types/studentPreferences";

const STORAGE_KEY = "picaponto.student.preferences";

/**
 * Student portal preferences, read before the first paint and written on change.
 *
 * Mirrors `useThemeStore`, which already keeps a per-device preference in
 * `localStorage` — same storage, same shape of failure handling, so there is one
 * convention for "a setting this browser remembers" rather than two.
 *
 * BACKEND CONTRACT: this is per browser, not per account. See
 * `src/types/studentPreferences.ts` for the endpoint that should replace it.
 */
export const useStudentPreferencesStore = defineStore("studentPreferences", () => {
  const preferences = ref<StudentPreferences>(read());

  function read(): StudentPreferences {
    const fallback = defaultStudentPreferences();

    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        return fallback;
      }

      const parsed = JSON.parse(raw) as Partial<StudentPreferences>;

      return {
        // Spread over the defaults so a category added later is on, not undefined.
        alerts: { ...fallback.alerts, ...(parsed.alerts ?? {}) },
        sidebarOrder: Array.isArray(parsed.sidebarOrder) ? parsed.sidebarOrder.filter((n) => typeof n === "string") : [],
      };
    } catch {
      // A corrupt or unavailable store is not worth failing a page load over.
      return fallback;
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences.value));
    } catch {
      // Private-mode browsers refuse writes; the preference simply does not survive.
    }
  }

  const sidebarOrder = computed(() => preferences.value.sidebarOrder);

  function alertEnabled(category: StudentAlertCategory): boolean {
    return preferences.value.alerts[category] !== false;
  }

  function setAlert(category: StudentAlertCategory, enabled: boolean) {
    preferences.value.alerts[category] = enabled;
    persist();
  }

  function setSidebarOrder(order: string[]) {
    preferences.value.sidebarOrder = [...order];
    persist();
  }

  /** Back to the shipped order. The stored list is cleared rather than rebuilt. */
  function resetSidebarOrder() {
    preferences.value.sidebarOrder = [];
    persist();
  }

  function resetAll() {
    preferences.value = defaultStudentPreferences();
    persist();
  }

  return {
    preferences,
    sidebarOrder,
    alertEnabled,
    setAlert,
    setSidebarOrder,
    resetSidebarOrder,
    resetAll,
  };
});
