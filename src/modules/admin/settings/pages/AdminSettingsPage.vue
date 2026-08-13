<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { PhBellRinging, PhCalendarBlank, PhGearSix, PhShieldCheck, PhTrash } from "@phosphor-icons/vue";

import {
  BaseButton,
  BaseCard,
  BaseCheckbox,
  BaseEmptyState,
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
import { useSettingsStore } from "../../../../shared/stores";
import { NOTIFICATION_EVENT_LABELS, WEEKDAY_LABELS } from "../../../../types/settings";
import type { ApplicationSettings, NotificationEvent } from "../../../../types/settings";

const settingsStore = useSettingsStore();
const loadError = ref<string | null>(null);
const activeTab = ref("account");

// Change-password form. Never persisted with the rest of the settings — it maps to
// its own endpoint once the backend exposes one.
const passwordForm = reactive({ current: "", next: "", confirm: "" });
const passwordErrors = reactive<Partial<Record<keyof typeof passwordForm, string>>>({});
const passwordChanged = ref(false);

const tabs: BaseTabItem[] = [
  { value: "account", label: "Account & security", icon: PhShieldCheck },
  { value: "notifications", label: "Notifications", icon: PhBellRinging },
  { value: "work-hours", label: "Work hours", icon: PhCalendarBlank },
  { value: "system", label: "System", icon: PhGearSix },
];

const themeOptions = [
  { label: "Dark", value: "dark" },
  { label: "Light", value: "light" },
  { label: "System", value: "system" },
];

const languageOptions = [
  { label: "Portuguese (Portugal)", value: "pt-PT" },
  { label: "Portuguese (Brazil)", value: "pt-BR" },
  { label: "English (US)", value: "en-US" },
];

const timezoneOptions = [
  { label: "Europe/Lisbon", value: "Europe/Lisbon" },
  { label: "America/Sao_Paulo", value: "America/Sao_Paulo" },
  { label: "America/New_York", value: "America/New_York" },
];

const sessionTimeoutOptions = [
  { label: "15 minutes", value: 15 },
  { label: "30 minutes", value: 30 },
  { label: "1 hour", value: 60 },
  { label: "4 hours", value: 240 },
  { label: "Never", value: 0 },
];

function createDefaultSettings(): ApplicationSettings {
  return {
    schoolName: "Pica Ponto EAT",
    logoUrl: "",
    theme: "dark",
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
    notifications: {
      emailEnabled: true,
      desktopEnabled: true,
      recipients: "admin@school.local",
      events: ["pending-corrections", "device-offline"],
      quietHoursEnabled: true,
      quietHoursStart: "19:00",
      quietHoursEnd: "08:00",
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
    notifications: { ...defaults.notifications, ...source.notifications },
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

function toggleEvent(event: NotificationEvent, enabled: boolean) {
  const events = new Set(form.notifications.events);
  if (enabled) {
    events.add(event);
  } else {
    events.delete(event);
  }
  form.notifications.events = [...events];
}

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
    passwordErrors.current = "Enter your current password.";
    valid = false;
  } else {
    delete passwordErrors.current;
  }

  if (passwordForm.next.length < 8) {
    passwordErrors.next = "Use at least 8 characters.";
    valid = false;
  } else {
    delete passwordErrors.next;
  }

  if (passwordForm.next !== passwordForm.confirm) {
    passwordErrors.confirm = "The two passwords do not match.";
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

  if (score >= 5) return { label: "Strong", tone: "success" as const };
  if (score >= 3) return { label: "Reasonable", tone: "warning" as const };
  return { label: "Weak", tone: "danger" as const };
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
    loadError.value = error instanceof Error ? error.message : "Unable to load settings.";
  }
}

onMounted(async () => {
  await loadSettings();
});
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      title="Settings"
      description="Your account, how you are notified, when the club operates, and the system configuration behind it."
    >
      <template #actions>
        <BaseButton label="Refresh" severity="secondary" outlined :loading="settingsStore.loading" @click="loadSettings" />
        <BaseButton label="Reset" severity="secondary" outlined :disabled="settingsStore.loading || settingsStore.saving" @click="resetSettings" />
        <BaseButton label="Save changes" :loading="settingsStore.saving" :disabled="settingsStore.loading" @click="saveSettings" />
      </template>
    </BasePageHeader>

    <BaseLoading v-if="settingsStore.loading" />

    <BaseEmptyState
      v-else-if="loadError"
      title="Settings unavailable"
      :description="loadError"
      action-label="Retry"
      @action="loadSettings()"
    />

    <BaseTabs v-else v-model="activeTab" :tabs="tabs">
      <!-- ------------------------------------------- Account and security -->
      <template #account>
        <BaseSection title="Account and security" description="Your password, sessions and the devices allowed to authorise this account.">
          <div class="dashboard-grid">
            <BaseCard title="Change password" description="Used the next time you sign in.">
              <div class="settings-grid">
                <label class="settings-grid__wide">
                  <span>Current password</span>
                  <BaseTextInput v-model="passwordForm.current" type="password" />
                  <small v-if="passwordErrors.current" class="student-form__error">{{ passwordErrors.current }}</small>
                </label>
                <label>
                  <span>New password</span>
                  <BaseTextInput v-model="passwordForm.next" type="password" />
                  <small v-if="passwordErrors.next" class="student-form__error">{{ passwordErrors.next }}</small>
                </label>
                <label>
                  <span>Confirm new password</span>
                  <BaseTextInput v-model="passwordForm.confirm" type="password" />
                  <small v-if="passwordErrors.confirm" class="student-form__error">{{ passwordErrors.confirm }}</small>
                </label>
              </div>

              <div class="settings-actions">
                <BaseStatusPill v-if="passwordStrength" :label="`Strength: ${passwordStrength.label}`" :tone="passwordStrength.tone" />
                <BaseStatusPill v-if="passwordChanged" label="Password updated" tone="success" />
                <BaseButton label="Update password" @click="changePassword" />
              </div>
            </BaseCard>

            <BaseCard title="Sign-in protection" description="How sessions and unfamiliar devices are handled.">
              <div class="settings-grid">
                <label>
                  <span>Confirm new devices</span>
                  <BaseToggleSwitch v-model="form.security.confirmNewDevices" />
                  <small class="student-form__hint">Ask for confirmation the first time this account signs in somewhere new.</small>
                </label>
                <label>
                  <span>Two-factor authentication</span>
                  <BaseToggleSwitch v-model="form.security.twoFactorEnabled" />
                  <small class="student-form__hint">Require a second factor in addition to the password.</small>
                </label>
                <label class="settings-grid__wide">
                  <span>Sign out after inactivity</span>
                  <BaseSelect v-model="form.security.sessionTimeoutMinutes" :options="sessionTimeoutOptions" />
                </label>
              </div>
            </BaseCard>
          </div>

          <BaseCard title="Trusted devices" description="Devices that may authorise this account without re-confirmation.">
            <BaseEmptyState
              v-if="form.security.trustedDevices.length === 0"
              title="No trusted devices"
              description="Devices appear here after you confirm a sign-in from them."
            />
            <article v-for="device in form.security.trustedDevices" :key="device.id" class="list-row">
              <div>
                <strong>{{ device.name }}</strong>
                <p>Last used {{ device.lastUsedAt.slice(0, 10) }}</p>
              </div>
              <div class="inline-actions">
                <BaseStatusPill v-if="device.current" label="This device" tone="info" />
                <BaseButton label="Revoke" text size="small" severity="danger" :disabled="device.current" @click="revokeDevice(device.id)" />
              </div>
            </article>
          </BaseCard>
        </BaseSection>
      </template>

      <!-- -------------------------------------------------- Notifications -->
      <template #notifications>
        <BaseSection title="Notifications" description="What reaches you, through which channel, and when it is allowed to.">
          <div class="dashboard-grid">
            <BaseCard title="Notify me about" description="An event not selected here never produces a notification.">
              <div class="settings-checklist">
                <label v-for="(label, event) in NOTIFICATION_EVENT_LABELS" :key="event" class="settings-checklist__row">
                  <BaseCheckbox
                    :model-value="form.notifications.events.includes(event as NotificationEvent)"
                    @update:model-value="toggleEvent(event as NotificationEvent, $event)"
                  />
                  <span>{{ label }}</span>
                </label>
              </div>
            </BaseCard>

            <BaseCard title="Channels and quiet hours" description="Where notifications go, and when they are held back.">
              <div class="settings-grid">
                <label>
                  <span>Desktop notifications</span>
                  <BaseToggleSwitch v-model="form.notifications.desktopEnabled" />
                </label>
                <label>
                  <span>Email notifications</span>
                  <BaseToggleSwitch v-model="form.notifications.emailEnabled" />
                </label>
                <label class="settings-grid__wide">
                  <span>Email recipients</span>
                  <BaseTextInput v-model="form.notifications.recipients" placeholder="admin@school.local" />
                </label>
                <label class="settings-grid__wide">
                  <span>Quiet hours</span>
                  <BaseToggleSwitch v-model="form.notifications.quietHoursEnabled" />
                  <small class="student-form__hint">Hold notifications outside the club's work hours instead of delivering them.</small>
                </label>
                <label>
                  <span>Quiet from</span>
                  <BaseTextInput v-model="form.notifications.quietHoursStart" placeholder="19:00" :disabled="!form.notifications.quietHoursEnabled" />
                </label>
                <label>
                  <span>Quiet until</span>
                  <BaseTextInput v-model="form.notifications.quietHoursEnd" placeholder="08:00" :disabled="!form.notifications.quietHoursEnabled" />
                </label>
              </div>
            </BaseCard>
          </div>
        </BaseSection>
      </template>

      <!-- ----------------------------------------------------- Work hours -->
      <template #work-hours>
        <BaseSection
          title="Work hours"
          description="When Equipa Técnica is open. This is what attendance is measured against and what quiet hours follow."
        >
          <BaseCard title="Weekly schedule" description="Toggle a day off to mark the club closed.">
            <div class="week-schedule">
              <article v-for="day in form.workHours.schedule" :key="day.weekday" class="week-schedule__row">
                <div class="week-schedule__day">
                  <BaseToggleSwitch v-model="day.open" />
                  <span>{{ WEEKDAY_LABELS[day.weekday] }}</span>
                </div>
                <div class="week-schedule__times">
                  <BaseTextInput v-model="day.start" placeholder="08:30" :disabled="!day.open" />
                  <span class="week-schedule__separator">to</span>
                  <BaseTextInput v-model="day.end" placeholder="17:30" :disabled="!day.open" />
                </div>
                <BaseStatusPill v-if="!day.open" label="Closed" tone="warning" />
              </article>
            </div>
          </BaseCard>

          <div class="dashboard-grid">
            <BaseCard title="Expected hours" description="Used to flag members who are falling behind.">
              <div class="settings-grid">
                <label>
                  <span>Expected weekly hours</span>
                  <BaseInputNumber v-model="form.workHours.expectedWeeklyHours" :min="0" :max="60" />
                </label>
                <label>
                  <span>Scheduled open hours</span>
                  <BaseStatusPill
                    :label="`${scheduledWeeklyHours}h across ${openDays.length} days`"
                    :tone="scheduledWeeklyHours >= form.workHours.expectedWeeklyHours ? 'success' : 'warning'"
                  />
                  <small class="student-form__hint">
                    The club is open for {{ scheduledWeeklyHours }}h a week, so an expectation above that cannot be met.
                  </small>
                </label>
              </div>
            </BaseCard>

            <BaseCard title="Closed days" description="Holidays and breaks excluded from attendance expectations.">
              <div class="filter-strip">
                <BaseTextInput v-model="newClosedDate" placeholder="YYYY-MM-DD" />
                <BaseButton label="Add" severity="secondary" outlined @click="addClosedDate" />
              </div>

              <BaseEmptyState
                v-if="form.workHours.closedDates.length === 0"
                title="No closed days"
                description="Add the holidays and breaks the club is shut for."
              />
              <div v-else class="closed-dates">
                <span v-for="date in form.workHours.closedDates" :key="date" class="closed-dates__chip">
                  {{ date }}
                  <button type="button" aria-label="Remove closed day" @click="removeClosedDate(date)">
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
        <BaseSection title="System" description="Workspace-wide configuration. Changes here affect every user.">
          <div class="dashboard-grid">
            <BaseCard title="School identity" description="Branding and localization for the desktop shell.">
              <div class="settings-grid">
                <label>
                  <span>School name</span>
                  <BaseTextInput v-model="form.schoolName" />
                </label>
                <label>
                  <span>Logo URL</span>
                  <BaseTextInput v-model="form.logoUrl" placeholder="https://..." />
                </label>
                <label>
                  <span>Theme</span>
                  <BaseSelect v-model="form.theme" :options="themeOptions" />
                </label>
                <label>
                  <span>Language</span>
                  <BaseSelect v-model="form.language" :options="languageOptions" />
                </label>
                <label>
                  <span>Timezone</span>
                  <BaseSelect v-model="form.timezone" :options="timezoneOptions" />
                </label>
                <label>
                  <span>Log retention days</span>
                  <BaseInputNumber v-model="form.logRetentionDays" :min="30" :max="3650" />
                </label>
              </div>
            </BaseCard>

            <BaseCard title="Attendance rules" description="Validation windows for scans.">
              <div class="settings-grid">
                <label>
                  <span>Duplicate scan timeout</span>
                  <BaseInputNumber v-model="form.attendance.duplicateScanTimeoutMinutes" :min="1" :max="60" />
                </label>
                <label>
                  <span>Entry tolerance minutes</span>
                  <BaseInputNumber v-model="form.attendance.entryToleranceMinutes" :min="0" :max="120" />
                </label>
                <label>
                  <span>Exit tolerance minutes</span>
                  <BaseInputNumber v-model="form.attendance.exitToleranceMinutes" :min="0" :max="120" />
                </label>
                <label class="settings-grid__wide">
                  <span>Working day</span>
                  <BaseStatusPill :label="`${form.attendance.workingDayStart} – ${form.attendance.workingDayEnd}`" tone="info" />
                  <small class="student-form__hint">The per-weekday schedule on the Work hours tab is the source of truth.</small>
                </label>
              </div>
            </BaseCard>

            <BaseCard title="Device integration" description="Tauri, REST and backup configuration.">
              <div class="settings-grid">
                <label>
                  <span>OTA enabled</span>
                  <BaseToggleSwitch v-model="form.devices.otaEnabled" />
                </label>
                <label>
                  <span>API URL</span>
                  <BaseTextInput v-model="form.devices.apiUrl" />
                </label>
                <label>
                  <span>Backup enabled</span>
                  <BaseToggleSwitch v-model="form.devices.backupEnabled" />
                </label>
                <label>
                  <span>Backup path</span>
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
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.settings-checklist__row:not(:last-child) {
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
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
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
}

.week-schedule__day {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 160px;
  color: var(--text-primary);
  font-size: 0.9rem;
}

.week-schedule__times {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 240px;
}

.week-schedule__separator {
  color: var(--text-muted);
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
  border: 1px solid var(--surface-border);
  background: var(--surface-soft);
  color: var(--text-secondary);
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
  color: var(--text-muted);
}

.closed-dates__chip button:hover {
  color: var(--danger);
  background: rgba(244, 111, 111, 0.16);
}

.closed-dates__chip svg {
  width: 12px;
  height: 12px;
}
</style>
