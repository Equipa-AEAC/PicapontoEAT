<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { PhArrowCounterClockwise, PhArrowDown, PhArrowUp, PhDesktop, PhMoon, PhSun, PhTranslate } from "@phosphor-icons/vue";

import {
  BaseButton,
  BaseCard,
  BaseErrorState,
  BasePageHeader,
  BaseToggleSwitch,
} from "../../../../shared/components/base";
import { useAuthStore } from "../../../../modules/authentication";
import { usePortalStore, useStudentPreferencesStore, useThemeStore } from "../../../../shared/stores";
import type { StudentAlertCategory, ThemeMode } from "../../../../shared/types";
import { STUDENT_ALERT_CATEGORIES, applySidebarOrder } from "../../../../shared/types";
import type { AppLocale } from "../../../../i18n";
import { SUPPORTED_LOCALES, currentLocale, setLocale, t } from "../../../../i18n";
import { studentNavigationEntries } from "../../../../app/router/studentNavigation";

/**
 * Student settings.
 *
 * The rule this page is written to has not changed: it only offers preferences
 * that actually take effect. What changed is what the portal can honour.
 *
 * Notification toggles were absent because nothing delivers email or push — and
 * that is still true. These are not delivery switches. They decide what appears
 * on the portal's own alert surface (the dashboard's "Needs your attention"
 * list), every category backed by a collection the portal already loads. The
 * copy says so rather than implying a message is being sent somewhere.
 *
 * Sidebar order is cosmetic and reversible by construction: the preference is a
 * list of names applied over the canonical navigation, so it can reorder pages
 * and cannot remove one.
 */
const router = useRouter();
const portalStore = usePortalStore();
const themeStore = useThemeStore();
const authStore = useAuthStore();
const preferencesStore = useStudentPreferencesStore();

/**
 * The member whose data this page shows, resolved from the session.
 *
 * Falls back to an empty id rather than a hardcoded member: an empty id matches
 * nobody, so a session without a member sees nothing instead of somebody else's
 * records. This is a safe *default*, not authorization.
 */
const memberId = computed(() => authStore.currentMemberId ?? "");

const profile = computed(() => portalStore.summary?.profile);

/**
 * The language, alongside the theme.
 *
 * `activeLocale` is a `computed` rather than a snapshot so the selected option
 * follows a change made anywhere else — the topbar switch, most obviously.
 */
const activeLocale = computed(() => currentLocale());

function chooseLocale(next: AppLocale) {
  setLocale(next);
}

const themeOptions: { value: ThemeMode; label: string; hint: string; icon: typeof PhSun }[] = [
  {
    value: "light",
    label: t("student.settings.themeLight"),
    hint: t("student.settings.themeLightHint"),
    icon: PhSun,
  },
  { value: "dark", label: t("student.settings.themeDark"), hint: t("student.settings.themeDarkHint"), icon: PhMoon },
  {
    value: "system",
    label: t("student.settings.themeSystem"),
    hint: t("student.settings.themeSystemHint"),
    icon: PhDesktop,
  },
];

/* --------------------------------------------------------------- Alerts */

const alertCategories = STUDENT_ALERT_CATEGORIES;

function alertEnabled(category: StudentAlertCategory) {
  return preferencesStore.alertEnabled(category);
}

function toggleAlert(category: StudentAlertCategory, enabled: boolean) {
  preferencesStore.setAlert(category, enabled);
}

/* -------------------------------------------------------- Sidebar order */

/**
 * The working copy, applied on every change.
 *
 * Held locally so a move is one array operation rather than a store round trip,
 * and written straight back — there is no Save button, because a reorder you can
 * see happen has nothing left to confirm.
 */
const orderedEntries = ref(applySidebarOrder(studentNavigationEntries, preferencesStore.sidebarOrder));

const isDefaultOrder = computed(() => preferencesStore.sidebarOrder.length === 0);

function persistOrder() {
  preferencesStore.setSidebarOrder(orderedEntries.value.map((entry) => entry.name));
}

function move(index: number, step: number) {
  const target = index + step;

  if (target < 0 || target >= orderedEntries.value.length) {
    return;
  }

  const next = [...orderedEntries.value];
  const [entry] = next.splice(index, 1);
  next.splice(target, 0, entry!);
  orderedEntries.value = next;
  persistOrder();
}

function resetOrder() {
  preferencesStore.resetSidebarOrder();
  orderedEntries.value = applySidebarOrder(studentNavigationEntries, []);
}

async function signOut() {
  await authStore.logout();
  await router.push({ name: "login" });
}

onMounted(async () => {
  if (!portalStore.summary) {
    await portalStore.loadPortalSummary(memberId.value);
  }
});
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      :title="$t('student.settings.title')"
      :description="$t('student.settings.description')"
    />

    <BaseErrorState
      v-if="portalStore.errorMessage"
      :message="portalStore.errorMessage"
      @retry="portalStore.loadPortalSummary(memberId)"
    />

    <BaseCard
      :title="$t('student.settings.appearanceTitle')"
      :description="$t('student.settings.appearanceDescription')"
    >
      <div class="theme-choice" role="radiogroup" :aria-label="$t('student.settings.themeGroup')">
        <button
          v-for="option in themeOptions"
          :key="option.value"
          type="button"
          role="radio"
          class="theme-choice__option"
          :class="{ 'theme-choice__option--active': themeStore.mode === option.value }"
          :aria-checked="themeStore.mode === option.value"
          @click="themeStore.setMode(option.value)"
        >
          <component :is="option.icon" weight="regular" />
          <span class="theme-choice__label">{{ option.label }}</span>
          <span class="theme-choice__hint type-meta">{{ option.hint }}</span>
        </button>
      </div>
    </BaseCard>

    <!--
      The language switch is a setting, so it is also here — not only in the
      topbar. Somebody looking for it will look in Settings first.
    -->
    <BaseCard
      :title="$t('student.settings.languageTitle')"
      :description="$t('student.settings.languageDescription')"
    >
      <div class="theme-choice" role="radiogroup" :aria-label="$t('common.language.label')">
        <button
          v-for="option in SUPPORTED_LOCALES"
          :key="option.value"
          type="button"
          role="radio"
          class="theme-choice__option"
          :class="{ 'theme-choice__option--active': activeLocale === option.value }"
          :aria-checked="activeLocale === option.value"
          @click="chooseLocale(option.value)"
        >
          <PhTranslate weight="regular" />
          <span class="theme-choice__label">{{ option.label }}</span>
          <span class="theme-choice__hint type-meta">{{ option.tag }}</span>
        </button>
      </div>
    </BaseCard>

    <BaseCard
      :title="$t('student.settings.alertsTitle')"
      :description="$t('student.settings.alertsDescription')"
    >
      <ul class="pref-list">
        <li v-for="category in alertCategories" :key="category" class="pref-list__row">
          <div class="pref-list__main">
            <span class="pref-list__label">{{ $t(`student.alertCategory.${category}`) }}</span>
            <span class="type-meta">{{ $t(`student.alertHint.${category}`) }}</span>
          </div>
          <BaseToggleSwitch
            :model-value="alertEnabled(category)"
            :aria-label="$t(`student.alertCategory.${category}`)"
            @update:model-value="toggleAlert(category, $event)"
          />
        </li>
      </ul>
    </BaseCard>

    <BaseCard
      :title="$t('student.settings.sidebarTitle')"
      :description="$t('student.settings.sidebarDescription')"
    >
      <ol class="order-list">
        <li v-for="(entry, index) in orderedEntries" :key="entry.name" class="order-list__row">
          <span class="order-list__position type-numeric">{{ index + 1 }}</span>
          <span class="order-list__icon" aria-hidden="true">
            <component :is="entry.icon" weight="regular" />
          </span>
          <span class="order-list__label">{{ $t(entry.label) }}</span>

          <div class="order-list__actions">
            <BaseButton
              severity="secondary"
              text
              size="small"
              :disabled="index === 0"
              :aria-label="$t('student.settings.moveUp', { label: $t(entry.label) })"
              @click="move(index, -1)"
            >
              <PhArrowUp weight="bold" />
            </BaseButton>
            <BaseButton
              severity="secondary"
              text
              size="small"
              :disabled="index === orderedEntries.length - 1"
              :aria-label="$t('student.settings.moveDown', { label: $t(entry.label) })"
              @click="move(index, 1)"
            >
              <PhArrowDown weight="bold" />
            </BaseButton>
          </div>
        </li>
      </ol>

      <template #footer>
        <p class="type-meta order-footer-note">
          {{ isDefaultOrder ? $t("student.settings.sidebarDefault") : $t("student.settings.sidebarCustom") }}
        </p>
        <BaseButton severity="secondary" outlined :disabled="isDefaultOrder" @click="resetOrder">
          <PhArrowCounterClockwise weight="bold" />
          {{ $t("student.settings.resetOrder") }}
        </BaseButton>
      </template>
    </BaseCard>

    <BaseCard
      :title="$t('student.settings.accessTitle')"
      :description="$t('student.settings.accessDescription')"
    >
      <p class="type-body-secondary access-note">
        {{ $t("student.settings.signedInAs") }}
        <strong>{{ authStore.currentUser?.fullName ?? profile?.fullName ?? $t("student.settings.thisAccount") }}</strong
        >. {{ $t("student.settings.accessNote") }}
      </p>

      <template #footer>
        <BaseButton
          :label="$t('student.settings.openProfile')"
          severity="secondary"
          text
          @click="router.push({ name: 'student-profile' })"
        />
        <BaseButton :label="$t('common.actions.signOut')" severity="danger" outlined @click="signOut" />
      </template>
    </BaseCard>

    <p class="type-meta settings-note">
      {{ $t("student.settings.storedLocally") }}
    </p>
  </section>
</template>

<style scoped>
.theme-choice {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-3);
}

.theme-choice__option {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  grid-template-rows: auto auto;
  align-items: center;
  gap: 0 var(--space-3);
  padding: var(--space-3) var(--space-4);
  border: var(--border-width) solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  color: var(--foreground);
  text-align: left;
  cursor: pointer;
}

.theme-choice__option:hover {
  background: var(--hover);
}

.theme-choice__option--active {
  border-color: var(--primary);
  background: var(--primary-subtle);
}

.theme-choice__option svg {
  grid-row: span 2;
  width: 20px;
  height: 20px;
  color: var(--foreground-secondary);
}

.theme-choice__option--active svg {
  color: var(--primary);
}

.theme-choice__label {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
}

.pref-list,
.order-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.pref-list__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3) 0;
}

.pref-list__row:not(:last-child),
.order-list__row:not(:last-child) {
  border-bottom: var(--border-width) solid var(--border-subtle);
}

.pref-list__main {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.pref-list__label,
.order-list__label {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--foreground);
}

.order-list__row {
  display: grid;
  grid-template-columns: 2ch auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
}

.order-list__position {
  color: var(--foreground-muted);
  font-size: var(--text-xs);
}

.order-list__icon {
  display: grid;
  place-items: center;
  color: var(--foreground-secondary);
}

.order-list__icon svg {
  width: 16px;
  height: 16px;
}

.order-list__actions {
  display: inline-flex;
  gap: var(--space-1);
}

.order-footer-note {
  margin: 0;
  margin-right: auto;
}

.access-note,
.settings-note {
  margin: 0;
}
</style>
