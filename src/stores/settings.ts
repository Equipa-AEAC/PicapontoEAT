import { ref } from "vue";
import { t } from "../i18n";
import { defineStore } from "pinia";

import type { ApplicationSettings } from "../types/settings";
import { getSettings, saveSettings } from "../services/settings.service";
import { describeError } from "../utils/errors";

export const useSettingsStore = defineStore("settings", () => {
  const value = ref<ApplicationSettings | null>(null);
  const loading = ref(false);
  const saving = ref(false);
  /** A failed request must never be shown as an empty result. */
  const errorMessage = ref<string | null>(null);

  async function loadSettings() {
    loading.value = true;
    errorMessage.value = null;

    try {
      value.value = await getSettings();
    } catch (error) {
      errorMessage.value = describeError(error, t("errors.loadSettings"));
    } finally {
      loading.value = false;
    }
  }

  async function persistSettings(nextValue: ApplicationSettings) {
    saving.value = true;
    errorMessage.value = null;

    try {
      value.value = await saveSettings(nextValue);
    } catch (error) {
      errorMessage.value = describeError(error, t("errors.saveSettings"));
      throw error;
    } finally {
      saving.value = false;
    }
  }

  return {
    value,
    loading,
    saving,
    errorMessage,
    loadSettings,
    persistSettings,
  };
});
