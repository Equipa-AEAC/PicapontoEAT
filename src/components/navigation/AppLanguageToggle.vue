<script setup lang="ts">
import { computed, ref } from "vue";
import { PhCheck, PhTranslate } from "@phosphor-icons/vue";

import { SUPPORTED_LOCALES, currentLocale, setLocale } from "../../i18n";
import type { AppLocale } from "../../i18n";

/**
 * The language switch, next to the theme switch.
 *
 * Two languages, so this is a two-state control rather than a select: the whole
 * list fits in the menu and each option is written **in its own language**, which
 * is the one label a reader who cannot read the current interface can still
 * recognise. That is also why it is an icon in the topbar rather than a setting
 * buried three screens in — somebody who lands in the wrong language has to be
 * able to get out without reading anything.
 *
 * The choice is stored, so it survives a reload. See `i18n/index.ts`.
 */
const open = ref(false);

const active = computed(() => currentLocale());

const activeLabel = computed(
  () => SUPPORTED_LOCALES.find((locale) => locale.value === active.value)?.label ?? "",
);

function choose(locale: AppLocale) {
  setLocale(locale);
  open.value = false;
}

/**
 * Closing on `focusout` fires on `mousedown`, before the option's own `click`
 * — since blur happens before click in that sequence, a bare `open = false`
 * here unmounts the menu item (`v-if="open"`) before its click can land, and
 * a language pick silently does nothing. Only close when focus actually left
 * the toggle, not when it moved to one of its own menu items.
 */
function handleFocusOut(event: FocusEvent) {
  const next = event.relatedTarget as Node | null;
  if (next && (event.currentTarget as HTMLElement).contains(next)) return;
  open.value = false;
}
</script>

<template>
  <div class="language-toggle" @focusout="handleFocusOut">
    <button
      type="button"
      class="topbar__icon-button"
      :aria-label="$t('shell.topbar.languageLabel')"
      :title="`${$t('shell.topbar.languageLabel')} — ${activeLabel}`"
      :aria-expanded="open"
      aria-haspopup="menu"
      @click="open = !open"
    >
      <PhTranslate weight="regular" />
    </button>

    <ul v-if="open" class="language-toggle__menu" role="menu">
      <li v-for="locale in SUPPORTED_LOCALES" :key="locale.value">
        <button
          type="button"
          class="language-toggle__option"
          :class="{ 'language-toggle__option--active': locale.value === active }"
          role="menuitemradio"
          :aria-checked="locale.value === active"
          @click="choose(locale.value)"
        >
          <span>{{ locale.label }}</span>
          <PhCheck v-if="locale.value === active" weight="bold" />
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.language-toggle {
  position: relative;
}

.language-toggle__menu {
  position: absolute;
  top: calc(100% + var(--space-2));
  right: 0;
  z-index: 40;
  min-width: 160px;
  margin: 0;
  padding: var(--space-1);
  list-style: none;
  border: var(--border-width) solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface-elevated);
  box-shadow: var(--shadow-md);
}

.language-toggle__option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--foreground);
  font-size: var(--text-base);
  text-align: left;
  cursor: pointer;
}

.language-toggle__option:hover {
  background: var(--hover);
}

.language-toggle__option--active {
  color: var(--primary-contrast);
  background: var(--primary-subtle);
  font-weight: var(--weight-medium);
}

.language-toggle__option svg {
  width: 14px;
  height: 14px;
}
</style>
