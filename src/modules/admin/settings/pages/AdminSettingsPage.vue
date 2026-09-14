<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { PhCalendarBlank, PhGearSix, PhShieldCheck, PhTrash } from "@phosphor-icons/vue";

import {
  BaseButton,
  BaseCard,
  BaseEmptyState,
  BaseErrorState,
  BaseInputNumber,
  BaseLoading,
  BasePageHeader,
  BaseSection,
  BaseSelect,
  BaseStatusPill,
  BaseTabs,
  BaseTextInput,
  BaseToggleSwitch,
} from "../../../../shared/components/base";
import type { BaseTabItem } from "../../../../shared/components/base";
import { useSettingsStore, useThemeStore } from "../../../../shared/stores";
import type { ApplicationSettings } from "../../../../types/settings";
import { t } from "../../../../i18n";
import { weekdayLabel } from "../../../../i18n/vocabulary";

const settingsStore = useSettingsStore();
const themeStore = useThemeStore();
const loadError = ref<string | null>(null);
const activeTab = ref("account");

// Change-password form. Never persisted with the rest of the settings — it maps to
// its own endpoint once the backend exposes one.
const passwordForm = reactive({ current: "", next: "", confirm: "" });
const passwordErrors = reactive<Partial<Record<keyof typeof passwordForm, string>>>({});
const passwordChanged = ref(false);

/* Computed, like every other option list: a constant freezes the language. */
const tabs = computed<BaseTabItem[]>(() => [
  { value: "account", label: t("admin.settings.tabAccount"), icon: PhShieldCheck },
  { value: "work-hours", label: t("admin.settings.tabWorkHours"), icon: PhCalendarBlank },
  { value: "system", label: t("admin.settings.tabSystem"), icon: PhGearSix },
]);

const themeOptions = computed(() => [
  { label: t("admin.settings.themeDark"), value: "dark" },
  { label: t("admin.settings.themeLight"), value: "light" },
  { label: t("admin.settings.themeSystem"), value: "system" },
]);

/*
 * The *institutional* locale stored in settings, which is a different thing from
 * the interface language a person picks for themselves — that one is in the
 * topbar and in each member's own settings. Kept as a stored preference because
 * it is what a future export or printed document would be produced in.
 */
const languageOptions = computed(() => [
  { label: t("admin.settings.localePtPt"), value: "pt-PT" },
  { label: t("admin.settings.localePtBr"), value: "pt-BR" },
  { label: t("admin.settings.localeEnUs"), value: "en-US" },
]);

const timezoneOptions = [
  { label: "Europe/Lisbon", value: "Europe/Lisbon" },
  { label: "America/Sao_Paulo", value: "America/Sao_Paulo" },
  { label: "America/New_York", value: "America/New_York" },
];

const sessionTimeoutOptions = computed(() => [
  { label: t("admin.settings.timeout15"), value: 15 },
  { label: t("admin.settings.timeout30"), value: 30 },
  { label: t("admin.settings.timeout60"), value: 60 },
  { label: t("admin.settings.timeout240"), value: 240 },
  { label: t("admin.settings.timeoutNever"), value: 0 },
]);

function createDefaultSettings(): ApplicationSettings {
  return {
    schoolName: "Pica Ponto EAT",
    logoUrl: "",
    theme: "light",
    language: "pt-PT",
    timezone: "Europe/Lisbon",
    attendance: {
      duplicateScanTimeoutMinutes: 5,
      workingDayStart: "08:00",
      workingDayEnd: "18:00",
      entryToleranceMinutes: 10,
      exitToleranceMinutes: 10,
    },
    devices: {
      otaEnabled: true,
      apiUrl: "https://api.local/pica-ponto",
      backupEnabled: true,
      backupPath: "C:/backups/pica-ponto",
    },
    security: {
      confirmNewDevices: true,
      sessionTimeoutMinutes: 60,
      twoFactorEnabled: false,
      trustedDevices: [],
    },
    workHours: {
      schedule: [
        { weekday: "monday", open: true, start: "08:30", end: "17:30" },
        { weekday: "tuesday", open: true, start: "08:30", end: "17:30" },
        { weekday: "wednesday", open: true, start: "08:30", end: "17:30" },
        { weekday: "thursday", open: true, start: "08:30", end: "17:30" },
        { weekday: "friday", open: true, start: "08:30", end: "16:00" },
        { weekday: "saturday", open: false, start: "09:00", end: "13:00" },
        { weekday: "sunday", open: false, start: "09:00", end: "13:00" },
      ],
      expectedWeeklyHours: 20,
      closedDates: [],
    },
    logRetentionDays: 180,
  };
}

const form = reactive<ApplicationSettings>(createDefaultSettings());

/**
 * Deep-copies the loaded settings into the form. Deliberately structural rather
 * than field-by-field: the previous version listed every key by hand, so any new
 * nested setting was silently dropped on load and on reset.
 */
function syncForm(nextValue: ApplicationSettings | null) {
  const defaults = createDefaultSettings();
  const source = nextValue ? (JSON.parse(JSON.stringify(nextValue)) as ApplicationSettings) : defaults;

  Object.assign(form, {
    ...defaults,
    ...source,
    attendance: { ...defaults.attendance, ...source.attendance },
    devices: { ...defaults.devices, ...source.devices },
    security: { ...defaults.security, ...source.security },
    workHours: { ...defaults.workHours, ...source.workHours },
  });
}

const openDays = computed(() => form.workHours.schedule.filter((day) => day.open));

/** Total scheduled hours per week, so the expected figure can be sanity-checked. */
const scheduledWeeklyHours = computed(() =>
  Number(
    openDays.value
      .reduce((total, day) => {
        const [startHour = 0, startMinute = 0] = day.start.split(":").map(Number);
        const [endHour = 0, endMinute = 0] = day.end.split(":").map(Number);
        const minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);
        return total + Math.max(minutes, 0) / 60;
      }, 0)
      .toFixed(1),
  ),
);

const newClosedDate = ref("");


function addClosedDate() {
  const value = newClosedDate.value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(value) && !form.workHours.closedDates.includes(value)) {
    form.workHours.closedDates = [...form.workHours.closedDates, value].sort();
    newClosedDate.value = "";
  }
}

function removeClosedDate(date: string) {
  form.workHours.closedDates = form.workHours.closedDates.filter((item) => item !== date);
}

function revokeDevice(deviceId: string) {
  form.security.trustedDevices = form.security.trustedDevices.filter((device) => device.id !== deviceId);
}

function validatePassword() {
  let valid = true;

  if (!passwordForm.current) {
    passwordErrors.current = t("errors.currentPasswordRequired");
    valid = false;
  } else {
    delete passwordErrors.current;
  }

  if (passwordForm.next.length < 8) {
    passwordErrors.next = t("errors.passwordTooShort");
    valid = false;
  } else {
    delete passwordErrors.next;
  }

  if (passwordForm.next !== passwordForm.confirm) {
    passwordErrors.confirm = t("errors.passwordsDiffer");
    valid = false;
  } else {
    delete passwordErrors.confirm;
  }

  return valid;
}

/** Rough strength hint — length plus character variety, no external dependency. */
const passwordStrength = computed(() => {
  const value = passwordForm.next;

  if (!value) {
    return null;
  }

  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^\w]/].filter((pattern) => pattern.test(value)).length;
  const score = (value.length >= 12 ? 2 : value.length >= 8 ? 1 : 0) + variety;

  if (score >= 5) return { label: t("admin.settings.strengthStrong"), tone: "success" as const };
  if (score >= 3) return { label: t("admin.settings.strengthReasonable"), tone: "warning" as const };
  return { label: t("admin.settings.strengthWeak"), tone: "danger" as const };
});

function changePassword() {
  passwordChanged.value = false;

  if (!validatePassword()) {
    return;
  }

  // Maps to POST /account/password once the backend exposes it.
  passwordForm.current = "";
  passwordForm.next = "";
  passwordForm.confirm = "";
  passwordChanged.value = true;
}

async function saveSettings() {
  await settingsStore.persistSettings(JSON.parse(JSON.stringify(form)) as ApplicationSettings);
  // Saving the institutional default also applies it here, so the choice is visible
  // immediately rather than only to the next person who signs in.
  themeStore.setMode(form.theme);
}

function resetSettings() {
  syncForm(settingsStore.value);
}

async function loadSettings() {
  loadError.value = null;

  try {
    await settingsStore.loadSettings();
    syncForm(settingsStore.value);
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : t("admin.settings.loadFailed");
  }
}

onMounted(async () => {
  await loadSettings();
});
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      :title="$t('admin.settings.title')"
      :description="$t('admin.settings.description')"
    >
      <template #actions>
        <BaseButton :label="$t('common.actions.refresh')" severity="secondary" outlined :loading="settingsStore.loading" @click="loadSettings" />
        <BaseButton :label="$t('admin.settings.reset')" severity="secondary" outlined :disabled="settingsStore.loading || settingsStore.saving" @click="resetSettings" />
        <BaseButton :label="$t('common.actions.saveChanges')" :loading="settingsStore.saving" :disabled="settingsStore.loading" @click="saveSettings" />
      </template>
    </BasePageHeader>

    <BaseErrorState
      v-if="settingsStore.errorMessage"
      :message="settingsStore.errorMessage"
      @retry="settingsStore.loadSettings()"
    />

    <BaseLoading v-if="settingsStore.loading" />

    <BaseEmptyState
      v-else-if="loadError"
      :title="$t('admin.settings.unavailable')"
      :description="loadError"
      :action-label="$t('common.actions.retry')"
      @action="loadSettings()"
    />

    <BaseTabs v-else v-model="activeTab" :tabs="tabs">
      <!-- ------------------------------------------- Account and security -->
      <template #account>
        <BaseSection :title="$t('admin.settings.accountTitle')" :description="$t('admin.settings.accountDescription')">
          <div class="dashboard-grid">
            <BaseCard :title="$t('admin.settings.passwordTitle')" :description="$t('admin.settings.passwordDescription')">
              <div class="settings-grid">
                <label class="settings-grid__wide">
                  <span>{{ $t("admin.settings.currentPassword") }}</span>
                  <BaseTextInput v-model="passwordForm.current" type="password" />
                  <small v-if="passwordErrors.current" class="student-form__error">{{ passwordErrors.current }}</small>
                </label>
                <label>
                  <span>{{ $t("admin.settings.newPassword") }}</span>
                  <BaseTextInput v-model="passwordForm.next" type="password" />
                  <small v-if="passwordErrors.next" class="student-form__error">{{ passwordErrors.next }}</small>
                </label>
                <label>
                  <span>{{ $t("admin.settings.confirmPassword") }}</span>
                  <BaseTextInput v-model="passwordForm.confirm" type="password" />
                  <small v-if="passwordErrors.confirm" class="student-form__error">{{ passwordErrors.confirm }}</small>
                </label>
              </div>

              <div class="settings-actions">
                <BaseStatusPill v-if="passwordStrength" :label="$t('admin.settings.strengthLabel', { level: passwordStrength.label })" :tone="passwordStrength.tone" />
                <BaseStatusPill v-if="passwordChanged" :label="$t('admin.settings.passwordUpdated')" tone="success" />
                <BaseButton :label="$t('admin.settings.updatePassword')" @click="changePassword" />
              </div>
            </BaseCard>

            <BaseCard :title="$t('admin.settings.protectionTitle')" :description="$t('admin.settings.protectionDescription')">
              <div class="settings-grid">
                <label>
                  <span>{{ $t("admin.settings.confirmDevices") }}</span>
                  <BaseToggleSwitch v-model="form.security.confirmNewDevices" />
                  <small class="student-form__hint">{{ $t("admin.settings.confirmDevicesHint") }}</small>
                </label>
                <label>
                  <span>{{ $t("admin.settings.twoFactor") }}</span>
                  <BaseToggleSwitch v-model="form.security.twoFactorEnabled" />
                  <small class="student-form__hint">{{ $t("admin.settings.twoFactorHint") }}</small>
                </label>
                <label class="settings-grid__wide">
                  <span>{{ $t("admin.settings.signOutAfter") }}</span>
                  <BaseSelect v-model="form.security.sessionTimeoutMinutes" :options="sessionTimeoutOptions" />
                </label>
              </div>
            </BaseCard>
          </div>

          <BaseCard :title="$t('admin.settings.trustedTitle')" :description="$t('admin.settings.trustedDescription')">
            <BaseEmptyState
              v-if="form.security.trustedDevices.length === 0"
              :title="$t('admin.settings.trustedEmptyTitle')"
              :description="$t('admin.settings.trustedEmptyDescription')"
            />
            <article v-for="device in form.security.trustedDevices" :key="device.id" class="list-row">
              <div>
                <strong>{{ device.name }}</strong>
                <p>{{ $t("admin.settings.lastUsed", { date: device.lastUsedAt.slice(0, 10) }) }}</p>
              </div>
              <div class="inline-actions">
                <BaseStatusPill v-if="device.current" :label="$t('admin.settings.thisDevice')" tone="info" />
                <BaseButton :label="$t('admin.settings.revoke')" text size="small" severity="danger" :disabled="device.current" @click="revokeDevice(device.id)" />
              </div>
            </article>
          </BaseCard>
        </BaseSection>
      </template>

      <!-- ----------------------------------------------------- Work hours -->
      <template #work-hours>
        <BaseSection
          :title="$t('admin.settings.hoursTitle')"
          :description="$t('admin.settings.hoursDescription')"
        >
          <BaseCard :title="$t('admin.settings.scheduleTitle')" :description="$t('admin.settings.scheduleDescription')">
            <div class="week-schedule">
              <article v-for="day in form.workHours.schedule" :key="day.weekday" class="week-schedule__row">
                <div class="week-schedule__day">
                  <BaseToggleSwitch v-model="day.open" />
                  <span>{{ weekdayLabel(day.weekday) }}</span>
                </div>
                <div class="week-schedule__times">
                  <BaseTextInput v-model="day.start" placeholder="08:30" :disabled="!day.open" />
                  <span class="week-schedule__separator">to</span>
                  <BaseTextInput v-model="day.end" placeholder="17:30" :disabled="!day.open" />
                </div>
                <BaseStatusPill v-if="!day.open" :label="$t('admin.settings.closed')" tone="warning" />
              </article>
            </div>
          </BaseCard>

          <div class="dashboard-grid">
            <BaseCard :title="$t('admin.settings.expectedTitle')" :description="$t('admin.settings.expectedDescription')">
              <div class="settings-grid">
                <label>
                  <span>{{ $t("admin.settings.expectedWeekly") }}</span>
                  <BaseInputNumber v-model="form.workHours.expectedWeeklyHours" :min="0" :max="60" />
                </label>
                <label>
                  <span>{{ $t("admin.settings.scheduledOpen") }}</span>
                  <BaseStatusPill
                    :label="
                      $t('admin.settings.weeklySpread', {
                        hours: scheduledWeeklyHours,
                        days: openDays.length,
                      })
                    "
                    :tone="scheduledWeeklyHours >= form.workHours.expectedWeeklyHours ? 'success' : 'warning'"
                  />
                  <small class="student-form__hint">
                    {{ $t("admin.settings.openHoursHint", { hours: scheduledWeeklyHours }) }}
                  </small>
                </label>
              </div>
            </BaseCard>

            <BaseCard :title="$t('admin.settings.closedDaysTitle')" :description="$t('admin.settings.closedDaysDescription')">
              <div class="filter-strip">
                <BaseTextInput v-model="newClosedDate" placeholder="YYYY-MM-DD" />
                <BaseButton :label="$t('common.actions.add')" severity="secondary" outlined @click="addClosedDate" />
              </div>

              <BaseEmptyState
                v-if="form.workHours.closedDates.length === 0"
                :title="$t('admin.settings.closedDaysEmptyTitle')"
                :description="$t('admin.settings.closedDaysEmptyDescription')"
              />
              <div v-else class="closed-dates">
                <span v-for="date in form.workHours.closedDates" :key="date" class="closed-dates__chip">
                  {{ date }}
                  <button type="button" :aria-label="$t('admin.settings.removeClosedDay')" @click="removeClosedDate(date)">
                    <PhTrash weight="bold" />
                  </button>
                </span>
              </div>
            </BaseCard>
          </div>
        </BaseSection>
      </template>

      <!-- --------------------------------------------------------- System -->
      <template #system>
        <BaseSection :title="$t('admin.settings.systemTitle')" :description="$t('admin.settings.systemDescription')">
          <div class="dashboard-grid">
            <BaseCard :title="$t('admin.settings.identityTitle')" :description="$t('admin.settings.identityDescription')">
              <div class="settings-grid">
                <label>
                  <span>{{ $t("admin.settings.schoolName") }}</span>
                  <BaseTextInput v-model="form.schoolName" />
                </label>
                <label>
                  <span>{{ $t("admin.settings.logoUrl") }}</span>
                  <BaseTextInput v-model="form.logoUrl" placeholder="https://..." />
                </label>
                <label>
                  <span>{{ $t("admin.settings.theme") }}</span>
                  <BaseSelect v-model="form.theme" :options="themeOptions" />
                </label>
                <label>
                  <span>{{ $t("common.language.label") }}</span>
                  <BaseSelect v-model="form.language" :options="languageOptions" />
                </label>
                <label>
                  <span>{{ $t("admin.settings.timezone") }}</span>
                  <BaseSelect v-model="form.timezone" :options="timezoneOptions" />
                </label>
                <label>
                  <span>{{ $t("admin.settings.logRetention") }}</span>
                  <BaseInputNumber v-model="form.logRetentionDays" :min="30" :max="3650" />
                </label>
              </div>
            </BaseCard>

            <BaseCard :title="$t('admin.settings.rulesTitle')" :description="$t('admin.settings.rulesDescription')">
              <div class="settings-grid">
                <label>
                  <span>{{ $t("admin.settings.duplicateTimeout") }}</span>
                  <BaseInputNumber v-model="form.attendance.duplicateScanTimeoutMinutes" :min="1" :max="60" />
                </label>
                <label>
                  <span>{{ $t("admin.settings.entryTolerance") }}</span>
                  <BaseInputNumber v-model="form.attendance.entryToleranceMinutes" :min="0" :max="120" />
                </label>
                <label>
                  <span>{{ $t("admin.settings.exitTolerance") }}</span>
                  <BaseInputNumber v-model="form.attendance.exitToleranceMinutes" :min="0" :max="120" />
                </label>
                <label class="settings-grid__wide">
                  <span>{{ $t("admin.settings.workingDay") }}</span>
                  <BaseStatusPill :label="
                    $t('admin.settings.workingWindow', {
                      start: form.attendance.workingDayStart,
                      end: form.attendance.workingDayEnd,
                    })
                  " tone="info" />
                  <small class="student-form__hint">{{ $t("admin.settings.scheduleSourceNote") }}</small>
                </label>
              </div>
            </BaseCard>

            <BaseCard :title="$t('admin.settings.integrationTitle')" :description="$t('admin.settings.integrationDescription')">
              <div class="settings-grid">
                <label>
                  <span>{{ $t("admin.settings.otaEnabled") }}</span>
                  <BaseToggleSwitch v-model="form.devices.otaEnabled" />
                </label>
                <label>
                  <span>{{ $t("admin.settings.apiUrl") }}</span>
                  <BaseTextInput v-model="form.devices.apiUrl" />
                </label>
                <label>
                  <span>{{ $t("admin.settings.backupEnabled") }}</span>
                  <BaseToggleSwitch v-model="form.devices.backupEnabled" />
                </label>
                <label>
                  <span>{{ $t("admin.settings.backupPath") }}</span>
                  <BaseTextInput v-model="form.devices.backupPath" />
                </label>
              </div>
            </BaseCard>
          </div>
        </BaseSection>
      </template>
    </BaseTabs>
  </section>
</template>

<style scoped>
.settings-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 16px;
}

.settings-checklist {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.settings-checklist__row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 4px;
  color: var(--foreground-secondary);
  font-size: 0.9rem;
}

.settings-checklist__row:not(:last-child) {
  border-bottom: var(--border-width) solid var(--border-subtle);
}

.week-schedule {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.week-schedule__row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 10px 4px;
}

.week-schedule__row:not(:last-child) {
  border-bottom: var(--border-width) solid var(--border-subtle);
}

.week-schedule__day {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 160px;
  color: var(--foreground);
  font-size: 0.9rem;
}

.week-schedule__times {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 240px;
}

.week-schedule__separator {
  color: var(--foreground-muted);
  font-size: 0.82rem;
}

.closed-dates {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.closed-dates__chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px 5px 12px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface-subtle);
  color: var(--foreground-secondary);
  font-size: 0.82rem;
}

.closed-dates__chip button {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--foreground-muted);
}

.closed-dates__chip button:hover {
  color: var(--danger);
  background: var(--danger-subtle);
}

.closed-dates__chip svg {
  width: 12px;
  height: 12px;
}
</style>
