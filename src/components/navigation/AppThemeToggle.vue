<script setup lang="ts">
import { computed } from "vue";
import { PhMoon, PhSun } from "@phosphor-icons/vue";

import { t } from "../../i18n";
import { useThemeStore } from "../../stores/theme";

/**
 * Topbar theme switch. Shows the theme it will move to, not the one in force —
 * a moon means "switch to dark", which is what the click does.
 */
const themeStore = useThemeStore();

const label = computed(() =>
  themeStore.isDark ? t("shell.topbar.switchToLight") : t("shell.topbar.switchToDark"),
);
</script>

<template>
  <button type="button" class="topbar__icon-button" :aria-label="label" :title="label" @click="themeStore.toggleTheme">
    <PhMoon v-if="!themeStore.isDark" weight="regular" />
    <PhSun v-else weight="regular" />
  </button>
</template>
