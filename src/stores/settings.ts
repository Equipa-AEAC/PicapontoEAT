import { ref } from "vue";
import { defineStore } from "pinia";

import type { ApplicationSettings } from "../types/settings";
import { getSettings, saveSettings } from "../services/settings.service";

export const useSettingsStore = defineStore("settings", () => {
  const value = ref<ApplicationSettings | null>(null);
  const loading = ref(false);
  const saving = ref(false);

  async function loadSettings() {
    loading.value = true;
    try {
      value.value = await getSettings();
    } finally {
      loading.value = false;
    }
  }

  async function persistSettings(nextValue: ApplicationSettings) {
    saving.value = true;
    try {
      value.value = await saveSettings(nextValue);
    } finally {
      saving.value = false;
    }
  }

  return {
    value,
    loading,
    saving,
    loadSettings,
    persistSettings,
  };
});
