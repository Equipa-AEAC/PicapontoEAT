import { computed, ref } from "vue";
import { defineStore } from "pinia";

import type { ThemeMode, ResolvedTheme } from "../types/theme";

const THEME_STORAGE_KEY = "picaponto.theme";

/**
 * Light is the product default. `system` is opt-in rather than the fallback: an
 * administrator who never touches the setting should always get the same interface,
 * regardless of what their OS happens to be set to.
 */
const DEFAULT_MODE: ThemeMode = "light";

function prefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function readStoredMode(): ThemeMode {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system" ? stored : DEFAULT_MODE;
}

/**
 * Writes the resolved theme onto <html>. Every token override in `tokens.css` hangs
 * off this one attribute, so this is the only place in the application that has to
 * know a theme switch happened.
 */
function applyToDocument(theme: ResolvedTheme) {
  document.documentElement.dataset.theme = theme;
}

export const useThemeStore = defineStore("theme", () => {
  const mode = ref<ThemeMode>(DEFAULT_MODE);
  /** Tracks the OS preference so `system` mode reacts without a reload. */
  const systemPrefersDark = ref(prefersDark());

  const resolvedTheme = computed<ResolvedTheme>(() => {
    if (mode.value === "system") {
      return systemPrefersDark.value ? "dark" : "light";
    }

    return mode.value;
  });

  const isDark = computed(() => resolvedTheme.value === "dark");

  function setMode(nextMode: ThemeMode, persist = true) {
    mode.value = nextMode;

    if (persist) {
      localStorage.setItem(THEME_STORAGE_KEY, nextMode);
    }

    applyToDocument(resolvedTheme.value);
  }

  /**
   * The topbar switch. Flips to the opposite of what is currently on screen, which
   * also resolves `system` into an explicit choice — that is what the user just made.
   */
  function toggleTheme() {
    setMode(isDark.value ? "light" : "dark");
  }

  /**
   * Called once before the app mounts, so the first paint is already in the right
   * theme rather than flashing light and correcting itself.
   */
  function initTheme() {
    mode.value = readStoredMode();
    applyToDocument(resolvedTheme.value);

    const query = window.matchMedia("(prefers-color-scheme: dark)");
    query.addEventListener("change", (event) => {
      systemPrefersDark.value = event.matches;

      if (mode.value === "system") {
        applyToDocument(resolvedTheme.value);
      }
    });
  }

  /**
   * Applies the theme stored in application settings without overwriting the local
   * choice — settings supply the institutional default, the switch is personal.
   */
  function syncFromSettings(settingsMode: ThemeMode) {
    if (localStorage.getItem(THEME_STORAGE_KEY)) {
      return;
    }

    setMode(settingsMode, false);
  }

  return {
    mode,
    resolvedTheme,
    isDark,
    setMode,
    toggleTheme,
    initTheme,
    syncFromSettings,
  };
});
